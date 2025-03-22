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

// チャットメッセージ受信時の通知
export const onNewChatMessage = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    if (!message) return;

    const chatId = context.params.chatId;
    const senderId = message.senderID;

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

// 10分ごとに実行されるスケジュール関数
export const resetWalkingStatus = functions.pubsub
  .schedule("*/10 * * * *") // 10分ごと →コストに応じて30分ごととかに変更すべきかも
  .onRun(async () => {
    try {
      const db = admin.firestore();
      const rtdb = admin.database();

      // 1時間前の時刻を計算
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      // isWalkingがtrueで、最終更新が1時間以上前の犬を検索
      const dogsSnapshot = await db
        .collection("dogs")
        .where("isWalking", "==", true)
        .where("lastWalkingStatusUpdate", "<", oneHourAgo)
        .get();

      // 一括更新のためのバッチを作成
      const batch = db.batch();
      const updates: Promise<void>[] = [];

      console.log(`更新対象の犬: ${dogsSnapshot.size}匹`);

      // 各犬のisWalkingステータスを更新
      dogsSnapshot.forEach((dogDoc) => {
        const dogId = dogDoc.id;
        console.log(`犬ID: ${dogId} のお散歩ステータスをリセットします`);

        // Firestoreの更新
        batch.update(dogDoc.ref, {
          isWalking: false,
          lastWalkingStatusUpdate: new Date(),
        });

        // Realtime Databaseの更新も行う
        const rtdbUpdate = rtdb.ref(`locations/dogs/${dogId}`).update({
          isWalking: false,
          lastUpdated: new Date().toISOString(),
        });

        updates.push(rtdbUpdate);
      });
      // Firestoreのバッチを実行
      await batch.commit();

      // Realtime Databaseの更新を待機
      if (updates.length > 0) {
        await Promise.all(updates);
      }

      console.log(
        `${dogsSnapshot.size}匹の犬のお散歩ステータスをリセットしました`
      );
      return null;
    } catch (error) {
      console.error(
        "お散歩ステータスのリセット中にエラーが発生しました:",
        error
      );
      return null;
    }
  });

// クリーンアップ関数を統合してみる
export const cleanupPendingRequests = functions.pubsub
  .schedule("0 */2 * * *") // 2時間ごとに実行
  .timeZone("Asia/Tokyo")
  .onRun(async () => {
    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();

      // 1. 日付変更時の処理（古い仕様）- 当日中に期限切れの申請を処理
      const today = new Date(now.toDate());
      today.setHours(23, 59, 59, 999); // その日の23:59:59.999に設定

      const expiredToday = await db
        .collection("applies")
        .where("status", "==", "pending")
        .where("expiresAt", "<", today)
        .get();

      // 2. 2時間経過した申請を処理（新しい仕様）
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const oldPending = await db
        .collection("applies")
        .where("status", "==", "pending")
        .where("appliedAt", "<", twoHoursAgo)
        .get();

      // バッチ処理で一括更新
      const batch = db.batch();

      // 当日中に期限切れの申請を処理
      if (!expiredToday.empty) {
        expiredToday.docs.forEach((doc) => {
          batch.update(doc.ref, {
            status: "rejected",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            autoRejected: true,
            rejectionReason: "期限切れのため自動的に拒否されました",
          });
        });
        logger.info(`${expiredToday.size}件の期限切れモフモフ申請をrejectしました`);
      }

      // 2時間経過した申請を処理
      if (!oldPending.empty) {
        oldPending.docs.forEach((doc) => {
          batch.update(doc.ref, {
            status: "rejected",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            autoRejected: true,
            rejectionReason: "2時間経過のため自動的に拒否されました",
          });
        });
        logger.info(`${oldPending.size}件の2時間以上経過したpending申請をrejectしました`);
      }
      // 両方の条件に一致する申請がない場合はバッチ処理をスキップ
      if (expiredToday.empty && oldPending.empty) {
        logger.info("処理対象のモフモフ申請はありません");
        return null;
      }
      // バッチ処理を実行
      await batch.commit();
      return null;
    } catch (error) {
      logger.error("モフモフ申請の自動拒否処理中にエラーが発生しました:", error);
      return null;
    }
  });
