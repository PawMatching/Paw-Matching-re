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
}
