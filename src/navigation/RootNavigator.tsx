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

  // Firebase認証状態の変更を監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("RootNavigator: 認証状態変更検出", !!user);
      setUserAuthenticated(!!user);
      
      // 認証状態が確定したら、少し遅延を入れてからローディング画面を非表示にする
      setTimeout(() => {
        setShowLoadingScreen(false);
      }, 300);
    });

    return () => unsubscribe();
  }, []);

  // useAuthStateからの認証状態が変更された場合も更新
  useEffect(() => {
    console.log("RootNavigator: isAuthenticated変更", isAuthenticated);
    setUserAuthenticated(isAuthenticated);
    
    // ローディング状態が終了したら、ローディング画面の表示も終了する準備
    if (!loading && showLoadingScreen) {
      // 少し遅延を入れて、状態の変化が適用された後に画面を表示
      setTimeout(() => {
        setShowLoadingScreen(false);
      }, 300);
    }
  }, [isAuthenticated, loading]);

  // ローディング画面の表示
  if (loading || showLoadingScreen) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={{ marginTop: 10 }}>読み込み中...</Text>
      </View>
    );
  }

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
    backgroundColor: "#ffffff",
  },
});

export default RootNavigator;
