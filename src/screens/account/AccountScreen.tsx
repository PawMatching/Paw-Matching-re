import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useAuthState } from "../../hooks/useAuthState";

const AccountScreen = () => {
  const { signOut } = useAuthState();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("ログアウトに失敗しました:", error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>ログアウト</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  logoutButton: {
    backgroundColor: "#FF9500",
    padding: 15,
    borderRadius: 8,
    width: "100%",
    marginTop: 20,
  },
  logoutButtonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default AccountScreen;
