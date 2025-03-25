// src/screens/auth/ResetPasswordScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../config/firebase";
import { useNavigation } from "@react-navigation/native";
import { AuthScreenNavigationProp } from "../../navigation/types";
import { FirebaseError } from "firebase/app";
import LottieView from "lottie-react-native";

const PasswordResetScreen = () => {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.play();
    }
  }, []);

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert("エラー", "メールアドレスを入力してください");
      return;
    }

    try {
      setIsLoading(true);
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "パスワードリセットメール送信完了",
        "パスワードリセットのためのメールを送信しました。メールの指示に従ってパスワードをリセットしてください。",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }]
      );
    } catch (error) {
      let errorMessage = "パスワードリセットメールの送信に失敗しました";
      if ((error as FirebaseError).code === "auth/user-not-found") {
        errorMessage = "このメールアドレスのユーザーが見つかりませんでした";
      } else if ((error as FirebaseError).code === "auth/invalid-email") {
        errorMessage = "無効なメールアドレスです";
      }
      Alert.alert("エラー", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>パスワードをリセット</Text>
        <Text style={styles.subtitle}>
          登録したメールアドレスを入力してください。パスワードリセットのためのリンクをお送りします。
        </Text>

        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handlePasswordReset}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "リセットメール送信中..." : "リセットメールを送信"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.linkText}>ログイン画面に戻る</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.animationContainer}>
        <LottieView
          ref={animationRef}
          source={require("../../../assets/Auth-Animation.json")}
          style={styles.animation}
          autoPlay={true}
          loop={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  formContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#FF9500",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  linkButton: {
    marginTop: 20,
  },
  linkText: {
    color: "#FF9500",
    textAlign: "center",
  },
  animationContainer: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  animation: {
    width: 300,
    height: 150,
  },
});

export default PasswordResetScreen;
