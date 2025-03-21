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

// チャットのステータスを定数として定義
export const CHAT_STATUS = {
  ACTIVE: "active",
  CLOSED: "closed",
} as const;

// チャットステータスの型を定義
export type ChatStatus = (typeof CHAT_STATUS)[keyof typeof CHAT_STATUS];

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
  createdAt: Timestamp;
  status: ChatStatus;
  expiresAt: Timestamp;
  closedAt?: Timestamp;
  deletedBy?: { [key: string]: boolean };
  deletedAt?: { [key: string]: Timestamp };
}

export interface ChatWithDetails extends ChatData {
  otherUserName: string;
  otherUserImage: string | null;
  dogName: string;
  dogImage: string | null;
  isUserDogOwner: boolean;
}
