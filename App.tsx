// App.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "./src/navigation/RootNavigator";
import { useAuthState } from "./src/hooks/useAuthState";
import { View, ActivityIndicator, Text } from 'react-native';

export default function App() {
  const { isAuthenticated } = useAuthState();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    // アプリの初期化処理
    async function prepare() {
      try {
        // 必要な初期化処理があればここで行う
        // 例: アセットの事前ロードなど
      } catch (e) {
        console.warn(e);
      } finally {
        // 初期化完了
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // アプリの準備ができていない場合はローディング画面を表示
  if (!appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
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
