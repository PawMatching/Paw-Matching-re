// App.tsx
import React, { useState, useEffect, useRef } from "react";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
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
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

type RootStackParamList = {
  Chat: {
    screen: string;
    params: { matchId: string };
  };
  Match: {
    screen: string;
    params: { matchId: string };
  };
  Mofumofu: {
    screen: string;
    params: { requestId: string };
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 通知の表示方法を設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 通知タップ時の画面遷移を処理するコンポーネント
function NotificationHandler() {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { type, data } = response.notification.request.content.data as {
          type: string;
          data: any;
        };

        switch (type) {
          case "chat":
            navigation.navigate("Chat", {
              screen: "ChatRoom",
              params: { matchId: data.matchId },
            });
            break;
          case "match":
            navigation.navigate("Match", {
              screen: "MatchDetail",
              params: { matchId: data.matchId },
            });
            break;
          case "mofumofu":
            navigation.navigate("Mofumofu", {
              screen: "MofumofuDetail",
              params: { requestId: data.requestId },
            });
            break;
          default:
            console.log("未対応の通知タイプ:", type);
        }
      }
    );

    return () => subscription.remove();
  }, [navigation]);

  return null;
}

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <NotificationHandler />
        <RootNavigator initialAuthenticated={isAuthenticated} />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
