// src/hooks/useAuthState.ts
import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth, db } from "../config/firebase";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc } from "firebase/firestore";
import {
  clearPushNotificationToken,
  registerForPushNotifications,
} from "../utils/notifications";

const USER_EMAIL_KEY = "auth_user_email";
const USER_PASSWORD_KEY = "auth_user_password";

// セキュアな方法でログイン情報を保存
const saveCredentials = async (
  email: string | null,
  password: string | null
) => {
  try {
    if (email && password) {
      await SecureStore.setItemAsync(USER_EMAIL_KEY, email);
      await SecureStore.setItemAsync(USER_PASSWORD_KEY, password);
      console.log("ログイン情報を安全に保存しました");
    } else {
      await SecureStore.deleteItemAsync(USER_EMAIL_KEY);
      await SecureStore.deleteItemAsync(USER_PASSWORD_KEY);
      console.log("ログイン情報を削除しました");
    }
  } catch (error) {
    console.error("認証情報の保存エラー:", error);
  }
};

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新しい関数: トークンを更新してFirestoreに保存
  const updateAndSaveToken = async (userId: string) => {
    try {
      const token = await registerForPushNotifications();
      if (token) {
        await AsyncStorage.setItem("expoPushToken", token);
        await setDoc(
          doc(db, "users", userId),
          {
            expoPushToken: token,
            lastTokenUpdate: new Date(),
          },
          { merge: true }
        );
        console.log("新しいトークンを保存しました");
      }
    } catch (error) {
      console.error("トークンの更新と保存に失敗しました:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      await saveCredentials(email, password);
      // ログイン成功時にトークンを更新
      await updateAndSaveToken(userCredential.user.uid);
      return userCredential;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await saveCredentials(email, password);
      // 新規登録時にトークンを更新
      await updateAndSaveToken(userCredential.user.uid);
      return userCredential;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // ログアウト前にトークンをクリア
      await clearPushNotificationToken();
      await firebaseSignOut(auth);
      await saveCredentials(null, null);
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        // ユーザー状態変更時にトークンを更新
        await updateAndSaveToken(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };
}
