// src/types/chat.ts
import { Timestamp } from "firebase/firestore";

export interface Match {
  chatId?: string;
  dogID: string;
  dogOwnerID: string;
  pettingUserID: string;
  status: "active" | "completed" | "canceled";
  createdAt: Timestamp;
}

export interface Message {
  id: string;
  text: string;
  createdAt: Timestamp;
  senderID: string;
  read: boolean;
}

export interface ChatData {
  id: string;
  chatID: string;
  dogID: string;
  matchID: string;
  dogOwnerID: string;
  pettingUserID: string;
  lastMessageAt: Timestamp;
  lastMessage: string | null;
  lastMessageTime: Timestamp | null;
  createdAt: Timestamp; // 追加
  status: "active" | "closed"; // 追加
  expiresAt: Timestamp; // 追加
  closedAt?: Timestamp; // 追加（オプショナル）
}

export interface ChatWithDetails extends ChatData {
  otherUserName: string;
  otherUserImage: string | null;
  dogName: string;
  dogImage: string | null;
  isUserDogOwner: boolean;
}
