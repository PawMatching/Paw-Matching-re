// src/screens/search/SearchDogsScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from "react-native";
import {
  NavigationProp,
  ParamListBase,
  useIsFocused,
} from "@react-navigation/native";
import * as Location from "expo-location";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, get, set } from "firebase/database";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { Dog } from "../../types/dog";
import { db } from "../../config/firebase";
// 2点間の距離を計算する関数（ハーバーサイン公式）
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371; // 地球の半径（km）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

const SearchDogsScreen = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [nearbyDogs, setNearbyDogs] = useState<Dog[]>([]);
  const [appliedDogIds, setAppliedDogIds] = useState<Record<string, boolean>>(
    {}
  );
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const searchRadius = 5; // 検索半径はテスト用に5km

  const isFocused = useIsFocused();

  // 画面がフォーカスされたときに自動で検索を開始
  useEffect(() => {
    if (isFocused) {
      findNearbyDogs();
    }
  }, [isFocused]);

  // 申請状態を監視するリアルタイムリスナーを設定
  useEffect(() => {
    if (!currentUser || !isFocused) return;

    const db = getFirestore();
    const appliesRef = collection(db, "applies");

    // 現在のユーザーが行った申請のクエリ
    const q = query(
      appliesRef,
      where("userID", "==", currentUser.uid),
      where("status", "in", ["pending", "accepted", "rejected"])
    );

    // リアルタイムリスナーを設定
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const appliedIds: Record<string, boolean> = {};

        // 現在の時刻
        const currentTime = new Date();
        // 再申請可能になるまでの時間（ミリ秒）: 2時間 = 7,200,000ミリ秒
        const reapplyTimeLimit = 2 * 60 * 60 * 1000;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.dogID) {
            // rejectedステータスの申請は表示しない
            if (data.status === "rejected") {
              return;
            }

            // pendingまたはacceptedの場合
            if (data.appliedAt) {
              const appliedTime = data.appliedAt.toDate(); // FirestoreのタイムスタンプをDateに変換
              const timeDifference =
                currentTime.getTime() - appliedTime.getTime();

              // 2時間以内の申請のみを「申請済み」として扱う
              if (timeDifference < reapplyTimeLimit) {
                appliedIds[data.dogID] = true;
              }
            } else {
              // appliedAtがない古いデータの場合は通常通り「申請済み」とする
              appliedIds[data.dogID] = true;
            }
          }
        });

        console.log(
          "リアルタイム更新: 申請済み犬の数",
          Object.keys(appliedIds).length
        );
        setAppliedDogIds(appliedIds);
      },
      (error) => {
        console.error("Firestore リスナーエラー:", error);
      }
    );

    // クリーンアップ関数でリスナーを解除
    return () => {
      unsubscribe();
      console.log("Firestore リスナー解除");
    };
  }, [currentUser, isFocused]); // 依存配列にisFocusedを追加

  // 位置情報を取得する関数
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "位置情報が必要です",
          "近くのわんちゃんを見つけるには位置情報へのアクセスを許可してください。"
        );
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });

      // 位置情報をデータベースに保存
      if (currentUser) {
        const db = getDatabase();
        const userLocationRef = ref(db, `locations/users/${currentUser.uid}`);
        await set(userLocationRef, {
          latitude,
          longitude,
          lastUpdated: new Date().toISOString(),
        });
      }

      return { latitude, longitude };
    } catch (error) {
      console.error("位置情報の取得に失敗しました:", error);
      Alert.alert(
        "エラー",
        "位置情報の取得に失敗しました。もう一度お試しください。"
      );
      return null;
    }
  };

  // 近くの犬を検索する関数
  const findNearbyDogs = async () => {
    try {
      setIsLoading(true);
      const nearbyDogsArray: Dog[] = [];

      // 位置情報を取得
      const location = await getCurrentLocation();
      if (!location) {
        return;
      }

      // お散歩中の犬を検索
      const querySnapshot = await getDocs(
        query(collection(db, "dogs"), where("isWalking", "==", true))
      );

      // Realtime Databaseから位置情報を取得
      const rtdb = getDatabase();
      const locationsRef = ref(rtdb, "locations/dogs");

      // 検索結果の処理
      for (const doc of querySnapshot.docs) {
        const dogData = doc.data();
        const dogId = doc.id;

        // 現在のユーザーの犬は除外
        if (dogData.userID === currentUser?.uid) {
          continue;
        }

        // Realtime Databaseから位置情報を取得
        const dogLocationSnapshot = await get(
          ref(rtdb, `locations/dogs/${dogId}`)
        );
        const dogLocationData = dogLocationSnapshot.val();

        if (
          !dogLocationData ||
          !dogLocationData.latitude ||
          !dogLocationData.longitude
        ) {
          continue;
        }

        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          dogLocationData.latitude,
          dogLocationData.longitude
        );

        if (distance <= searchRadius) {
          nearbyDogsArray.push({
            id: doc.id,
            dogname: dogData.dogname || "",
            sex: dogData.sex || "male",
            profileImage: dogData.profileImage || "",
            age: dogData.age || 0,
            likes: dogData.likes || "",
            notes: dogData.notes || "",
            distance: distance.toString(),
            latitude: dogLocationData.latitude,
            longitude: dogLocationData.longitude,
            isWalking: dogData.isWalking || false,
            userID: dogData.userID || "",
            createdAt: dogData.createdAt || new Date().toISOString(),
            updatedAt: dogData.updatedAt || new Date().toISOString(),
          });
        }
      }

      setNearbyDogs(nearbyDogsArray);
    } catch (error) {
      console.error("近くの犬の検索に失敗しました:", error);
      Alert.alert(
        "エラー",
        "近くの犬の検索に失敗しました。もう一度お試しください。"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect(() => {
  //   if (!currentUser || nearbyDogs.length === 0) return;

  //   const checkApplyStatuses = async () => {
  //     try {
  //       const db = getFirestore();
  //       const appliesRef = collection(db, "applies");

  //       const q = query(
  //         appliesRef,
  //         where("userID", "==", currentUser.uid),
  //         where("status", "in", ["pending", "accepted", "rejected"])
  //       );

  //       const querySnapshot = await getDocs(q);
  //       const appliedIds: Record<string, boolean> = {};

  //       // 現在の時刻
  //       const currentTime = new Date();
  //       // 再申請可能になるまでの時間（ミリ秒）: 2時間 = 7,200,000ミリ秒
  //       const reapplyTimeLimit = 2 * 60 * 60 * 1000;

  //       querySnapshot.forEach((doc) => {
  //         const data = doc.data();
  //         if (data.dogID) {
  //           // appliedAtタイムスタンプがある場合、時間経過をチェック
  //           if (data.appliedAt) {
  //             const appliedTime = data.appliedAt.toDate(); // FirestoreのタイムスタンプをDateに変換
  //             const timeDifference =
  //               currentTime.getTime() - appliedTime.getTime();

  //             // 指定時間以内の申請（pendingまたはrejected）のみを「申請済み」とする
  //             if (timeDifference < reapplyTimeLimit) {
  //               appliedIds[data.dogID] = true;
  //             }
  //           } else {
  //             // appliedAtがない古いデータの場合は通常通り「申請済み」とする
  //             appliedIds[data.dogID] = true;
  //           }
  //         }
  //       });

  //       setAppliedDogIds(appliedIds);
  //     } catch (error) {
  //       console.error("Error checking apply statuses:", error);
  //     }
  //   };

  //   checkApplyStatuses();
  // }, [currentUser, nearbyDogs]);

  const navigateToDogProfile = (dog: Dog) => {
    navigation.navigate("DogDetail", { dog });
  };

  const renderDogItem = ({ item }: { item: Dog }) => {
    const isApplied = appliedDogIds[item.id] || false;
    const distance = item.distance
      ? parseFloat(item.distance).toFixed(1)
      : "0.0";

    return (
      <TouchableOpacity
        style={[styles.dogCard, isApplied && styles.appliedDogCard]}
        onPress={() => navigateToDogProfile(item)}
      >
        <Image
          source={{ uri: item.profileImage }}
          style={styles.dogImage}
          resizeMode="cover"
        />
        <View style={styles.dogInfo}>
          <Text style={styles.dogName}>{item.dogname}</Text>
          <Text style={styles.dogDetail}>
            {item.sex === "male" ? "♂ オス" : "♀ メス"} • {item.age}歳
          </Text>
          <Text style={styles.dogDistance}>{distance}km先</Text>
          <Text style={styles.dogNotes} numberOfLines={1}>
            {item.notes}
          </Text>
        </View>

        {isApplied && (
          <View style={styles.appliedBadge}>
            <Text style={styles.appliedText}>申請済み</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>5km圏内のわんちゃん</Text>

      <TouchableOpacity
        style={styles.searchButton}
        onPress={findNearbyDogs}
        disabled={isLoading}
      >
        <Text style={styles.searchButtonText}>
          {userLocation ? "再検索" : "わんちゃんを探す"}
        </Text>
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4dabf7" />
          <Text style={styles.loadingText}>
            近くのわんちゃんを探しています...
          </Text>
        </View>
      )}

      {!isLoading && userLocation && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {nearbyDogs.length > 0
              ? `${nearbyDogs.length}匹のわんちゃんが見つかりました！`
              : "近くにわんちゃんが見つかりませんでした。"}
          </Text>

          <FlatList
            data={nearbyDogs}
            renderItem={renderDogItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.dogsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                現在お散歩中のわんちゃんがいません。また後で試してみてください。
              </Text>
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  title: {
    fontSize: 21,
    fontWeight: "700",
    marginBottom: 30,
    textAlign: "center",
    color: "#2c3e50",
  },
  searchButton: {
    backgroundColor: "#FF9500",
    padding: 16,
    borderRadius: 12,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6c757d",
  },
  resultsContainer: {
    flex: 1,
  },
  resultsText: {
    fontSize: 16,
    marginBottom: 20,
    color: "#6c757d",
    textAlign: "center",
  },
  dogsList: {
    paddingBottom: 20,
  },
  dogCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  appliedDogCard: {
    opacity: 0.7,
  },
  dogImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  dogInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  dogName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    color: "#2c3e50",
  },
  dogDetail: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 6,
  },
  dogDistance: {
    fontSize: 14,
    color: "#FF9500",
    marginBottom: 6,
    fontWeight: "500",
  },
  dogNotes: {
    fontSize: 13,
    color: "#6c757d",
    fontStyle: "italic",
    lineHeight: 18,
  },
  appliedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FF9500",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  appliedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#6c757d",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 20,
  },
});

export default SearchDogsScreen;
