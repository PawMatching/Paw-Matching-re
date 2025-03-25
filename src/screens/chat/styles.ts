// src/screens/chat/styles.ts
import { StyleSheet, Platform } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerContainer: {
    alignItems: "center",
    justifyContent: "center", // 追加
    width: "100%", // 追加：幅を確保
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#343a40",
    textAlign: "center", // 追加：テキストセンタリング
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#868e96",
    marginTop: 2,
    textAlign: "center", // 追加：テキストセンタリング
  },
  headerButton: {
    padding: 8,
  },
  // プラットフォーム固有のスタイル
  headerPlatformAdjust:
    Platform.select({
      ios: {
        paddingHorizontal: 8,
      },
      android: {
        paddingHorizontal: 16,
      },
    }) || {},
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
  backButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#FF9500",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: "80%",
  },
  userMessageContainer: {
    alignSelf: "flex-end",
  },
  otherMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  userMessageBubble: {
    backgroundColor: "#FF9500",
  },
  otherMessageBubble: {
    backgroundColor: "#f1f3f5",
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: "#fff",
  },
  otherMessageText: {
    color: "#343a40",
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  userMessageTime: {
    color: "#868e96",
    textAlign: "right",
  },
  otherMessageTime: {
    color: "#868e96",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 10 : 12,
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  timerContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
    alignItems: "center",
  },
  timerText: {
    fontSize: 14,
    color: "#495057",
    fontWeight: "500",
  },
  expiredBanner: {
    fontSize: 14,
    color: "#fa5252",
    fontWeight: "500",
  },
  disabledInputContainer: {
    backgroundColor: "#f8f9fa",
  },
  disabledInput: {
    backgroundColor: "#e9ecef",
    color: "#adb5bd",
  },
});
