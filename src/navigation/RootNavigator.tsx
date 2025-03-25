// src/navigation/RootNavigator.tsx
import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import AuthStackNavigator from "./stacks/AuthStackNavigator";
import TabNavigator from "./TabNavigator";
import { useAuthState } from "../hooks/useAuthState";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  initialAuthenticated?: boolean;
};

const RootNavigator: React.FC<RootNavigatorProps> = ({ initialAuthenticated }) => {
  const { isAuthenticated, loading } = useAuthState();
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [userAuthenticated, setUserAuthenticated] = useState(initialAuthenticated || false);

  // ログの追加
  useEffect(() => {
    console.log("RootNavigator - loading状態:", loading);
    console.log("RootNavigator - isAuthenticated状態:", isAuthenticated);
  }, [loading, isAuthenticated]);

  // Firebase認証状態の変更を監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("RootNavigator: 認証状態変更検出", !!user);
      setUserAuthenticated(!!user);
      
      // 認証状態が確定したら、ローディング画面を非表示にする
      if (!loading) {
        setTimeout(() => {
          setShowLoadingScreen(false);
        }, 300);
      }
    });

    return () => unsubscribe();
  }, [loading]);

  // useAuthStateからの認証状態が変更された場合も更新
  useEffect(() => {
    console.log("RootNavigator: isAuthenticated変更", isAuthenticated);
    setUserAuthenticated(isAuthenticated);
    
    // ローディング状態が終了したら、ローディング画面の表示も終了する
    if (!loading) {
      setTimeout(() => {
        setShowLoadingScreen(false);
      }, 300);
    }
  }, [isAuthenticated, loading]);

  // ローディング画面の表示をloadingステートに直接リンク
  if (loading || showLoadingScreen) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={{ marginTop: 10 }}>読み込み中... {loading ? "(認証中)" : "(画面遷移中)"}</Text>
      </View>
    );
  }

  // 以下は変更なし
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!userAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthStackNavigator}
          options={{
            animationTypeForReplace: !userAuthenticated ? "pop" : "push",
          }}
        />
      ) : (
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default RootNavigator;
