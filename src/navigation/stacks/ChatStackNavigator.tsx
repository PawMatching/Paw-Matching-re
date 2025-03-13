// src/navigation/stacks/ChatStackNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChatStackParamList } from "../types";
import ChatListScreen from "../../screens/chat/ChatListScreen";
import ChatScreen from "../../screens/chat/ChatScreen";

const Stack = createNativeStackNavigator<ChatStackParamList>();

const ChatStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleStyle: {
          fontWeight: "600",
        },
        contentStyle: { backgroundColor: "white" },
        headerStyle: {
          backgroundColor: "white",
        },
      }}
    >
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{
          title: "チャット一覧",
        }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          headerShown: true,
          headerBackVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default ChatStackNavigator;
