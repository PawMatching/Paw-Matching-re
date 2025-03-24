// src/screens/auth/LoginScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthState } from "../../hooks/useAuthState";
import { AuthScreenNavigationProp } from "../../navigation/types";
import LottieView from "lottie-react-native";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const { signIn } = useAuthState();
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.play();
    }
  }, []);

  const handleLogin = async () => {
    try {
      await signIn(email, password);
      // ログイン成功後、少し遅延してからナビゲーションを行う
    setTimeout(() => {
      // 既にナビゲーションされている場合は何もしない
      // (遷移後のコンポーネントがアンマウントされた場合のエラー防止)
    }, 500);
    } catch (error) {
      Alert.alert(
        "エラー",
        "ログインに失敗しました。メールアドレスとパスワードを確認してください。"
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>ログイン</Text>
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>ログイン</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={styles.linkText}>
            アカウントをお持ちでない方はこちら
          </Text>
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

export default LoginScreen;
