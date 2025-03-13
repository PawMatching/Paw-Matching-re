import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
  ChatList: undefined;
  ChatScreen: {
    chatId: string;
    dogId: string;
    otherUserId: string;
    matchId: string;
  };
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
