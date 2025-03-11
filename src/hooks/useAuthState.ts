import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_STORAGE_KEY = "userAuth";

// ユーザー情報を保存するための関数
const saveUser = async (user: User | null) => {
  try {
    if (user) {
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      };
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    } else {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to save user:", error);
  }
};

// 保存したユーザー情報を読み込む関数
const loadUser = async () => {
  try {
    const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Failed to load user:", error);
    return null;
  }
};

export const useAuthState = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        // Firebase Authの状態変更を監視
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);
            setIsAuthenticated(true);
            await saveUser(firebaseUser);
          } else {
            // Firebase認証が切れている場合、ローカルストレージのデータを削除
            await saveUser(null);
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
      await saveUser(response.user);
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
      const response = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await saveUser(response.user);
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
      await saveUser(null);
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
  };
};
