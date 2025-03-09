import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MatchingStackParamList } from "../types";

// 仮のコンポーネント（後で実装）
const MatchingMainScreen = () => null;
const MatchingRequestsScreen = () => null;
const MatchingSentScreen = () => null;

const Stack = createNativeStackNavigator<MatchingStackParamList>();

const MatchingStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MatchingMain"
        component={MatchingMainScreen}
        options={{
          title: "マッチング",
        }}
      />
      <Stack.Screen
        name="MatchingRequests"
        component={MatchingRequestsScreen}
        options={{
          title: "受信したリクエスト",
        }}
      />
      <Stack.Screen
        name="MatchingSent"
        component={MatchingSentScreen}
        options={{
          title: "送信したリクエスト",
        }}
      />
    </Stack.Navigator>
  );
};

export default MatchingStackNavigator;
