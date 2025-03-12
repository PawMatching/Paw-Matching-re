// src/screens/matching/MatchingMainScreen.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MatchingStackParamList } from "../../navigation/types";
import { Ionicons } from "@expo/vector-icons";

type MatchingScreenNavigationProp =
  NativeStackNavigationProp<MatchingStackParamList>;

const MatchingMainScreen = () => {
  const navigation = useNavigation<MatchingScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate("MatchingRequests")}
      >
        <View style={styles.menuContent}>
          <Ionicons name="heart" size={24} color="#4dabf7" />
          <Text style={styles.menuText}>モフモフ申請</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#adb5bd" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate("MatchingSent")}
      >
        <View style={styles.menuContent}>
          <Ionicons name="paper-plane" size={24} color="#4dabf7" />
          <Text style={styles.menuText}>送信したリクエスト</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#adb5bd" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  menuContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
    color: "#495057",
  },
});

export default MatchingMainScreen;
