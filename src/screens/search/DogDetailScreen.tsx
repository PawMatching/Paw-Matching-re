// src/screens/search/DogDetailScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { Dog } from "../../types/dog";
import { UserData } from "../../types/user";

// 修正
type DogDetailRouteParams = {
  params: {
    dog: Dog;
  };
};

const DogDetailScreen = () => {
  // 修正
  const route = useRoute<RouteProp<DogDetailRouteParams, "params">>();
  const navigation = useNavigation();
  const { dog } = route.params;

  const [owner, setOwner] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  // リアルタイムリスナーでこの犬に対する申請状態を監視
  useEffect(() => {
    if (!currentUser) return;

    const db = getFirestore();
    const appliesRef = collection(db, "applies");

    // この特定の犬に対するユーザーの申請クエリ
    const q = query(
      appliesRef,
      where("userID", "==", currentUser.uid),
      where("dogID", "==", dog.id),
      where("status", "in", ["pending", "accepted", "rejected"])
    );

    // リアルタイムリスナーを設定
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let isCurrentlyApplied = false;

      // 現在の時刻
      const currentTime = new Date();
      const reapplyTimeLimit = 2 * 60 * 60 * 1000;

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // rejectedステータスの場合は表示しない
        if (data.status === "rejected") {
          return;
        }

        if (data.appliedAt) {
          const appliedTime = data.appliedAt.toDate();
          const timeDifference = currentTime.getTime() - appliedTime.getTime();

          if (timeDifference < reapplyTimeLimit) {
            isCurrentlyApplied = true;
          }
        } else {
          isCurrentlyApplied = true;
        }
      });

      setIsApplied(isCurrentlyApplied);
    });

    return () => unsubscribe();
  }, [currentUser, dog.id]);

  useEffect(() => {
    const fetchOwnerData = async () => {
      setIsLoading(true);
      try {
        const db = getFirestore();
        const userDocRef = doc(db, "users", dog.userID);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setOwner(userDoc.data() as UserData);
        }
      } catch (error) {
        console.error("Error fetching owner data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOwnerData();
  }, [dog.userID]);

  // useEffect(() => {
  //   const checkApplyStatus = async () => {
  //     if (!currentUser) return;

  //     try {
  //       const db = getFirestore();
  //       const appliesRef = collection(db, "applies");
  //       const q = query(
  //         appliesRef,
  //         where("userID", "==", currentUser.uid),
  //         where("dogID", "==", dog.id),
  //         where("status", "in", ["pending", "accepted", "rejected"])
  //       );

  //       const querySnapshot = await getDocs(q);
  //       let isCurrentlyApplied = false;

  //       // 現在の時刻
  //       const currentTime = new Date();
  //       // 再申請可能になるまでの時間（ミリ秒）: 2時間 = 7,200,000ミリ秒
  //       const reapplyTimeLimit = 2 * 60 * 60 * 1000;

  //       querySnapshot.forEach((doc) => {
  //         const data = doc.data();
  //         if (data.appliedAt) {
  //           const appliedTime = data.appliedAt.toDate(); // FirestoreのタイムスタンプをDateに変換
  //           const timeDifference =
  //             currentTime.getTime() - appliedTime.getTime();

  //           // 指定時間以内の申請（pendingまたはrejected）のみを「申請済み」とする
  //           if (timeDifference < reapplyTimeLimit) {
  //             isCurrentlyApplied = true;
  //           }
  //         } else {
  //           // appliedAtがない古いデータの場合は通常通り「申請済み」とする
  //           isCurrentlyApplied = true;
  //         }
  //       });

  //       setIsApplied(isCurrentlyApplied);
  //     } catch (error) {
  //       console.error("Error checking apply status:", error);
  //     }
  //   };

  //   checkApplyStatus();
  // }, [currentUser, dog.id]);

  const sendPettingRequest = async () => {
    if (!currentUser) {
      Alert.alert(
        "ログインが必要です",
        "モフモフ申請を送るにはログインしてください。"
      );
      return;
    }

    setIsSendingRequest(true);

    try {
      const db = getFirestore();
      const requestData = {
        applyID: `apply_${Date.now()}`,
        userID: currentUser.uid,
        dogID: dog.id,
        dogname: dog.dogname,
        dogOwnerID: dog.userID,
        status: "pending",
        message: `${currentUser.displayName || "ゲスト"}さんが${
          dog.dogname
        }ちゃんをモフモフしたいと思っています！`,
        appliedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        location: {
          latitude: dog.latitude,
          longitude: dog.longitude,
        },
      };
      // デバッグ用
      console.log("送信する申請情報:", {
        userID: currentUser.uid,
        dogID: dog.id,
        dogOwnerID: dog.userID,
        dog: dog,
      });

      const appliesCollectionRef = collection(db, "applies");
      await addDoc(appliesCollectionRef, requestData);

      Alert.alert(
        "モフモフ申請を送信しました",
        `${
          owner?.name || "飼い主"
        }さんに通知が送られました。返事をお待ちください。`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error sending petting request:", error);
      Alert.alert("エラー", "モフモフ申請の送信中にエラーが発生しました。");
    } finally {
      setIsSendingRequest(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4dabf7" />
        <Text style={styles.loadingText}>情報を読み込んでいます...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: dog.profileImage }}
        style={styles.dogImage}
        resizeMode="cover"
      />

      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.dogName}>{dog.dogname}</Text>
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={16} color="white" />
            <Text style={styles.distanceText}>
              {parseFloat(dog.distance || "0").toFixed(1)}km
            </Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>性別:</Text>
            <Text style={styles.detailValue}>
              {dog.sex === "male" ? "♂ オス" : "♀ メス"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>年齢:</Text>
            <Text style={styles.detailValue}>{dog.age}歳</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>好きなもの:</Text>
            <Text style={styles.detailValue}>{dog.likes}</Text>
          </View>

          {dog.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>メモ:</Text>
              <Text style={styles.notesText}>{dog.notes}</Text>
            </View>
          )}
        </View>
      </View>

      {owner && (
        <View style={styles.ownerContainer}>
          <Text style={styles.sectionTitle}>飼い主さん</Text>

          <View style={styles.ownerInfoRow}>
            {owner.profileImage ? (
              <Image
                source={{ uri: owner.profileImage }}
                style={styles.ownerImage}
              />
            ) : (
              <View style={styles.ownerPlaceholder}>
                <Ionicons name="person" size={24} color="#adb5bd" />
              </View>
            )}

            <View style={styles.ownerDetails}>
              <Text style={styles.ownerName}>{owner.name || "名前なし"}</Text>
              {owner.comment && (
                <Text style={styles.ownerComment}>{owner.comment}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      <View style={styles.actionsContainer}>
        {isApplied ? (
          <View style={styles.appliedContainer}>
            <View style={styles.appliedButton}>
              <Text style={styles.appliedButtonText}>申請済み</Text>
            </View>
            <Text style={styles.appliedSubtext}>
              飼い主さんからの返事をお待ちください
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={sendPettingRequest}
            disabled={isSendingRequest}
          >
            {isSendingRequest ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.primaryButtonText}>モフモフ申請を送る</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>リストに戻る</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6c757d",
    fontSize: 14,
  },
  dogImage: {
    width: "100%",
    height: 320,
  },
  infoContainer: {
    padding: 20,
    backgroundColor: "#ffffff",
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dogName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2c3e50",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF9500",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#FF9500",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  distanceText: {
    color: "white",
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
  },
  detailsContainer: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 16,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  detailLabel: {
    width: 90,
    color: "#6c757d",
    fontSize: 15,
  },
  detailValue: {
    flex: 1,
    color: "#2c3e50",
    fontSize: 15,
    lineHeight: 22,
  },
  notesContainer: {
    marginTop: 12,
  },
  notesLabel: {
    color: "#6c757d",
    marginBottom: 6,
    fontSize: 15,
  },
  notesText: {
    color: "#2c3e50",
    fontSize: 15,
    lineHeight: 22,
  },
  ownerContainer: {
    padding: 20,
    backgroundColor: "#ffffff",
    marginTop: 16,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#2c3e50",
  },
  ownerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ownerImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  ownerPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e9ecef",
    justifyContent: "center",
    alignItems: "center",
  },
  ownerDetails: {
    marginLeft: 16,
    flex: 1,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  ownerComment: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 6,
    fontStyle: "italic",
    lineHeight: 20,
  },
  actionsContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  appliedContainer: {
    alignItems: "center",
  },
  appliedButton: {
    backgroundColor: "#adb5bd",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#adb5bd",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  appliedButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  appliedSubtext: {
    marginTop: 10,
    color: "#6c757d",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#FF9500",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#FF9500",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 16,
    backgroundColor: "#e9ecef",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  secondaryButtonText: {
    color: "#495057",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DogDetailScreen;
