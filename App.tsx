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

export default function App() {
  const { isAuthenticated } = useAuthState();
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
            const { type } = notification.request.content.data;
            console.log("通知を受信しました:", type);
          }
        );

        // 通知タップ時のリスナーを設定
        responseListener.current = addNotificationResponseReceivedListener(
          (response) => {
            const { type } = response.notification.request.content.data;
            console.log("通知がタップされました:", type);
            // ここで必要な画面遷移などの処理を追加
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
