// src/screens/search/SearchMainScreen.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from "@react-navigation/native";

type SearchScreenNavigationProp = NavigationProp<ParamListBase>;

const SearchMainScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => navigation.navigate("SearchDogs")}
      >
        <Text style={styles.searchButtonText}>近くのわんちゃんを探す</Text>
      </TouchableOpacity>

      {/* 他の検索オプションをここに追加 */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  searchButton: {
    backgroundColor: "#FF9500",
    padding: 15,
    borderRadius: 25,
    width: "80%",
    alignItems: "center",
    marginBottom: 20,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default SearchMainScreen;
