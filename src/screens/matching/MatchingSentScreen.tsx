import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDoc,
  doc,
  DocumentData,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

type DogData = {
  name: string;
  images: string[];
  userID: string;
};

type SentRequest = {
  id: string;
  dogID: string;
  dogName: string;
  dogImage: string | null;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
};

const MatchingSentScreen = () => {
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const db = getFirestore();
    const appliesRef = collection(db, "applies");
    const q = query(
      appliesRef,
      where("userID", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const requests = await Promise.all(
          snapshot.docs.map(async (docSnapshot) => {
            const data = docSnapshot.data() as DocumentData;
            // 犬の情報を取得
            const dogDoc = await getDoc(doc(db, "dogs", data.dogID));
            const dogData = dogDoc.data() as DogData;

            return {
              id: docSnapshot.id,
              dogID: data.dogID,
              dogName: dogData?.name || "不明な犬",
              dogImage: dogData?.images?.[0] || null,
              status: data.status,
              createdAt: data.createdAt.toDate(),
            };
          })
        );
        setSentRequests(requests);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching sent requests:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4dabf7" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (sentRequests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="paper-plane-outline" size={64} color="#adb5bd" />
        <Text style={styles.emptyText}>送信したリクエストはありません</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: SentRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        {item.dogImage ? (
          <Image source={{ uri: item.dogImage }} style={styles.dogImage} />
        ) : (
          <View style={[styles.dogImage, styles.defaultImageContainer]}>
            <Ionicons name="paw-outline" size={30} color="#adb5bd" />
          </View>
        )}
        <View style={styles.requestInfo}>
          <Text style={styles.dogName}>{item.dogName}</Text>
          <Text style={styles.statusText}>
            {item.status === "pending"
              ? "承認待ち"
              : item.status === "accepted"
              ? "承認済み"
              : "却下されました"}
          </Text>
          <Text style={styles.dateText}>
            {item.createdAt.toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sentRequests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#adb5bd",
    textAlign: "center",
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
    alignItems: "center",
  },
  dogImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  defaultImageContainer: {
    backgroundColor: "#f1f3f5",
    justifyContent: "center",
    alignItems: "center",
  },
  requestInfo: {
    flex: 1,
  },
  dogName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: "#495057",
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: "#adb5bd",
  },
});

export default MatchingSentScreen;
