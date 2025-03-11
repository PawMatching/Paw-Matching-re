// src/navigation/RootNavigator.tsx
import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import AuthStackNavigator from "./stacks/AuthStackNavigator";
import TabNavigator from "./TabNavigator";
import { useAuthState } from "../hooks/useAuthState";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, tryRestoreAuth } = useAuthState();
  const [restoringAuth, setRestoringAuth] = useState(true);

  useEffect(() => {
     const restoreAuth = async () => {
      try {
        // 認証の復元を試みる新しい関数を呼び出す
        await tryRestoreAuth();
      } finally {
        setRestoringAuth(false);
      }
    };
    
    restoreAuth();
  }, []);

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
      {!isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthStackNavigator}
          options={{
            animationTypeForReplace: !isAuthenticated ? "pop" : "push",
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
