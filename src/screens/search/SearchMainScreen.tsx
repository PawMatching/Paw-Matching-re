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
    backgroundColor: "#f8f9fa",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButton: {
    backgroundColor: "#FF9500",
    padding: 16,
    borderRadius: 12,
    width: "85%",
    shadowColor: "#FF9500",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default SearchMainScreen;
