import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SearchStackParamList } from "../types";

// 仮のコンポーネント（後で実装）
const SearchMainScreen = () => null;
const SearchResultScreen = () => null;

const Stack = createNativeStackNavigator<SearchStackParamList>();

const SearchStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SearchMain"
        component={SearchMainScreen}
        options={{
          title: "検索",
        }}
      />
      <Stack.Screen
        name="SearchResult"
        component={SearchResultScreen}
        options={{
          title: "検索結果",
        }}
      />
    </Stack.Navigator>
  );
};

export default SearchStackNavigator;
