// src/screens/chat/ChatScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { styles } from "./styles";
import { ChatStackParamList } from "../../navigation/types";
import { Message, ChatData, CHAT_STATUS } from "../../types/chat";
import { SafeAreaView } from "react-native-safe-area-context";

const ChatScreen = () => {
  const route = useRoute<RouteProp<ChatStackParamList, "ChatScreen">>();
  const navigation = useNavigation();
  const params = route.params || {};
  const { matchId, chatId, dogId, otherUserId } = params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [otherUserName, setOtherUserName] = useState<string>("");
  const [dogName, setDogName] = useState<string>("");
  const [isOtherUserOwner, setIsOtherUserOwner] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [remainingTime, setRemainingTime] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const db = getFirestore();

  // ヘッダーの設定
  useEffect(() => {
    const fetchUserAndDogInfo = async () => {
      if (!otherUserId || !dogId) return;

      try {
        // 犬の情報を先に取得
        const dogDoc = await getDoc(doc(db, "dogs", dogId));
        const dogData = dogDoc.exists() ? dogDoc.data() : null;

        // 犬の名前を設定
        if (dogData) {
          setDogName(dogData.dogname || "不明な犬");
        }

        // ユーザー情報の取得
        const userDoc = await getDoc(doc(db, "users", otherUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // 名前の取得方法を修正
          const userName =
            userData.displayName || userData.name || "匿名ユーザー";
          setOtherUserName(userName);

          // デバッグ用
          console.log("取得したユーザー情報:", userData);
          console.log("設定する名前:", userName);

          // 相手がisOwnerで、かつその犬の飼い主である場合のみtrue
          setIsOtherUserOwner(
            userData.isOwner && dogData?.userID === otherUserId
          );
        }
      } catch (error) {
        console.error("Error fetching user and dog info:", error);
      }
    };

    fetchUserAndDogInfo();
  }, [otherUserId, dogId, db]);

  // チャットの初期化
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    const initializeChat = async () => {
      try {
        // 必要なパラメータが不足している場合は早期リターン
        if (!matchId && !chatId) {
          setInitializing(false);
          return;
        }

        // チャットIDがある場合は既存のチャットを取得
        if (chatId) {
          const chatRef = doc(db, "chats", chatId);
          const chatSnap = await getDoc(chatRef);

          if (chatSnap.exists() && isMounted) {
            setChatData({ id: chatSnap.id, ...chatSnap.data() } as ChatData);
          }
        }
        // チャットIDがない場合は新規作成
        else if (matchId) {
          const matchRef = doc(db, "matches", matchId);
          const matchSnap = await getDoc(matchRef);

          if (matchSnap.exists() && isMounted) {
            const matchData = matchSnap.data();

            // 新しいチャットドキュメントを作成
            const newChatRef = doc(collection(db, "chats"));
            // 2時間後の日時を計算
            const twoHoursLater = new Date();
            twoHoursLater.setHours(twoHoursLater.getHours() + 2);

            const fullChatData: ChatData = {
              id: newChatRef.id,
              chatID: newChatRef.id,
              dogID: dogId || "",
              matchID: matchId || "",
              dogOwnerID: matchData.dogOwnerID,
              pettingUserID: matchData.pettingUserID,
              lastMessageAt: Timestamp.now(),
              lastMessage: null,
              lastMessageTime: null,
              createdAt: Timestamp.now(),
              status: CHAT_STATUS.ACTIVE,
              expiresAt: Timestamp.fromDate(twoHoursLater),
            };

            await setDoc(newChatRef, fullChatData);

            // matchesのドキュメントにchatIdを追加
            await updateDoc(matchRef, {
              chatId: newChatRef.id,
            });

            if (isMounted) {
              setChatData(fullChatData);
              // ナビゲーションパラメータのchatIdを更新
              navigation.setParams({ chatId: newChatRef.id } as never);
            }
          }
        }

        if (isMounted) {
          setInitializing(false);
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
        if (isMounted) {
          setInitializing(false);
        }
      }
    };

    initializeChat();

    return () => {
      isMounted = false;
    };
  }, [currentUser, chatId, matchId, dogId, db, navigation, otherUserId]);

  // チャットの有効期限を監視
  useEffect(() => {
    if (!chatData) return;

    const checkStatus = () => {
      // すでにクローズ済みかチェック
      if (chatData.status === CHAT_STATUS.CLOSED) {
        setIsExpired(true);
        return;
      }

      const now = new Date();
      let expireDate: Date;

      // 有効期限を取得
      if (chatData.expiresAt) {
        // 既に設定されている場合
        expireDate = chatData.expiresAt.toDate();
      } else if (chatData.createdAt) {
        // createdAtから2時間後を計算
        expireDate = new Date(chatData.createdAt.toDate());
        expireDate.setHours(expireDate.getHours() + 2);

        // Firestoreにも保存
        const chatRef = doc(db, "chats", chatData.id);
        updateDoc(chatRef, {
          expiresAt: Timestamp.fromDate(expireDate),
        }).catch((err) => console.error("expiresAtの更新に失敗:", err));
      } else {
        // どちらもない場合は現在から2時間後
        expireDate = new Date();
        expireDate.setHours(expireDate.getHours() + 2);
      }

      // 期限切れかチェック
      if (now >= expireDate) {
        setIsExpired(true);

        // Firestoreも更新
        const chatRef = doc(db, "chats", chatData.id);
        updateDoc(chatRef, {
          status: CHAT_STATUS.CLOSED,
          closedAt: serverTimestamp(),
        }).catch((err) => console.error("チャットクローズの更新失敗:", err));

        return;
      }

      // 残り時間を計算して表示
      const diffMs = expireDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffSeconds = Math.floor((diffMs % 60000) / 1000);

      // 1時間以上の場合は時間も表示
      let timeStr = "";
      if (diffMinutes >= 60) {
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        timeStr = `${hours}時間${minutes}分`;
      } else {
        timeStr = `${diffMinutes}分${diffSeconds}秒`;
      }

      setRemainingTime(timeStr);
      setIsExpired(false);
      return false;
    };

    // 初回チェック
    checkStatus();
    const timer = setInterval(checkStatus, 1000);

    return () => clearInterval(timer);
  }, [chatData]);

  // メッセージをリアルタイムで監視
  useEffect(() => {
    if (!currentUser || initializing || !chatData) return;

    const chatDocumentId = chatData.chatID || chatData.id;

    if (!chatDocumentId) {
      console.error("Chat document ID is missing");
      setLoading(false);
      return;
    }

    setLoading(true);

    const messagesRef = collection(db, "chats", chatDocumentId, "messages");
    const messagesQuery = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList: Message[] = [];

      snapshot.forEach((doc) => {
        messagesList.push({
          id: doc.id,
          ...doc.data(),
        } as Message);
      });

      setMessages(messagesList);
      setLoading(false);

      // 未読メッセージを既読に更新
      snapshot.docs.forEach(async (doc) => {
        const messageData = doc.data();
        if (messageData.senderID !== currentUser.uid && !messageData.read) {
          await updateDoc(doc.ref, { read: true });
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, chatData, initializing, db]);

  // ヘッダー設定
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>
            {otherUserName}さんとのチャット
          </Text>
          {isOtherUserOwner && dogName && (
            <Text style={styles.headerSubtitle}>{dogName}の飼い主さん</Text>
          )}
          {!isOtherUserOwner && (
            <Text style={styles.headerSubtitle}>モフモフ申請者</Text>
          )}
        </View>
      ),
      headerTitleAlign: "center" as const,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={24} color="#4dabf7" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, otherUserName, dogName, isOtherUserOwner]);

  // メッセージ送信処理
  const sendMessage = async () => {
    if (!currentUser || !chatData || !newMessage.trim()) return;

    const chatDocumentId = chatData.chatID || chatData.id;

    if (!chatDocumentId) {
      console.error("Chat document ID is missing");
      return;
    }

    Keyboard.dismiss();

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      // messagesサブコレクションにドキュメントを追加
      const messagesRef = collection(db, "chats", chatDocumentId, "messages");
      await addDoc(messagesRef, {
        text: messageText,
        createdAt: serverTimestamp(),
        senderID: currentUser.uid,
        read: false,
      });

      // chatsドキュメントのlastMessageAtを更新
      const chatRef = doc(db, "chats", chatDocumentId);
      await updateDoc(chatRef, {
        lastMessageAt: serverTimestamp(),
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // メッセージアイテムの表示
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderID === currentUser?.uid;

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser
            ? styles.userMessageContainer
            : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isCurrentUser
              ? styles.userMessageBubble
              : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.userMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>
        </View>

        <Text
          style={[
            styles.messageTime,
            isCurrentUser ? styles.userMessageTime : styles.otherMessageTime,
          ]}
        >
          {formatTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  // 時間フォーマット
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";

    const date = timestamp.toDate();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
  };

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4dabf7" />
        <Text style={styles.loadingText}>チャットを準備しています...</Text>
      </View>
    );
  }

  if (!chatData) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-outline" size={64} color="#adb5bd" />
        <Text style={styles.emptyText}>チャットが見つかりませんでした</Text>
        <Text style={styles.emptySubtext}>
          マッチングが完了していないか、チャットデータが存在しません。
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4dabf7" />
            <Text style={styles.loadingText}>
              メッセージを読み込んでいます...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.timerContainer}>
              {isExpired ? (
                <Text style={styles.expiredBanner}>
                  このチャットは終了しました
                </Text>
              ) : (
                <Text style={styles.timerText}>
                  残り時間：{remainingTime || "計算中…"}
                </Text>
              )}
            </View>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.id}
              inverted
              contentContainerStyle={styles.messagesContainer}
            />
          </>
        )}

        <View
          style={[
            styles.inputContainer,
            Platform.OS === "ios" && { paddingBottom: 0 },
            isExpired && styles.disabledInputContainer, // 期限切れ時のスタイルを追加
          ]}
        >
          <TextInput
            style={[styles.input, isExpired && styles.disabledInput]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={
              isExpired ? "チャットは終了しました" : "メッセージを入力..."
            }
            placeholderTextColor={isExpired ? "#adb5bd" : "#adb5bd"}
            multiline
            editable={!isExpired} // 期限切れの場合は編集不可にする
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || isExpired) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || isExpired}
          >
            <Ionicons
              name="send"
              size={24}
              color={newMessage.trim() && !isExpired ? "#4dabf7" : "#adb5bd"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
