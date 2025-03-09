import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import AuthStackNavigator from "./stacks/AuthStackNavigator";
import TabNavigator from "./TabNavigator";
import { useAuthState } from "../hooks/useAuthState";

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthState();

  if (isLoading) {
    // TODO: ローディング画面のコンポーネントを実装する
    return null;
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

export default RootNavigator;
