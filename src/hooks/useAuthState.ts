import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "../config/firebase";
import * as SecureStore from 'expo-secure-store';

const USER_EMAIL_KEY = "auth_user_email";
const USER_PASSWORD_KEY = "auth_user_password";

// セキュアな方法でログイン情報を保存
const saveCredentials = async (email: string | null, password: string | null) => {
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

export const useAuthState = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // 保存されたログイン情報を使用して認証を復元
  const tryRestoreAuth = async () => {
    try {
      const savedEmail = await SecureStore.getItemAsync(USER_EMAIL_KEY);
      const savedPassword = await SecureStore.getItemAsync(USER_PASSWORD_KEY);
      
      if (!savedEmail || !savedPassword) {
        console.log("保存されたログイン情報がありません");
        return false;
      }

      console.log("保存されたログイン情報で再認証を試みます");
      
      try {
        // 保存されたログイン情報で再ログイン
        const userCredential = await signInWithEmailAndPassword(
          auth,
          savedEmail,
          savedPassword
        );
        console.log("自動ログインに成功しました:", userCredential.user.uid);
        return true;
      } catch (loginError) {
        console.error("自動ログイン失敗:", loginError);
        // 失敗した場合は認証情報を削除
        await saveCredentials(null, null);
        return false;
      }
    } catch (error) {
      console.error("認証復元中のエラー:", error);
      return false;
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        // Firebase Authの状態変更を監視
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log("Auth状態変更:", firebaseUser ? "認証済み" : "未認証");
          
          if (firebaseUser) {
            setUser(firebaseUser);
            setIsAuthenticated(true);
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error("認証の初期化エラー:", error);
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await signInWithEmailAndPassword(auth, email, password);
      // 安全にログイン情報を保存
      await saveCredentials(email, password);
      return response.user;
    } catch (error) {
      console.error("ログインに失敗しました:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await createUserWithEmailAndPassword(auth, email, password);
      // 新規登録成功時にログイン情報を保存
      await saveCredentials(email, password);
      return response.user;
    } catch (error) {
      console.error("新規登録に失敗しました:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await firebaseSignOut(auth);
      // ログアウト時に認証情報を削除
      await saveCredentials(null, null);
    } catch (error) {
      console.error("ログアウトに失敗しました:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    signIn,
    signUp,
    signOut,
    tryRestoreAuth
  };
};
