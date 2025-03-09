import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChatStackParamList } from "../types";

// 仮のコンポーネント（後で実装）
const ChatListScreen = () => null;
const ChatRoomScreen = () => null;

const Stack = createNativeStackNavigator<ChatStackParamList>();

const ChatStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{
          title: "チャット",
        }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({
          title: route.params.dogName,
        })}
      />
    </Stack.Navigator>
  );
};

export default ChatStackNavigator;
