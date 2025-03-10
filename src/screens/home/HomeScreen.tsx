import { useState, useCallback } from "react";
import { View, Text, Button, StyleSheet, Switch } from "react-native";
import {
  doc,
  getDoc,
  query,
  where,
  getDocs,
  collection,
  updateDoc,
} from "firebase/firestore";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { auth, db } from "../../config/firebase";
import { HomeStackParamList } from "../../navigation/types";

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
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
      const dogDocRef = doc(db, "dogs", userDog.id);
      await updateDoc(dogDocRef, {
        isWalking: !isWalking,
        lastWalkingStatusUpdate: new Date(),
      });
      setIsWalking(!isWalking);
    } catch (error) {
      console.error("お散歩状態の更新エラー:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // 現在ログイン中のユーザーを取得
      const currentUser = auth.currentUser;

      if (currentUser) {
        // Firestoreからユーザー情報と犬の情報を取得
        const fetchUserData = async () => {
          try {
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              // ドキュメントが存在する場合、ユーザー名を取得
              const userData = userDoc.data();
              setUsername(userData.name);
              setIsOwner(userData.isOwner);

              // ユーザーが犬の飼い主の場合、犬の情報を取得
              if (userData.isOwner) {
                // ユーザーIDに一致する犬を検索
                const dogsQuery = query(
                  collection(db, "dogs"),
                  where("userID", "==", currentUser.uid)
                );

                const dogsSnapshot = await getDocs(dogsQuery);

                if (!dogsSnapshot.empty) {
                  // 犬のドキュメントが見つかった場合
                  const dogDoc = dogsSnapshot.docs[0];
                  const dogData = dogDoc.data();

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

                    setUserDog({
                      id: dogDoc.id,
                      dogname: dogData.dogname,
                    });
                    // お散歩状態を設定
                    setIsWalking(dogData.isWalking || false);
                  }
                }
              }
            }

            setLoading(false);
          } catch (error) {
            console.error("ユーザー情報の取得エラー:", error);
            setLoading(false);
          }
        };

        fetchUserData();
      }
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>ようこそ、{username}さん！</Text>

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
