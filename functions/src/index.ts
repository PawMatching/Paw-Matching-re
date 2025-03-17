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

// 1時間ごとに実行されるスケジュール関数
export const resetWalkingStatus = functions.pubsub
  .schedule("every 30 minutes") // コストに応じてここは30分ごとに変更
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
        const rtdbUpdate = rtdb
          .ref(`locations/dogs/${dogId}`)
          .update({
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

      console.log(`${dogsSnapshot.size}匹の犬のお散歩ステータスをリセットしました`);
      return null;
    } catch (error) {
      console.error("お散歩ステータスのリセット中にエラーが発生しました:", error);
      return null;
    }
  });

// 未処理のモフモフ申請を一日の終わりにrejectする関数
export const cleanupPendingRequests = functions.pubsub
  .schedule("0 0 * * *") // 毎日午前0時に実行（UTCタイムゾーン）
  .timeZone("Asia/Tokyo") // 日本時間に設定
  .onRun(async () => {
    try {
      const db = admin.firestore();

      // 現在の日付の終わりを計算
      const now = admin.firestore.Timestamp.now();
      const today = new Date(now.toDate());
      today.setHours(23, 59, 59, 999); // その日の23:59:59.999に設定

      // 期限切れの申請を検索
      const snapshot = await db
        .collection("applies")
        .where("status", "==", "pending")
        .where("expiresAt", "<", today)
        .get();

      if (snapshot.empty) {
        logger.info("期限切れのモフモフ申請はありません");
        return null;
      }

      // バッチ処理で一括更新
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "rejected",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          autoRejected: true, // 自動拒否されたことを示すフラグ
          rejectionReason: "期限切れのため自動的に拒否されました",
        });
      });

      await batch.commit();
      logger.info(`${snapshot.size}件の期限切れモフモフ申請をrejectしました`);
      return null;
    } catch (error) {
      logger.error("モフモフ申請の自動拒否処理中にエラーが発生しました:", error);
      return null;
    }
  });

// チャット作成時に2時間後の自動クローズを設定
export const scheduleChatExpiration = functions.firestore
  .document("chats/{chatId}")
  .onCreate(async (snap, context) => {
    const chatData = snap.data();
    if (!chatData) return;

    const chatId = context.params.chatId;

    try {
    // 現在のタイムスタンプを取得
      const createdAt = chatData.createdAt || admin.firestore.Timestamp.now();

      // 2時間後の時刻を計算
      const expiresAt = new Date(createdAt.toDate());
      expiresAt.setHours(expiresAt.getHours() + 2);

      // チャットドキュメントを更新して有効期限を追加
      await admin.firestore().collection("chats").doc(chatId).update({
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        status: "active", // 初期状態
      });

      logger.info(`チャット ${chatId} の有効期限を設定しました: ${expiresAt}`);

      // Pub/Subメッセージを予約して2時間後にチャットを閉じる
      const message = {
        chatId: chatId,
      };

      // トピックに発行（これはオプション1 - Pub/Subを使用する場合）
      // const topic = "expire-chat";
      // await admin.pubsub().topic(topic).publishMessage({ json: message });

      // オプション2: スケジュールされたタスクを使用（ここではFirestore自体を使用）
      await admin.firestore().collection("scheduledTasks").add({
        type: "chatExpiration",
        chatId: chatId,
        executeAt: admin.firestore.Timestamp.fromDate(expiresAt),
        status: "pending",
      });
    } catch (error) {
      logger.error(`チャット ${chatId} の有効期限設定中にエラーが発生しました:`, error);
    }
  });

// スケジュールされたタスクを処理する関数（5分ごとに実行）
export const processScheduledTasks = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    try {
      // 実行時刻が来たタスクを検索
      const tasksSnapshot = await admin.firestore()
        .collection("scheduledTasks")
        .where("status", "==", "pending")
        .where("executeAt", "<=", now)
        .get();

      if (tasksSnapshot.empty) {
        logger.info("実行すべきスケジュールタスクはありません");
        return null;
      }

      const batch = admin.firestore().batch();
      const promises = [];

      // 各タスクを処理
      for (const taskDoc of tasksSnapshot.docs) {
        const task = taskDoc.data();

        if (task.type === "chatExpiration" && task.chatId) {
          // チャットを閉じる処理
          // eslint-disable-next-line max-len
          const chatRef = admin.firestore().collection("chats").doc(task.chatId);
          promises.push(
            // チャットの状態を確認
            chatRef.get().then((chatDoc) => {
              if (chatDoc.exists) {
                // チャットを閉じる（状態を変更）
                batch.update(chatRef, {
                  status: "closed",
                  closedAt: now,
                });
                // タスクをcompletedにする
                batch.update(taskDoc.ref, {
                  status: "completed",
                  processedAt: now,
                });
                logger.info(`チャット ${task.chatId} を自動的に閉じました`);
              } else {
                // チャットが見つからない場合
                batch.update(taskDoc.ref, {
                  status: "failed",
                  error: "チャットが見つかりません",
                  processedAt: now,
                });
              }
            })
          );
        }
      }
      // すべてのチャット確認が完了するのを待つ
      await Promise.all(promises);
      // バッチ更新を実行
      await batch.commit();
      logger.info(`${tasksSnapshot.size}件のスケジュールタスクを処理しました`);
      return null;
    } catch (error) {
      logger.error("スケジュールタスク処理中にエラーが発生しました:", error);
      return null;
    }
  });
