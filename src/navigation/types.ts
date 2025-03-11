import { NavigatorScreenParams } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// 各スタックナビゲーションの型定義
export type HomeStackParamList = {
  HomeMain: undefined;
  RegisterDog: undefined;
  StartWalk: undefined;
  Search: undefined;
};

export type SearchStackParamList = {
  SearchMain: undefined;
  SearchResult: { query: string };
};

export type MatchingStackParamList = {
  MatchingMain: undefined;
  MatchingRequests: undefined;
  MatchingSent: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { dogName: string; chatId: string };
};

export type AccountStackParamList = {
  AccountMain: {
    updatedUserData?: {
      name: string;
      comment: string;
      profileImage: string | null;
      email: string | null;
      updatedAt: string;
    };
    shouldRefresh?: boolean;
  };
  EditProfile: undefined;
  EditDogProfile: { dogId: string };
  RegisterDog: undefined;
};

// 認証スタックナビゲーションの型定義
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type AuthScreenNavigationProp =
  NativeStackNavigationProp<AuthStackParamList>;

// タブナビゲーションの型定義
export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Search: NavigatorScreenParams<SearchStackParamList>;
  Matching: NavigatorScreenParams<MatchingStackParamList>;
  Chat: NavigatorScreenParams<ChatStackParamList>;
  Account: NavigatorScreenParams<AccountStackParamList>;
};

// ルートナビゲーションの型定義
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<RootTabParamList>;
};
