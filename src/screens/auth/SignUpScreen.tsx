//
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthState } from "../../hooks/useAuthState";
import { AuthScreenNavigationProp } from "../../navigation/types";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { FirebaseError } from "firebase/app";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const { signUp } = useAuthState();

  const handleSignUp = async () => {
    // 入力値の検証
    if (!email || !password || !confirmPassword || !username) {
      Alert.alert("エラー", "すべての項目を入力してください");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("エラー", "パスワードが一致しません");
      return;
    }
    if (password.length < 6) {
      Alert.alert("エラー", "パスワードは6文字以上で入力してください");
      return;
    }
    if (!privacyPolicyAccepted) {
      Alert.alert("エラー", "プライバシーポリシーに同意してください");
      return;
    }

    try {
      // useAuthStateのsignUp関数を使用してユーザーを作成
      const user = await signUp(email, password);

      if (user) {
        // Firestoreにユーザー情報を保存
        await setDoc(doc(db, "users", user.uid), {
          email: email,
          name: username,
          createdAt: new Date(),
          updatedAt: new Date(),
          profileImage: "",
          userID: user.uid,
          isOwner: false,
        });

        Alert.alert("成功", "アカウントが作成されました");
        navigation.navigate("Login");
      }
    } catch (error) {
      let errorMessage = "登録中にエラーが発生しました";

      if ((error as FirebaseError).code === "auth/email-already-in-use") {
        errorMessage = "このメールアドレスは既に使用されています";
      } else if ((error as FirebaseError).code === "auth/invalid-email") {
        errorMessage = "無効なメールアドレス形式です";
      } else if ((error as FirebaseError).code === "auth/weak-password") {
        errorMessage =
          "パスワードが弱すぎます。より複雑なパスワードを設定してください";
      }
      Alert.alert("エラー", errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>新規登録</Text>
      <TextInput
        style={styles.input}
        placeholder="ユーザー名"
        value={username}
        onChangeText={setUsername}
      />
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
      <TextInput
        style={styles.input}
        placeholder="パスワード（確認）"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <View style={styles.privacyPolicyContainer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setPrivacyPolicyAccepted(!privacyPolicyAccepted)}
        >
          <View
            style={[
              styles.checkboxInner,
              privacyPolicyAccepted && styles.checkboxChecked,
            ]}
          >
            {privacyPolicyAccepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>
        <Text style={styles.privacyPolicyText}>
          <Text
            style={styles.privacyPolicyLink}
            onPress={() =>
              Linking.openURL("https://pawmatching.web.app/privacy-policy.html")
            }
          >
            プライバシーポリシー
          </Text>
          <Text>に同意する</Text>
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>登録</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.linkText}>
          すでにアカウントをお持ちの方はこちら
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
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
  privacyPolicyContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#FF9500",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#FF9500",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  privacyPolicyText: {
    fontSize: 14,
  },
  privacyPolicyLink: {
    color: "#FF9500",
    textDecorationLine: "underline",
  },
});
