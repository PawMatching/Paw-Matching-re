import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Switch,
  Alert,
  TouchableOpacity,
  Dimensions,
} from "react-native";
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
import LottieView from "lottie-react-native";

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
        });

        // Realtime Databaseにも位置情報を保存
        const rtdb = getDatabase();
        const dogLocationRef = ref(rtdb, `locations/dogs/${userDog.id}`);
        await set(dogLocationRef, {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          lastUpdated: new Date().toISOString(),
          isWalking: true,
        });

        setIsWalking(true);
        setRemainingTime(walkingTimeLimit); //残り時間をセット
        startWalkingTimer();
      } else {
        // お散歩終了の場合
        await updateDoc(dogDocRef, {
          isWalking: false,
          lastWalkingStatusUpdate: now,
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

    // カウントダウン（より頻繁に更新するため、アプリがバックグラウンドから戻ったときもすぐに反映したい）
    const newTimer = setInterval(() => {
      updateRemainingTime();
    }, 60000); // 1分ごとに更新

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
          // if (remaining <= 0 && isWalking) {...
          // cloud functionで設定済み
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

 // 画面がフォーカスされた時の処理
useFocusEffect(
  useCallback(() => {
    console.log("画面がフォーカスされました");
    let timer: NodeJS.Timeout | null = null;
    
    // 認証済みでユーザーが存在する場合、データを取得
    if (isAuthenticated && user) {
      console.log("フォーカス時: ユーザーデータの再取得を試みます");
      timer = setTimeout(() => {
        fetchUserData();
      }, 500);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      console.log("画面のフォーカスが外れました");
    };
  }, [isAuthenticated, user])
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

  if (loading || authLoading) {
    return (
      <View style={styles.container}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.welcomeText}>
          ようこそ、{username ? username : ""}さん！
        </Text>

        <Text style={styles.subText}>お散歩中のわんちゃんを探す場合は</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate("Search")}
        >
          <Text style={styles.searchButtonText}>わんちゃんを探す</Text>
        </TouchableOpacity>

        {!isOwner && (
          <View style={styles.buttonContainer}>
            <Text style={styles.subText}>わんちゃんを登録する場合は</Text>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate("RegisterDog")}
            >
              <Text style={styles.registerButtonText}>
                わんちゃんを登録する
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isOwner && userDog && (
          <View style={styles.walkingContainer}>
            <View style={styles.walkingStatusContainer}>
              <View>
                <Text style={styles.walkingText}>
                  {userDog.dogname}
                  {isWalking ? "とお散歩中" : "とお散歩に出る"}
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
                trackColor={{ false: "#767577", true: "#ffd8a1" }}
                thumbColor={isWalking ? "#FF9500" : "#f4f3f4"}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.animationContainer}>
        <LottieView
          source={require("../../assets/animations/dog-walking.json")}
          autoPlay
          loop
          style={styles.animation}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 40,
    color: "#2c3e50",
    textAlign: "center",
  },
  subText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
    marginTop: 12,
    color: "#6c757d",
    lineHeight: 22,
  },
  searchButton: {
    backgroundColor: "#FF9500",
    padding: 16,
    borderRadius: 12,
    width: "85%",
    marginBottom: 30,
    shadowColor: "#FF9500",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  buttonContainer: {
    width: "85%",
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: "#FF9500",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    shadowColor: "#FF9500",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  walkingContainer: {
    width: "85%",
    marginTop: 30,
  },
  walkingStatusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  walkingText: {
    fontSize: 16,
    marginRight: 10,
    color: "#2c3e50",
    fontWeight: "500",
  },
  timerText: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 6,
  },
  animationContainer: {
    height: 220,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    marginTop: 20,
  },
  animation: {
    width: Dimensions.get("window").width * 0.85,
    height: 220,
  },
});
