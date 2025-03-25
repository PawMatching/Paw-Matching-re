// App.tsx
import React, { useState, useEffect, useRef } from "react";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "./src/navigation/RootNavigator";
import { useAuthState } from "./src/hooks/useAuthState";
import { View, ActivityIndicator, Text } from "react-native";
import * as Notifications from "expo-notifications";
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  removeNotificationSubscription,
} from "./src/utils/notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

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
    // 受信リスナー（バックグラウンドで通知を受けた時）
    const notificationListener = addNotificationReceivedListener(
      (notification) => {
        console.log("通知を受信:", notification.request.content);
        // 必要な処理があればここに追加
      }
    );

    // タップリスナー（通知をタップした時）
    const responseListener = addNotificationResponseReceivedListener(
      (response) => {
        console.log("通知がタップされました:", response.notification.request.content);
        
        const { type, data } = response.notification.request.content.data as {
          type: string;
          data: any;
        };

        // タイプに応じたナビゲーション処理
        switch (type) {
          case "chat":
          case "chatMessage":
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
          case "mofumofuRequest":
            navigation.navigate("Mofumofu", {
              screen: "MofumofuDetail",
              params: { requestId: data.requestId },
            });
            break;
          default:
            console.warn("未対応の通知タイプ:", type);
        }
      }
    );

    // クリーンアップ関数
    return () => {
      removeNotificationSubscription(notificationListener);
      removeNotificationSubscription(responseListener);
    };
  }, [navigation]);

  return null;
}

export default function App() {
  const { isAuthenticated } = useAuthState();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    // アプリの初期化処理
    async function prepare() {
      try {
        // アプリ初期化処理
        // アニメーションなどがある場合はここで処理
        await new Promise(resolve => setTimeout(resolve, 200)); // 短い遅延で初期化を模倣
      } catch (e) {
        console.warn("アプリ初期化エラー:", e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
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
        <Text style={{ marginTop: 10 }}>アプリを起動中...</Text>
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
