import { useState, useCallback, useEffect } from "react";
import { View, Text, Button, StyleSheet, Switch, Alert } from "react-native";
import {
  doc,
  getDoc,
  query,
  where,
  getDocs,
  collection,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { auth, db } from "../../config/firebase";
import { HomeStackParamList } from "../../navigation/types";
import * as Location from "expo-location";
import { getDatabase, ref, set } from "firebase/database";
import { useAuthState } from "../../hooks/useAuthState";

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const [username, setUsername] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isWalking, setIsWalking] = useState(false);
  const [userDog, setUserDog] = useState<{
    id: string;
    dogname: string;
  } | null>(null);

  // お散歩状態を切り替える関数
  const toggleWalkingStatus = async () => {
    if (!userDog) return;

    try {
      // 位置情報の許可を確認
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "位置情報が必要です",
          "お散歩モードを使用するには位置情報へのアクセスを許可してください。"
        );
        return;
      }

      // 現在の位置情報を取得
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const dogDocRef = doc(db, "dogs", userDog.id);
      await updateDoc(dogDocRef, {
        isWalking: !isWalking,
        lastWalkingStatusUpdate: new Date(),
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      // Realtime Databaseにも位置情報を保存
      const rtdb = getDatabase();
      const dogLocationRef = ref(rtdb, `locations/dogs/${userDog.id}`);
      await set(dogLocationRef, {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        lastUpdated: new Date().toISOString(),
        isWalking: !isWalking,
      });

      setIsWalking(!isWalking);
    } catch (error) {
      console.error("お散歩状態の更新エラー:", error);
      Alert.alert(
        "エラー",
        "お散歩状態の更新中にエラーが発生しました。もう一度お試しください。"
      );
    }
  };

  // ユーザーデータを取得する関数
  const fetchUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("fetchUserData: ユーザーが見つかりません");
        setLoading(false);
        return;
      }
      
      console.log(`fetchUserData: ユーザーID ${currentUser.uid} のデータを取得します`);

      // リアルタイムリスナーを使用してユーザー情報を取得
      const userDocRef = doc(db, "users", currentUser.uid);
      return onSnapshot(userDocRef, (userDoc) => {
        if (userDoc.exists()) {
          // ドキュメントが存在する場合、ユーザー名を取得
          const userData = userDoc.data();
          console.log(`ユーザーデータを取得: ${userData.name}`);
          setUsername(userData.name);
          setIsOwner(userData.isOwner);

          // ユーザーが犬の飼い主の場合、犬の情報を取得
          if (userData.isOwner) {
            // ユーザーIDに一致する犬を検索
            const fetchDogData = async () => {
              try {
                // まずuserIDで検索
                const dogsQuery = query(
                  collection(db, "dogs"),
                  where("userID", "==", currentUser.uid)
                );

                const dogsSnapshot = await getDocs(dogsQuery);

                if (!dogsSnapshot.empty) {
                  // 犬のドキュメントが見つかった場合
                  const dogDoc = dogsSnapshot.docs[0];
                  const dogData = dogDoc.data();
                  console.log(`犬のデータを取得: ${dogData.dogname}`);

                  setUserDog({
                    id: dogDoc.id,
                    dogname: dogData.dogname,
                  });
                  // お散歩状態を設定
                  setIsWalking(dogData.isWalking || false);
                } else {
                  // 犬が見つからなかった場合、userIDではなくownerIDで再試行
                  const altDogsQuery = query(
                    collection(db, "dogs"),
                    where("ownerID", "==", currentUser.uid)
                  );

                  const altDogsSnapshot = await getDocs(altDogsQuery);

                  if (!altDogsSnapshot.empty) {
                    const dogDoc = altDogsSnapshot.docs[0];
                    const dogData = dogDoc.data();
                    console.log(`犬のデータを取得(ownerID): ${dogData.dogname}`);

                    setUserDog({
                      id: dogDoc.id,
                      dogname: dogData.dogname,
                    });
                    // お散歩状態を設定
                    setIsWalking(dogData.isWalking || false);
                  }
                }
              } catch (error) {
                console.error("犬のデータ取得エラー:", error);
              }
            };
            
            fetchDogData();
          }
        } else {
          console.log("ユーザードキュメントが存在しません");
        }
        
        setLoading(false);
      }, (error) => {
        console.error("ユーザー情報のリスナーエラー:", error);
        setLoading(false);
      });
    } catch (error) {
      console.error("ユーザー情報の取得エラー:", error);
      setLoading(false);
      return null;
    }
  };

  // 認証状態が変わった時にデータを取得
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    if (isAuthenticated && user) {
      console.log(`認証済みユーザー: ${user.uid} のデータを取得します`);
      // 認証済みの場合のみデータ取得を実行
      const fetchData = async () => {
        const unsub = await fetchUserData();
        if (typeof unsub === 'function') {
          unsubscribe = unsub;
        }
      };
      
      fetchData();
    } else {
      console.log("認証されていないか、ユーザーデータがありません");
      setLoading(false);
    }
    
    // クリーンアップ関数
    return () => {
      if (unsubscribe) {
        console.log("ユーザーデータリスナーをクリーンアップします");
        unsubscribe();
      }
    };
  }, [isAuthenticated, user]);

  // 画面がフォーカスされた時の処理
  useFocusEffect(
    useCallback(() => {
      console.log("画面がフォーカスされました");
      // すでにデータがある場合は再取得しない
      if (!username && isAuthenticated && user) {
        console.log("フォーカス時: ユーザーデータの再取得を試みます");
        fetchUserData();
      }
      
      return () => {
        console.log("画面のフォーカスが外れました");
      };
    }, [isAuthenticated, user, username])
  );

  if (loading || authLoading) {
    return (
      <View style={styles.container}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>
        ようこそ、{username ? username : ""}さん！
      </Text>

      <Button
        title="わんちゃんを探す"
        onPress={() => navigation.navigate("Search")}
      />

      {/* isOwnerがfalseの場合のみ犬登録ボタンを表示 */}
      {!isOwner && (
        <View style={styles.buttonContainer}>
          <Button
            title="わんちゃんを登録する"
            onPress={() => navigation.navigate("RegisterDog")}
          />
        </View>
      )}

      {/* 以下はわんちゃんを登録済みの場合のみ表示させる */}
      {isOwner && userDog && (
        <View style={styles.walkingContainer}>
          <View style={styles.walkingStatusContainer}>
            <Text style={styles.walkingText}>
              {userDog.dogname}は{isWalking ? "お散歩中" : "お家で待機中"}
            </Text>
            <Switch
              value={isWalking}
              onValueChange={toggleWalkingStatus}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={isWalking ? "#f5dd4b" : "#f4f3f4"}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 24,
    marginBottom: 30,
  },
  buttonContainer: {
    width: "80%",
    marginBottom: 15,
  },
  walkingContainer: {
    width: "80%",
    marginTop: 20,
  },
  walkingStatusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
  },
  walkingText: {
    fontSize: 16,
    marginRight: 10,
  },
});
