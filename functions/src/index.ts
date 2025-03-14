/**
 * Import function triggers from their respective submodules:
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// functions/src/index.ts
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

// もふもふリクエスト受信時の通知
export const onMofumofuRequest = functions.firestore
  .document("applies/{applyId}")
  .onCreate(async (snap, context) => {
    const apply = snap.data();
    if (!apply) return;

    const applyId = context.params.applyId;

    // リクエスト受信者の情報を取得
    const receiverDoc = await admin
      .firestore()
      .collection("users")
      .doc(apply.dogOwnerID)
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
      .doc(apply.userID)
      .get();
    const senderData = senderDoc.data();

    // 通知を送信
    await sendPushNotification(
      expoPushToken,
      "もふもふリクエスト",
      `${senderData?.name || "ユーザー"}さんからもふもふリクエストが届きました`,
      {
        type: "mofumofuRequest",
        applyId,
        senderId: apply.userID,
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

    const dogOwnerId = match.dogOwnerID;
    const pettingUserId = match.pettingUserID;

    // 両方のユーザーIDが存在するか確認
    if (!dogOwnerId || !pettingUserId) {
      logger.info("ユーザーIDが見つかりません", {matchId});
      return;
    }

    // 通知を送信するユーザーIDの配列
    const userIds = [dogOwnerId, pettingUserId];

    // マッチングした両方のユーザーに通知を送信
    for (const userId of userIds) {
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .get();
      const userData = userDoc.data();
      const expoPushToken = userData?.expoPushToken;

      if (!expoPushToken) {
        logger.info("プッシュトークンがありません", {userId});
        continue;
      }

      // 相手のユーザーIDを取得
      const otherUserId = userId === dogOwnerId ? pettingUserId : dogOwnerId;
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

// チャットメッセージ受信時の通知 (修正版)
export const onNewChatMessage = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    if (!message) return;

    const chatId = context.params.chatId;
    const senderId = message.senderId;

    if (!senderId) {
      logger.info("送信者IDが見つかりません");
      return;
    }

    // メッセージ送信者の情報を取得
    const senderDoc = await admin
      .firestore()
      .collection("users")
      .doc(senderId)
      .get();
    const senderData = senderDoc.data();

    // チャットドキュメントを取得
    const chatDoc = await admin
      .firestore()
      .collection("chats")
      .doc(chatId)
      .get();

    if (!chatDoc.exists) {
      logger.info("チャットドキュメントが見つかりません");
      return;
    }

    const chatData = chatDoc.data();

    // チャットデータからdogOwnerIDとpettingUserIDを取得
    const dogOwnerId = chatData?.dogOwnerID;
    const pettingUserId = chatData?.pettingUserID;

    if (!dogOwnerId || !pettingUserId) {
      logger.info("ユーザーIDが見つかりません");
      return;
    }

    // 送信者と受信者を特定
    const receiverId = senderId === dogOwnerId ? pettingUserId : dogOwnerId;

    // 受信者のExpoトークンを取得
    const receiverDoc = await admin
      .firestore()
      .collection("users")
      .doc(receiverId)
      .get();

    const receiverData = receiverDoc.data();
    const expoPushToken = receiverData?.expoPushToken;

    if (!expoPushToken) {
      logger.info("受信者のExpoトークンが見つかりません", {receiverId});
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
        senderId: senderId,
      }
    );
  });
