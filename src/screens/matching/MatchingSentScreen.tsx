// src/screens/matching/MatchingSentScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
  TouchableOpacity,
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
  deleteDoc,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";

type DogData = {
  dogname: string;
  profileImage?: string;
  userID: string;
};

type SentRequest = {
  id: string;
  dogID: string;
  dogName: string;
  dogImage: string | null;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  message: string;
};

const MatchingSentScreen = () => {
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // スワイプアイテムの参照を保持
  const [rows, setRows] = useState<Array<Swipeable | null>>([]);
  const [openRow, setOpenRow] = useState<Swipeable | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setError("ユーザー情報が取得できません。");
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const appliesRef = collection(db, "applies");
    const q = query(
      appliesRef,
      where("userID", "==", currentUser.uid),
      orderBy("appliedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const requests = await Promise.all(
            snapshot.docs.map(async (docSnapshot) => {
              try {
                const data = docSnapshot.data() as DocumentData;
                const dogDocRef = doc(db, "dogs", data.dogID);
                const dogDoc = await getDoc(dogDocRef);

                if (!dogDoc.exists()) {
                  console.warn(`Dog document not found for ID: ${data.dogID}`);
                  return null;
                }

                const dogData = dogDoc.data() as DogData;

                return {
                  id: docSnapshot.id,
                  dogID: data.dogID,
                  dogName: dogData?.dogname || "不明な犬",
                  dogImage: dogData?.profileImage || null,
                  status: data.status,
                  message: data.message || "",
                  createdAt: data.appliedAt?.toDate() || new Date(),
                };
              } catch (err) {
                console.error("Error processing document:", err);
                return null;
              }
            })
          );

          // nullを除外して有効なリクエストのみを設定
          setSentRequests(
            requests.filter((req): req is SentRequest => req !== null)
          );
          setError(null);
        } catch (err) {
          console.error("Error processing snapshot:", err);
          setError("データの取得中にエラーが発生しました。");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error in snapshot listener:", error);
        setError("リアルタイム更新中にエラーが発生しました。");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // スワイプで削除する関数
  const deleteRequest = async (requestId: string) => {
    Alert.alert("削除の確認", "このモフモフ申請を削除しますか？", [
      {
        text: "キャンセル",
        style: "cancel",
      },
      {
        text: "削除",
        onPress: () => {
          const deleteOperation = async () => {
            try {
              const db = getFirestore();
              const requestRef = doc(db, "applies", requestId);
              await deleteDoc(requestRef);
              // リストから削除（Firestoreのリスナーが自動的に更新するため不要ですが、UIの応答性を高めるために）
              setSentRequests((prevRequests) =>
                prevRequests.filter((req) => req.id !== requestId)
              );
              Alert.alert("成功", "モフモフ申請を削除しました。");
            } catch (error) {
              console.error("Error deleting request:", error);
              Alert.alert(
                "エラー",
                "リクエストの削除中にエラーが発生しました。"
              );
            }
          };
          deleteOperation();
        },
      },
    ]);
  };

  // スワイプアクションをレンダリングする関数
  const renderRightActions = (requestId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => deleteRequest(requestId)}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  // スワイプした時に他の開いているスワイプを閉じる
  const closeRow = (index: number) => {
    if (openRow && openRow !== rows[index]) {
      openRow.close();
    }
    setOpenRow(rows[index]);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: SentRequest;
    index: number;
  }) => (
    <Swipeable
      ref={(ref) => (rows[index] = ref)}
      renderRightActions={() => renderRightActions(item.id)}
      onSwipeableOpen={() => closeRow(index)}
    >
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
            <Text
              style={[
                styles.statusText,
                item.status === "accepted"
                  ? styles.acceptedStatus
                  : item.status === "rejected"
                  ? styles.rejectedStatus
                  : styles.pendingStatus,
              ]}
            >
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
    </Swipeable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4dabf7" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
        <Text style={styles.errorText}>{error}</Text>
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

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>← スワイプで削除</Text>
      <FlatList
        data={sentRequests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        onScrollBeginDrag={() => {
          if (openRow) {
            openRow.close();
            setOpenRow(null);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  instruction: {
    textAlign: "center",
    padding: 8,
    color: "#adb5bd",
    backgroundColor: "#f8f9fa",
    fontSize: 14,
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
    marginBottom: 2,
  },
  pendingStatus: {
    color: "#4dabf7",
  },
  acceptedStatus: {
    color: "#40c057",
  },
  rejectedStatus: {
    color: "#ff6b6b",
  },
  dateText: {
    fontSize: 12,
    color: "#adb5bd",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#ff6b6b",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  deleteAction: {
    backgroundColor: "#ff6b6b",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
});

export default MatchingSentScreen;
