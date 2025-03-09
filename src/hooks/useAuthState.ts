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
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
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
    if (userData) {
      return JSON.parse(userData) as User;
    }
  } catch (error) {
    console.error("Failed to load user:", error);
  }
  return null;
};

export const useAuthState = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 初回マウント時に保存されたユーザー情報を読み込む
    const initializeAuth = async () => {
      const savedUser = await loadUser();
      if (savedUser) {
        setUser(savedUser);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    initializeAuth();

    // Firebase Auth の状態変更を監視
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsAuthenticated(!!user);
      await saveUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      return response.user;
    } catch (error) {
      console.error("ログインに失敗しました:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const response = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      return response.user;
    } catch (error) {
      console.error("新規登録に失敗しました:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await AsyncStorage.removeItem(USER_STORAGE_KEY); // ログアウト時にストレージからも削除
    } catch (error) {
      console.error("ログアウトに失敗しました:", error);
      throw error;
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
