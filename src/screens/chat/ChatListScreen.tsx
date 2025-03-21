// src/screens/chat/ChatListScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  Timestamp,
  QuerySnapshot,
  DocumentData,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ChatData, ChatWithDetails } from "../../types/chat";
import { NavigationProp } from "../../types/navigation";
import { Swipeable } from "react-native-gesture-handler";

const ChatListScreen = () => {
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp>();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const db = getFirestore();

  // スワイプアイテムの参照を保持
  const [rows, setRows] = useState<Array<Swipeable | null>>([]);
  const [openRow, setOpenRow] = useState<Swipeable | null>(null);

  const processChatsSnapshot = useCallback(
    async (snapshot: QuerySnapshot<DocumentData>, isUserDogOwner: boolean) => {
      if (!currentUser) return;

      const chatsList: ChatWithDetails[] = [];

      try {
        const promises = snapshot.docs.map(async (docSnapshot) => {
          const chatData = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          } as ChatData;

          // 現在のユーザーが削除済みの場合はスキップ
          if (chatData.deletedBy?.[currentUser.uid]) {
            return null;
          }

          const otherUserId = isUserDogOwner
            ? chatData.pettingUserID
            : chatData.dogOwnerID;
          const dogId = chatData.dogID;

          // 相手のユーザー情報を取得
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          const userData = userDoc.exists()
            ? (userDoc.data() as {
                name?: string;
                displayName?: string;
                profileImage?: string;
              })
            : null;

          // 犬の情報を取得
          const dogDoc = await getDoc(doc(db, "dogs", dogId));
          const dogData = dogDoc.exists()
            ? (dogDoc.data() as { dogname?: string; profileImage?: string })
            : null;

          return {
            ...chatData,
            otherUserName:
              userData?.name || userData?.displayName || "匿名ユーザー",
            otherUserImage: userData?.profileImage || null,
            dogName: dogData?.dogname || "不明な犬",
            dogImage: dogData?.profileImage || null,
            isUserDogOwner: isUserDogOwner,
          };
        });

        const results = await Promise.all(promises);
        const validResults = results.filter(
          (result): result is ChatWithDetails => result !== null
        );

        setChats((prevChats) => {
          const combinedChats = [...prevChats];
          validResults.forEach((newChat) => {
            const existingIndex = combinedChats.findIndex(
              (chat) => chat.id === newChat.id
            );
            if (existingIndex >= 0) {
              combinedChats[existingIndex] = newChat;
            } else {
              combinedChats.push(newChat);
            }
          });

          return combinedChats.sort((a, b) => {
            const aTime = a.lastMessageAt?.toDate?.() || new Date(0);
            const bTime = b.lastMessageAt?.toDate?.() || new Date(0);
            return bTime.getTime() - aTime.getTime();
          });
        });
      } catch (error) {
        console.error("Error processing chats:", error);
        setError("チャット情報の取得中にエラーが発生しました");
      }
    },
    [db, currentUser?.uid]
  );

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setError(null);
    const chatsRef = collection(db, "chats");

    // 自分が関わるチャットを全て取得（犬の飼い主または相手ユーザーとして）
    const q = query(
      chatsRef,
      where("dogOwnerID", "==", currentUser.uid),
      orderBy("lastMessageAt", "desc")
    );

    const q2 = query(
      chatsRef,
      where("pettingUserID", "==", currentUser.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsubscribe1 = onSnapshot(q, async (snapshot) => {
      await processChatsSnapshot(snapshot, true);
      setLoading(false);
    });

    const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
      await processChatsSnapshot(snapshot, false);
      setLoading(false);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [currentUser, processChatsSnapshot]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    // チャット一覧を再取得する処理
    setRefreshing(false);
  }, []);

  const navigateToChat = useCallback(
    (chat: ChatWithDetails) => {
      navigation.navigate("ChatScreen", {
        chatId: chat.id,
        dogId: chat.dogID,
        otherUserId: chat.isUserDogOwner ? chat.pettingUserID : chat.dogOwnerID,
        matchId: chat.matchID,
      });
    },
    [navigation]
  );

  // スワイプで削除する関数
  const deleteChat = async (chatId: string) => {
    if (!currentUser) return;

    Alert.alert("削除の確認", "このチャットを削除しますか？", [
      {
        text: "キャンセル",
        style: "cancel",
      },
      {
        text: "削除",
        onPress: async () => {
          try {
            const db = getFirestore();
            const chatRef = doc(db, "chats", chatId);

            // チャットを完全に削除するのではなく、現在のユーザーの削除フラグを更新
            await updateDoc(chatRef, {
              [`deletedBy.${currentUser.uid}`]: true,
              [`deletedAt.${currentUser.uid}`]: new Date(),
            });

            // UIの即時更新のために、削除したチャットをステートから除外
            setChats((prevChats) =>
              prevChats.filter((chat) => chat.id !== chatId)
            );
            Alert.alert("成功", "チャットを削除しました。");
          } catch (error) {
            console.error("Error deleting chat:", error);
            Alert.alert("エラー", "チャットの削除中にエラーが発生しました。");
          }
        },
      },
    ]);
  };

  // スワイプアクションをレンダリングする関数
  const renderRightActions = (chatId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => deleteChat(chatId)}
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

  const renderChatItem = useCallback(
    ({ item, index }: { item: ChatWithDetails; index: number }) => {
      // チャットの有効期限を確認
      const isExpired =
        item.status === "closed" ||
        (item.expiresAt && item.expiresAt.toDate() < new Date());

      return (
        <Swipeable
          ref={(ref) => (rows[index] = ref)}
          renderRightActions={() => renderRightActions(item.id)}
          onSwipeableOpen={() => closeRow(index)}
        >
          <TouchableOpacity
            style={[styles.chatItem, isExpired && styles.expiredChatItem]}
            onPress={() => navigateToChat(item)}
            disabled={isExpired}
          >
            {!item.isUserDogOwner ? (
              <View style={styles.avatarContainer}>
                {item.dogImage ? (
                  <Image
                    source={{ uri: item.dogImage }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.defaultAvatar]}>
                    <Ionicons name="paw" size={24} color="#adb5bd" />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.avatarContainer}>
                {item.otherUserImage ? (
                  <Image
                    source={{ uri: item.otherUserImage }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.defaultAvatar]}>
                    <MaterialIcons name="person" size={24} color="#adb5bd" />
                  </View>
                )}
              </View>
            )}

            <View style={styles.chatInfo}>
              {!item.isUserDogOwner ? (
                <>
                  <Text style={styles.primaryName}>{item.dogName}ちゃん</Text>
                  <Text style={styles.secondaryName}>
                    飼い主: {item.otherUserName}さん
                  </Text>
                </>
              ) : (
                <Text style={styles.primaryName}>{item.otherUserName}</Text>
              )}

              <Text
                style={[styles.lastMessage, isExpired && styles.expiredText]}
                numberOfLines={1}
              >
                {isExpired
                  ? "このチャットはクローズ済みです"
                  : item.lastMessage || "会話を始めましょう！"}
              </Text>
              {!isExpired && item.expiresAt && (
                <Text style={styles.expirationText}>
                  残り時間: {formatRemainingTime(item.expiresAt)}
                </Text>
              )}
            </View>

            {item.lastMessageAt && (
              <Text style={styles.timeStamp}>
                {formatTime(item.lastMessageAt)}
              </Text>
            )}
          </TouchableOpacity>
        </Swipeable>
      );
    },
    [navigateToChat]
  );

  const formatTime = useCallback((timestamp: Timestamp) => {
    if (!timestamp) return "";

    try {
      const date = timestamp.toDate();
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      if (diff < 24 * 60 * 60 * 1000) {
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
      }

      if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = ["日", "月", "火", "水", "木", "金", "土"];
        return days[date.getDay()] + "曜日";
      }

      return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "";
    }
  }, []);

  // 残り時間のフォーマット関数を追加
  const formatRemainingTime = useCallback((expiresAt: Timestamp) => {
    try {
      const now = new Date();
      const expireDate = expiresAt.toDate();
      const diffMs = expireDate.getTime() - now.getTime();

      // 残り時間が0以下の場合は「終了」と表示
      if (diffMs <= 0) {
        return "終了";
      }

      // 残り時間を分と秒で表示
      const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
      const diffMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
      if (diffHours > 0) {
        return `${diffHours}時間${diffMinutes}分`;
      } else {
        return `${diffMinutes}分`;
      }
    } catch (error) {
      console.error("Error formatting remaining time:", error);
      return "計算中...";
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4dabf7" />
        <Text style={styles.loadingText}>
          チャット一覧を読み込んでいます...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => setError(null)}
        >
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {chats.length > 0 && (
        <Text style={styles.instruction}>← スワイプで削除</Text>
      )}
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={64} color="#adb5bd" />
            <Text style={styles.emptyText}>チャットはありません</Text>
            <Text style={styles.emptySubtext}>
              マッチングが完了すると、ここにチャットが表示されます
            </Text>
          </View>
        }
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#868e96",
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#e03131",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#FF9500",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    backgroundColor: "#f1f3f5",
    justifyContent: "center",
    alignItems: "center",
  },
  chatInfo: {
    flex: 1,
  },
  primaryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#343a40",
    marginBottom: 4,
  },
  secondaryName: {
    fontSize: 14,
    color: "#868e96",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "#868e96",
  },
  timeStamp: {
    fontSize: 12,
    color: "#adb5bd",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#343a40",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#868e96",
    marginTop: 8,
    textAlign: "center",
  },
  expiredChatItem: {
    opacity: 0.6,
    backgroundColor: "#f8f9fa",
  },
  expiredText: {
    fontStyle: "italic",
    color: "#adb5bd",
  },
  expirationText: {
    fontSize: 12,
    color: "#fa5252",
    marginTop: 4,
  },
  instruction: {
    textAlign: "center",
    padding: 8,
    color: "#adb5bd",
    backgroundColor: "#f8f9fa",
    fontSize: 14,
  },
  deleteAction: {
    backgroundColor: "#ff6b6b",
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    height: "100%",
  },
});

export default ChatListScreen;
