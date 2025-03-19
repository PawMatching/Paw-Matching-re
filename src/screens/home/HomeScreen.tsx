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

  // タイマー関連の状態を追加
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const walkingTimeLimit = 60; // お散歩時間の制限（分）

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

      const now = new Date();
      const dogDocRef = doc(db, "dogs", userDog.id);

      if (!isWalking) {
        // お散歩開始の場合
        await updateDoc(dogDocRef, {
          isWalking: true,
          lastWalkingStatusUpdate: now,
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

        setIsWalking(true);
        setRemainingTime(walkingTimeLimit); //残り時間をセット
        startWalkingTimer();
      } else {
        // お散歩終了の場合
        await updateDoc(dogDocRef, {
          isWalking: false,
          lastWalkingStatusUpdate: now,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        // Realtime Databaseも更新
        const rtdb = getDatabase();
        const dogLocationRef = ref(rtdb, `locations/dogs/${userDog.id}`);
        await set(dogLocationRef, {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          lastUpdated: now.toISOString(),
          isWalking: false,
        });

        setIsWalking(false);
        setRemainingTime(null);
        stopWalkingTimer();
      }
    } catch (error) {
      console.error("お散歩状態の更新エラー:", error);
      Alert.alert(
        "エラー",
        "お散歩状態の更新中にエラーが発生しました。もう一度お試しください。"
      );
    }
  };

  // タイマーを開始する関数
  const startWalkingTimer = () => {
    // 既存のタイマーがあれば停止
    if (timer) {
      clearInterval(timer);
    }

    // 10秒ごとにカウントダウン（より頻繁に更新するため、アプリがバックグラウンドから戻ったときもすぐに反映）
    const newTimer = setInterval(() => {
      updateRemainingTime();
    }, 30000); // 30秒ごとに更新（1分に変更しても）

    setTimer(newTimer);
  };

  // 残り時間を更新する関数
  const stopWalkingTimer = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
    setRemainingTime(null);
  };

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [timer]);

  // 残り時間を更新する関数
  const updateRemainingTime = async () => {
    try {
      if (!userDog) return;

      const dogDocRef = doc(db, "dogs", userDog.id);
      const dogDoc = await getDoc(dogDocRef);

      if (dogDoc.exists()) {
        const dogData = dogDoc.data();
        if (dogData.lastWalkingStatusUpdate && dogData.isWalking) {
          // FirestoreのタイムスタンプをDateオブジェクトに変換
          const lastUpdate = dogData.lastWalkingStatusUpdate.toDate
            ? dogData.lastWalkingStatusUpdate.toDate()
            : new Date(dogData.lastWalkingStatusUpdate);

          // 残り時間を計算（散歩開始からの経過時間をもとに）
          const elapsedMinutes = Math.floor(
            (new Date().getTime() - lastUpdate.getTime()) / 60000
          );
          const remaining = Math.max(0, walkingTimeLimit - elapsedMinutes);

          console.log(
            `残り時間更新: ${remaining}分（経過: ${elapsedMinutes}分）`
          );

          setRemainingTime(remaining);

          // 残り時間が0になったら散歩を終了（オプション）
          if (remaining <= 0 && isWalking) {
            // ここに自動終了処理を追加することもできます
            // あえてサーバーサイドの処理に任せる場合はここでの更新は不要
          }
        }
      }
    } catch (error) {
      console.error("残り時間の更新エラー:", error);
    }
  };

  // お散歩状態変更時と画面がフォーカスされた時に残り時間を更新
  useEffect(() => {
    if (isWalking) {
      updateRemainingTime();
      startWalkingTimer();
    } else {
      stopWalkingTimer();
      setRemainingTime(null);
    }

    return () => {
      stopWalkingTimer();
    };
  }, [isWalking, userDog]);

  // 画面がフォーカスされたときに残り時間を更新
  useFocusEffect(
    useCallback(() => {
      if (isWalking) {
        console.log("画面フォーカス時: 残り時間を更新します");
        updateRemainingTime();
      }

      return () => {
        // クリーンアップは不要
      };
    }, [isWalking, userDog])
  );

  // ユーザーデータを取得する関数
  const fetchUserData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      setUsername(userData.name);
      setIsOwner(userData.isOwner);

      if (userData.isOwner) {
        const dogsQuery = query(
          collection(db, "dogs"),
          where("userID", "==", user.uid)
        );

        const dogsSnapshot = await getDocs(dogsQuery);

        if (!dogsSnapshot.empty) {
          const dogDoc = dogsSnapshot.docs[0];
          const dogData = dogDoc.data();
          setUserDog({
            id: dogDoc.id,
            dogname: dogData.dogname,
          });
          setIsWalking(dogData.isWalking || false);
        } else {
          const altDogsQuery = query(
            collection(db, "dogs"),
            where("ownerID", "==", user.uid)
          );

          const altDogsSnapshot = await getDocs(altDogsQuery);

          if (!altDogsSnapshot.empty) {
            const dogDoc = altDogsSnapshot.docs[0];
            const dogData = dogDoc.data();
            setUserDog({
              id: dogDoc.id,
              dogname: dogData.dogname,
            });
            setIsWalking(dogData.isWalking || false);
          }
        }
      }
    } catch (error) {
      console.error("ユーザーデータの取得に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  // 認証状態が変わった時にデータを取得
  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

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
            <View>
              <Text style={styles.walkingText}>
                {userDog.dogname}
                {isWalking ? "とお散歩中" : "はお留守番中"}
              </Text>
              {isWalking && remainingTime !== null && (
                <Text style={styles.timerText}>
                  自動終了まで: 約{remainingTime}分
                </Text>
              )}
            </View>
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
  timerText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
});
