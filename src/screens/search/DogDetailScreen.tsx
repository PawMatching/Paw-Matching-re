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

  useEffect(() => {
    const checkApplyStatus = async () => {
      if (!currentUser) return;

      try {
        const db = getFirestore();
        const appliesRef = collection(db, "applies");
        const q = query(
          appliesRef,
          where("userID", "==", currentUser.uid),
          where("dogID", "==", dog.id),
          where("status", "in", ["pending", "accepted"])
        );

        const querySnapshot = await getDocs(q);
        setIsApplied(!querySnapshot.empty);
      } catch (error) {
        console.error("Error checking apply status:", error);
      }
    };

    checkApplyStatus();
  }, [currentUser, dog.id]);

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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  dogImage: {
    width: "100%",
    height: 300,
  },
  infoContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dogName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF9500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: "white",
    marginLeft: 4,
  },
  detailsContainer: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  detailLabel: {
    width: 80,
    color: "#666",
  },
  detailValue: {
    flex: 1,
    color: "#212529",
  },
  notesContainer: {
    marginTop: 8,
  },
  notesLabel: {
    color: "#666",
    marginBottom: 4,
  },
  notesText: {
    color: "#212529",
  },
  ownerContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  ownerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ownerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  ownerPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e9ecef",
    justifyContent: "center",
    alignItems: "center",
  },
  ownerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "500",
  },
  ownerComment: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  actionsContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  appliedContainer: {
    alignItems: "center",
  },
  appliedButton: {
    backgroundColor: "#adb5bd",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  appliedButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  appliedSubtext: {
    marginTop: 8,
    color: "#666",
  },
  primaryButton: {
    backgroundColor: "#FF9500",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: "#e9ecef",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#495057",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DogDetailScreen;
