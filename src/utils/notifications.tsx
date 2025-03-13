import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

// 通知の表示方法の設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 通知データの型定義
export type NotificationType = "mofumofuRequest" | "match" | "chatMessage" | "test";

// カスタム通知データの型定義
export interface NotificationData {
  type?: NotificationType;
  requestId?: string;
  matchId?: string;
  chatId?: string;
  senderId?: string;
  message?: string;
  [key: string]: string | undefined;
}

/**
 * 通知のパーミッションを取得し、Expoプッシュトークンを返す
 * @returns プッシュ通知トークン
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // 実機デバイスかどうかチェック
  if (!Device.isDevice) {
    console.log("プッシュ通知は実機デバイスでのみ利用可能です");
    return null;
  }

  // 既存のパーミッション状態を確認
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // まだ許可されていない場合、ユーザーに許可を求める
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // 許可が得られなかった場合
  if (finalStatus !== "granted") {
    console.log("通知の許可が得られませんでした");
    return null;
  }

  // Expoプッシュトークンを取得
  try {
    // プロジェクトIDが存在する場合はそれを使用
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    
    const tokenOptions: Notifications.ExpoPushTokenOptions | undefined = 
      projectId ? { projectId } : undefined;
    
    const response = await Notifications.getExpoPushTokenAsync(tokenOptions);
    token = response.data;
    console.log("プッシュトークン:", token);
  } catch (error) {
    console.error("プッシュトークン取得エラー:", error);
    return null;
  }

  // Androidの場合、通知チャンネルを設定
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "デフォルト",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}

/**
 * ローカル通知をスケジュール
 * @param title 通知タイトル
 * @param body 通知本文
 * @param data 通知に添付するデータ
 * @param seconds 何秒後に通知を表示するか
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: NotificationData = {},
  seconds: number = 2
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: {
      seconds,
      type: "timeInterval",
    } as Notifications.TimeIntervalTriggerInput,
  });
}

/**
 * 通知受信リスナーを設定
 * @param callback 通知受信時のコールバック関数
 * @returns 購読解除用のリスナーオブジェクト
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * 通知レスポンス（タップ）リスナーを設定
 * @param callback 通知タップ時のコールバック関数
 * @returns 購読解除用のリスナーオブジェクト
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * リスナーの購読を解除
 * @param subscription 購読オブジェクト
 */
export function removeNotificationSubscription(
  subscription: Notifications.Subscription
): void {
  Notifications.removeNotificationSubscription(subscription);
}

/**
 * 全ての予定された通知をキャンセル
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * バッジ数を設定
 * @param number バッジ数
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * バッジ数を取得
 * @returns 現在のバッジ数
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}
