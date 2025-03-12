// src/navigation/stacks/SearchStackNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SearchStackParamList } from "../types";
import SearchDogsScreen from "../../screens/search/SearchDogsScreen";
import DogDetailScreen from "../../screens/search/DogDetailScreen";

const Stack = createNativeStackNavigator<SearchStackParamList>();

const SearchStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SearchMain"
        component={SearchDogsScreen}
        options={{
          title: "近くのわんちゃん",
        }}
      />
      <Stack.Screen
        name="DogDetail"
        component={DogDetailScreen}
        options={{
          title: "わんちゃんの詳細",
        }}
      />
    </Stack.Navigator>
  );
};

export default SearchStackNavigator;
