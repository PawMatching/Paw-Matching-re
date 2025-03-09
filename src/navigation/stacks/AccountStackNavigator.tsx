import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AccountScreen from "../../screens/account/AccountScreen";

// 仮のコンポーネント（後で実装）
const AccountMainScreen = () => null;
const EditProfileScreen = () => null;
const EditDogProfileScreen = () => null;

const Stack = createNativeStackNavigator();

const AccountStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AccountMain"
        component={AccountScreen}
        options={{
          title: "アカウント",
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          title: "プロフィール編集",
        }}
      />
      <Stack.Screen
        name="EditDogProfile"
        component={EditDogProfileScreen}
        options={{
          title: "犬のプロフィール編集",
        }}
      />
    </Stack.Navigator>
  );
};

export default AccountStackNavigator;
