import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SearchStackParamList } from "../../navigation/types";

type SearchScreenNavigationProp =
  NativeStackNavigationProp<SearchStackParamList>;

const SearchMainScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => navigation.navigate("SearchMain")}
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
    backgroundColor: "#fff",
    padding: 16,
  },
  searchButton: {
    backgroundColor: "#4dabf7",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default SearchMainScreen;
