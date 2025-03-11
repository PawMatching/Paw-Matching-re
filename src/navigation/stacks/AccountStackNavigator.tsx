// src/navigation/stacks/AccountStackNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AccountScreen from "../../screens/account/AccountScreen";
import EditProfileScreen from "../../screens/account/EditProfileScreen";
import RegisterDogScreen from "../../screens/account/RegisterDogScreen";
import EditDogProfileScreen from "../../screens/account/EditDogProfileScreen";

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
      <Stack.Screen
        name="RegisterDog"
        component={RegisterDogScreen}
        options={{
          title: "犬のプロフィール登録",
        }}
      />
    </Stack.Navigator>
  );
};

export default AccountStackNavigator;
