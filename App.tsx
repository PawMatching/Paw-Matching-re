// App.tsx
import React, { useState, useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "./src/navigation/RootNavigator";
import { useAuthState } from "./src/hooks/useAuthState";
import { View, ActivityIndicator, Text } from "react-native";
import * as Notifications from "expo-notifications";
import {
  registerForPushNotificationsAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from "./src/utils/notifications";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./src/config/firebase";

// 通知の表示方法を設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const { isAuthenticated, user } = useAuthState();
  const [appIsReady, setAppIsReady] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // アプリの初期化処理
    async function prepare() {
      try {
        // プッシュ通知の初期化
        const token = await registerForPushNotificationsAsync();
        setExpoPushToken(token);

        // 通知受信時のリスナーを設定
        notificationListener.current = addNotificationReceivedListener(
          (notification) => {
            const { type } = notification.request.content.data as {
              type: string;
            };
            console.log("通知を受信しました:", type);
          }
        );

        // 通知タップ時のリスナーを設定
        responseListener.current = addNotificationResponseReceivedListener(
          (response) => {
            const { type } = response.notification.request.content.data as {
              type: string;
            };
            console.log("通知がタップされました:", type);
            // TODO: 通知タイプに応じた画面遷移を実装
          }
        );
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();

    // クリーンアップ関数
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // ユーザーのログイン状態が変更されたときにトークンを保存
  useEffect(() => {
    async function saveToken() {
      if (user && expoPushToken) {
        try {
          await setDoc(
            doc(db, "users", user.uid),
            {
              expoPushToken,
              lastTokenUpdate: new Date(),
            },
            { merge: true }
          );
          console.log("Expoトークンを保存しました");
        } catch (error) {
          console.error("Expoトークンの保存に失敗しました:", error);
        }
      }
    }

    saveToken();
  }, [user, expoPushToken]);

  // アプリの準備ができていない場合はローディング画面を表示
  if (!appIsReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#4dabf7" />
        <Text style={{ marginTop: 10 }}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <RootNavigator initialAuthenticated={isAuthenticated} />
    </NavigationContainer>
  );
}
