import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../types";
import HomeScreen from "../../screens/home/HomeScreen";

// 仮のコンポーネント（後で実装）
const RegisterDogScreen = () => null;
const StartWalkScreen = () => null;
const SearchScreen = () => null;

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          title: "ホーム",
        }}
      />
      <Stack.Screen
        name="RegisterDog"
        component={RegisterDogScreen}
        options={{
          title: "犬を登録",
        }}
      />
      <Stack.Screen
        name="StartWalk"
        component={StartWalkScreen}
        options={{
          title: "お散歩に出る",
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: "検索",
        }}
      />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
