import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MatchingStackParamList } from "../types";
import MatchingRequestsScreen from "../../screens/matching/MatchingRequestsScreen";

// 仮のコンポーネント（後で実装）
const MatchingMainScreen = () => null;
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
          title: "モフモフ申請",
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
