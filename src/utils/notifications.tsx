// src/utils/notifications.tsx
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform, Linking } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 通知の表示方法の設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 通知データの型定義
export type NotificationType =
  | "mofumofuRequest"
  | "match"
  | "chatMessage"
  | "test";

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
export const registerForPushNotifications = async (): Promise<
  string | null
> => {
  try {
    console.log("プッシュ通知の登録を開始します...");
    console.log("デバイス情報:", {
      isDevice: Device.isDevice,
      platform: Platform.OS,
      model: Device.modelName,
      brand: Device.brand,
      osVersion: Device.osVersion,
      osBuildId: Device.osBuildId,
    });

    if (!Device.isDevice) {
      console.warn("プッシュ通知は実機デバイスでのみ利用可能です");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    console.log("現在の通知権限状態:", existingStatus);

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("通知権限をリクエストします...");
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
          allowCriticalAlerts: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
      console.log("通知権限のリクエスト結果:", status);
    }

    if (finalStatus !== "granted") {
      console.warn(
        "通知の許可が得られませんでした。設定から手動で許可してください。"
      );
      // 設定画面を開くためのリンクを表示
      if (Platform.OS === "ios") {
        Linking.openSettings();
      }
      return null;
    }

    console.log("Expoプッシュトークンを取得します...");
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    console.log("取得したトークンデータ:", tokenData);

    if (!tokenData?.data) {
      console.warn("トークンデータが不正です");
      return null;
    }

    const token = tokenData.data;
    console.log("取得したトークン:", token);

    // トークンをAsyncStorageに保存
    try {
      await AsyncStorage.setItem("expoPushToken", token);
      console.log("トークンをAsyncStorageに保存しました");
    } catch (error) {
      console.error("AsyncStorageへの保存に失敗:", error);
    }

    return token;
  } catch (error) {
    console.error("プッシュ通知の登録に失敗しました:", error);
    return null;
  }
};

/**
 * プッシュ通知トークンをクリアする
 */
export const clearPushNotificationToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("expoPushToken");
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error("プッシュ通知トークンのクリアに失敗しました:", error);
  }
};

/**
 * 現在のプッシュ通知トークンを取得する
 */
export const getCurrentPushToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem("expoPushToken");
  } catch (error) {
    console.error("プッシュ通知トークンの取得に失敗しました:", error);
    return null;
  }
};

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
