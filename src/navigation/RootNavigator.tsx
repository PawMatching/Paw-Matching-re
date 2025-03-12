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
  const { isAuthenticated, isLoading, tryRestoreAuth } = useAuthState();
  const [restoringAuth, setRestoringAuth] = useState(true);
  const [userAuthenticated, setUserAuthenticated] = useState(initialAuthenticated || false);

  // Firebase認証状態の変更を監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  // 保存された認証情報からの復元を試みる
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        // 認証の復元を試みる
        await tryRestoreAuth();
      } finally {
        setRestoringAuth(false);
      }
    };
    
    restoreAuth();
  }, [tryRestoreAuth]);

  // useAuthStateからの認証状態が変更された場合も更新
  useEffect(() => {
    setUserAuthenticated(isAuthenticated);
  }, [isAuthenticated]);

  if (isLoading || restoringAuth) {
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
