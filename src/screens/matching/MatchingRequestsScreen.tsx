// src/screens/matching/MatchingRequestsScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  orderBy,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { UserData } from "../../types/user";
import { Dog } from "../../types/dog";

type PettingRequest = {
  id: string;
  applyID: string;
  userID: string; //申請者のID
  dogID: string; //犬のID
  dogOwnerID: string; //飼い主のID
  status: "pending" | "accepted" | "rejected";
  message: string;
  appliedAt: any;
  expiresAt: Date;
  location: {
    latitude: number;
    longitude: number;
  };
};

type RequestWithUserAndDog = PettingRequest & {
  requester: UserData;
  dog: Dog;
};

const MatchingRequestsScreen = () => {
  const [requests, setRequests] = useState<RequestWithUserAndDog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    if (!currentUser) return;

    try {
      const db = getFirestore();
      const appliesRef = collection(db, "applies");
      const q = query(
        appliesRef,
        where("dogOwnerID", "==", currentUser.uid),
        where("status", "==", "pending"),
        orderBy("appliedAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const requestsData: RequestWithUserAndDog[] = [];

      for (const docSnapshot of querySnapshot.docs) {
        const requestData = {
          id: docSnapshot.id,
          ...docSnapshot.data(),
        } as PettingRequest;

        // 自分の犬に対する申請のみを取得
        const dogDocRef = doc(db, "dogs", requestData.dogID);
        const dogDocSnapshot = await getDoc(dogDocRef);
        if (
          !dogDocSnapshot.exists() ||
          dogDocSnapshot.data().userID !== currentUser.uid
        )
          continue;

        // 申請者の情報を取得
        const userDocRef = doc(db, "users", requestData.userID);
        const userDocSnapshot = await getDoc(userDocRef);
        if (!userDocSnapshot.exists()) continue;

        const dogData = dogDocSnapshot.data();
        const userData = userDocSnapshot.data();

        requestsData.push({
          ...requestData,
          requester: userData as UserData,
          dog: {
            id: requestData.dogID,
            ...dogData,
          } as Dog,
        });
      }

      setRequests(requestsData);
    } catch (error) {
      console.error("Error fetching requests:", error);
      Alert.alert("エラー", "申請の取得中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (request: RequestWithUserAndDog) => {
    try {
      const db = getFirestore();
      const requestRef = doc(db, "applies", request.id);

      await updateDoc(requestRef, {
        status: "accepted",
        updatedAt: new Date(),
      });

      // チャットルームの作成などの追加処理をここに実装

      Alert.alert(
        "承認しました",
        "モフモフ申請を承認しました。チャットで詳細を話し合いましょう！",
        [{ text: "OK", onPress: () => fetchRequests() }]
      );
    } catch (error) {
      console.error("Error accepting request:", error);
      Alert.alert("エラー", "申請の承認中にエラーが発生しました。");
    }
  };

  const handleReject = async (request: RequestWithUserAndDog) => {
    try {
      const db = getFirestore();
      const requestRef = doc(db, "applies", request.id);

      await updateDoc(requestRef, {
        status: "rejected",
        updatedAt: new Date(),
      });

      Alert.alert("申請を断りました", "モフモフ申請を断りました。", [
        { text: "OK", onPress: () => fetchRequests() },
      ]);
    } catch (error) {
      console.error("Error rejecting request:", error);
      Alert.alert("エラー", "申請の拒否中にエラーが発生しました。");
    }
  };

  const renderRequestItem = ({ item }: { item: RequestWithUserAndDog }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        {item.requester.profileImage ? (
          <Image
            source={{ uri: item.requester.profileImage }}
            style={styles.requesterImage}
          />
        ) : (
          <View style={[styles.requesterImage, styles.defaultImageContainer]}>
            <MaterialIcons name="person" size={36} color="#adb5bd" />
          </View>
        )}
        <View style={styles.requestInfo}>
          <Text style={styles.requestTitle}>
            {item.requester.name}さんから{item.dog.name}へ
          </Text>
          <Text style={styles.requestMessage}>{item.message}</Text>
          {item.requester.comment && (
            <Text style={styles.requesterComment}>
              {item.requester.comment}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAccept(item)}
        >
          <Text style={styles.actionButtonText}>モフモフ申請を受ける</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item)}
        >
          <Text style={[styles.actionButtonText, styles.rejectButtonText]}>
            ごめんなさい
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4dabf7" />
        <Text style={styles.loadingText}>申請を読み込んでいます...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="paw-outline" size={48} color="#adb5bd" />
            <Text style={styles.emptyText}>新しいモフモフ申請はありません</Text>
          </View>
        }
      />
    </View>
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
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  requesterImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  requestMessage: {
    fontSize: 14,
    color: "#495057",
    marginBottom: 4,
  },
  requesterComment: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  actionButtons: {
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  acceptButton: {
    backgroundColor: "#4dabf7",
  },
  rejectButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  rejectButtonText: {
    color: "#495057",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#adb5bd",
    textAlign: "center",
  },
  defaultImageContainer: {
    backgroundColor: "#f1f3f5",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default MatchingRequestsScreen;
