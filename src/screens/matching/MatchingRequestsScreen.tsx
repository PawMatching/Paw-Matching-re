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
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  runTransaction,
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
  dogname: string;
  dogOwnerID: string; //飼い主のID
  status: "pending" | "accepted" | "rejected";
  message: string;
  appliedAt: {
    toDate: () => Date;
  };
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

  // fetchRequestsを一箇所だけで定義
  const fetchRequests = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return undefined;
    }

    try {
      const db = getFirestore();
      const appliesRef = collection(db, "applies");
      console.log("Query params:", {
        dogOwnerID: currentUser.uid,
        status: "pending",
      });
      const q = query(
        appliesRef,
        where("dogOwnerID", "==", currentUser.uid),
        where("status", "==", "pending"),
        orderBy("appliedAt", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        async (querySnapshot) => {
          console.log("Query snapshot size:", querySnapshot.size);
          console.log(
            "Raw data:",
            querySnapshot.docs.map((doc) => doc.data())
          );
          const requestsData: RequestWithUserAndDog[] = [];

          // すべてのドキュメント処理が終わるのを待つための配列
          const promises = querySnapshot.docs.map(async (docSnapshot) => {
            try {
              const requestData = {
                id: docSnapshot.id,
                ...docSnapshot.data(),
              } as PettingRequest;

              // デバッグ用に犬のID表示
              console.log("Fetching dog with ID:", requestData.dogID);

              // 自分の犬に対する申請のみを取得
              const dogDocRef = doc(db, "dogs", requestData.dogID);
              const dogDocSnapshot = await getDoc(dogDocRef);

              if (!dogDocSnapshot.exists()) {
                console.error("Dog document not found:", requestData.dogID);
                return null;
              }

              const dogData = dogDocSnapshot.data();

              if (dogData.userID !== currentUser.uid) {
                console.log(
                  "Dog does not belong to current user:",
                  dogData.userID,
                  currentUser.uid
                );
                return null;
              }

              // デバッグ用にユーザーのID表示
              console.log("Fetching user with ID:", requestData.userID);

              // 申請者の情報を取得
              const userDocRef = doc(db, "users", requestData.userID);
              const userDocSnapshot = await getDoc(userDocRef);

              if (!userDocSnapshot.exists()) {
                console.error("User document not found:", requestData.userID);
                return null;
              }

              const userData = userDocSnapshot.data();

              return {
                ...requestData,
                requester: userData as UserData,
                dog: {
                  id: requestData.dogID,
                  ...dogData,
                } as Dog,
              };
            } catch (error) {
              console.error("Error processing document:", error);
              return null;
            }
          });

          // すべてのPromiseが解決するのを待つ
          const results = await Promise.all(promises);
          // nullを除外する
          const validResults = results.filter(
            (result) => result !== null
          ) as RequestWithUserAndDog[];

          console.log("Processed requests:", validResults.length);
          setRequests(validResults);
          setIsLoading(false);
        },
        (error) => {
          console.error("Error fetching requests:", error);
          Alert.alert("エラー", "申請の取得中にエラーが発生しました。");
          setIsLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up requests listener:", error);
      Alert.alert("エラー", "申請の取得中にエラーが発生しました。");
      setIsLoading(false);
      return undefined;
    }
  };

  // useEffectでfetchRequestsを呼び出す
  useEffect(() => {
    setIsLoading(true);
    const unsubscribePromise = fetchRequests();

    // クリーンアップ関数
    return () => {
      // Promiseが解決されたら、その結果（unsubscribe関数）を実行する
      unsubscribePromise
        .then((unsubscribeFunc) => {
          if (unsubscribeFunc) unsubscribeFunc();
        })
        .catch((err) => {
          console.error("Error during cleanup:", err);
        });
    };
  }, []);

  const handleAccept = async (request: RequestWithUserAndDog) => {
    try {
      const db = getFirestore();
      const requestRef = doc(db, "applies", request.id);
      const currentTimestamp = new Date();
  
      // トランザクションで処理を行う
      await runTransaction(db, async (transaction) => {
        // 申請のステータスを更新
        transaction.update(requestRef, {
          status: "accepted",
          updatedAt: currentTimestamp,
        });
  
        // まず matches コレクションにドキュメントを作成
        const matchRef = doc(collection(db, "matches"));
        const matchData = {
          id: matchRef.id,
          dogID: request.dogID,
          dogOwnerID: currentUser?.uid,
          pettingUserID: request.userID,
          status: "active",
          createdAt: currentTimestamp,
        };
        
        transaction.set(matchRef, matchData);
  
        // チャットルームを作成
        const chatRef = doc(collection(db, "chats"));
        const chatData = {
          chatID: chatRef.id,
          dogID: request.dogID,
          matchID: matchRef.id,
          dogOwnerID: currentUser?.uid,
          pettingUserID: request.userID,
          dogName: request.dog.dogname || "不明な犬",
          createdAt: currentTimestamp,
          lastMessage: null,
          lastMessageAt: currentTimestamp,
          lastMessageTime: null
        };
        
        transaction.set(chatRef, chatData);
  
        // matches ドキュメントに chatId を追加
        transaction.update(matchRef, {
          chatId: chatRef.id
        });
      });
  
      Alert.alert(
        "承認しました",
        "モフモフ申請を承認しました。チャットで詳細を話し合いましょう！",
        [{ text: "OK", onPress: () => fetchRequests() }]
      );
    } catch (error) {
      console.error("Error accepting request:", error);
      Alert.alert(
        "エラー",
        "申請の承認中にエラーが発生しました。もう一度お試しください。"
      );
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
      Alert.alert(
        "エラー",
        "申請の拒否中にエラーが発生しました。もう一度お試しください。"
      );
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
            {item.requester.name}さんから
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
    marginTop: 12,
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
