/**
 * Import function triggers from their respective submodules:
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();

/**
 * プッシュ通知を送信する共通関数
 * @param {string} to - 送信先のExpoトークン
 * @param {string} title - 通知のタイトル
 * @param {string} body - 通知の本文
 * @param {Record<string, unknown>} data - 通知に添付するデータ
 * @return {Promise<unknown>} 送信結果
 */
async function sendPushNotification(
  to: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<unknown> {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        title,
        body,
        data,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    logger.info("Push notification sent:", result);
    return result;
  } catch (error) {
    logger.error("Error sending push notification:", error);
    throw error;
  }
}

// チャットメッセージ受信時の通知
export const onNewChatMessage = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    if (!message) return;

    const chatId = context.params.chatId;

    // メッセージ送信者の情報を取得
    const senderDoc = await admin
      .firestore()
      .collection("users")
      .doc(message.senderId)
      .get();
    const senderData = senderDoc.data();

    // チャットの受信者を取得
    const chatDoc = await admin
      .firestore()
      .collection("chats")
      .doc(chatId)
      .get();
    const chatData = chatDoc.data();
    const receiverId = chatData?.participants.find(
      (id: string) => id !== message.senderId
    );

    if (!receiverId) {
      logger.info("Receiver not found");
      return;
    }

    // 受信者のExpoトークンを取得
    const receiverDoc = await admin
      .firestore()
      .collection("users")
      .doc(receiverId)
      .get();
    const receiverData = receiverDoc.data();
    const expoPushToken = receiverData?.expoPushToken;

    if (!expoPushToken) {
      logger.info("Receiver has no Expo push token");
      return;
    }

    // 通知を送信
    await sendPushNotification(
      expoPushToken,
      "新しいメッセージ",
      `${senderData?.name || "ユーザー"}さんからメッセージが届きました`,
      {
        type: "chatMessage",
        chatId,
        messageId: context.params.messageId,
        senderId: message.senderId,
      }
    );
  });

// マッチング成立時の通知
export const onMatchCreated = functions.firestore
  .document("matches/{matchId}")
  .onCreate(async (snap, context) => {
    const match = snap.data();
    if (!match) return;

    const matchId = context.params.matchId;

    // マッチングした両方のユーザーに通知を送信
    for (const userId of match.participants) {
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .get();
      const userData = userDoc.data();
      const expoPushToken = userData?.expoPushToken;

      if (!expoPushToken) continue;

      const otherUserId = match.participants.find(
        (id: string) => id !== userId
      );
      const otherUserDoc = await admin
        .firestore()
        .collection("users")
        .doc(otherUserId)
        .get();
      const otherUserData = otherUserDoc.data();

      await sendPushNotification(
        expoPushToken,
        "マッチング成立",
        `${otherUserData?.name || "ユーザー"}さんとマッチングしました！`,
        {
          type: "match",
          matchId,
          otherUserId,
        }
      );
    }
  });

// もふもふリクエスト受信時の通知
export const onMofumofuRequest = functions.firestore
  .document("mofumofuRequests/{requestId}")
  .onCreate(async (snap, context) => {
    const request = snap.data();
    if (!request) return;

    const requestId = context.params.requestId;

    // リクエスト受信者の情報を取得
    const receiverDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.receiverId)
      .get();
    const receiverData = receiverDoc.data();
    const expoPushToken = receiverData?.expoPushToken;

    if (!expoPushToken) {
      logger.info("Receiver has no Expo push token");
      return;
    }

    // 送信者の情報を取得
    const senderDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.senderId)
      .get();
    const senderData = senderDoc.data();

    // 通知を送信
    await sendPushNotification(
      expoPushToken,
      "もふもふリクエスト",
      `${senderData?.name || "ユーザー"}さんからもふもふリクエストが届きました`,
      {
        type: "mofumofuRequest",
        requestId,
        senderId: request.senderId,
      }
    );
  });
