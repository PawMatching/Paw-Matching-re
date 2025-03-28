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
import { Platform } from "react-native";
import * as Device from "expo-device";
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
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);
  const [lastTokenUpdate, setLastTokenUpdate] = useState<Date | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  // トークンを更新してFirestoreに保存
  const updateAndSaveToken = async (userId: string, forceUpdate = false) => {
    try {
      // すでに更新中の場合はスキップ
      if (isUpdatingToken && !forceUpdate) {
        console.log("トークンの更新は既に進行中です");
        return;
      }

      // 最後の更新から5秒以内かつ強制更新でない場合はスキップ
      if (
        lastTokenUpdate &&
        Date.now() - lastTokenUpdate.getTime() < 5000 &&
        !forceUpdate
      ) {
        console.log("最後の更新から5秒以内のため、更新をスキップします");
        return;
      }

      setIsUpdatingToken(true);
      console.log("トークンの更新を開始します...");
      const token = await registerForPushNotifications();
      console.log("取得したトークン:", token);

      if (token) {
        console.log("AsyncStorageにトークンを保存します...");
        await AsyncStorage.setItem("expoPushToken", token);

        // Firestoreに保存を試みる
        try {
          console.log("Firestoreにトークンを保存します...");
          console.log("認証初期化状態:", isAuthInitialized);
          console.log("現在のユーザー:", user?.uid);
          console.log("更新対象のユーザーID:", userId);

          await setDoc(
            doc(db, "users", userId),
            {
              expoPushToken: token,
              lastTokenUpdate: new Date(),
              deviceInfo: {
                platform: Platform.OS,
                model: Device.modelName || "unknown",
                lastUpdated: new Date(),
              },
            },
            { merge: true }
          );
          console.log("トークンの保存が完了しました");
          setLastTokenUpdate(new Date());
        } catch (firestoreError) {
          console.error("Firestoreへの保存失敗:", firestoreError);

          // リトライロジックを追加
          setTimeout(() => {
            // 認証初期化されていれば再試行
            if (isAuthInitialized && user) {
              console.log("トークン保存の再試行...");
              updateAndSaveToken(userId, true);
            }
          }, 3000);
        }
      } else {
        console.warn("トークンの取得に失敗しました");
      }
    } catch (error) {
      console.error("トークンの更新と保存に失敗しました:", error);
    } finally {
      setIsUpdatingToken(false);
    }
  };

  // 認証成功後の処理を確実に行うための関数
  const handleSuccessfulAuth = async (userId: string) => {
    console.log("認証成功の後処理を実行:", userId);
    setIsAuthInitialized(true);

    // 少し遅延を入れて確実に認証状態が更新された後にトークンを更新
    setTimeout(() => {
      updateAndSaveToken(userId, true);
    }, 1000);
  };

  // ログイン処理
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      console.log("ログイン処理を開始します...");
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("ログイン成功:", userCredential.user.uid);

      await saveCredentials(email, password);
      // ログイン成功時に後処理を実行
      await handleSuccessfulAuth(userCredential.user.uid);
      return userCredential;
    } catch (error: any) {
      console.error("ログインエラー:", error);
      setError(error.message);
      throw error;
    }
  };

  // 新規登録処理
  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      console.log("新規登録処理を開始します...");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("新規登録成功:", userCredential.user.uid);

      await saveCredentials(email, password);
      // 新規登録時に後処理を実行
      await handleSuccessfulAuth(userCredential.user.uid);
      return userCredential;
    } catch (error: any) {
      console.error("新規登録エラー:", error);
      setError(error.message);
      throw error;
    }
  };

  // ログアウト処理
  const signOut = async () => {
    try {
      console.log("ログアウト処理を開始します...");
      // ログアウト前にトークンをクリア
      await clearPushNotificationToken();
      await firebaseSignOut(auth);
      await saveCredentials(null, null);
      console.log("ログアウト完了");
    } catch (error: any) {
      console.error("ログアウトエラー:", error);
      setError(error.message);
      throw error;
    }
  };

  // 保存されたログイン情報を使用して自動ログイン
  // autoSignIn 関数内にデバッグログを追加
  const autoSignIn = async () => {
    try {
      console.log("自動ログイン処理を開始します...");
      const savedEmail = await SecureStore.getItemAsync(USER_EMAIL_KEY);
      const savedPassword = await SecureStore.getItemAsync(USER_PASSWORD_KEY);

      console.log("保存された認証情報:", savedEmail ? "あり" : "なし");

      if (savedEmail && savedPassword) {
        console.log(
          "保存されたログイン情報を使用して自動ログインを試みます..."
        );
        setLoading(true); // 自動ログイン中はローディング状態を維持
        const userCredential = await signInWithEmailAndPassword(
          auth,
          savedEmail,
          savedPassword
        );
        console.log("自動ログイン成功:", userCredential.user.uid);
        await handleSuccessfulAuth(userCredential.user.uid);
        // ここで明示的にローディング状態を解除
        setLoading(false);
      } else {
        // 保存されたログイン情報がない場合は即座に初期化完了
        console.log(
          "保存されたログイン情報がないため、ゲスト状態で初期化します"
        );
        setIsAuthInitialized(true);
        setLoading(false);
      }
    } catch (error) {
      console.error("自動ログイン失敗:", error);
      await saveCredentials(null, null);
      setIsAuthInitialized(true);
      setLoading(false);
    }
  };

  // アプリ起動時の処理
  useEffect(() => {
    let isMounted = true;
    let authInitialized = false;

    console.log("認証状態の監視を開始します...");

    // 認証状態の変更を監視
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      console.log(
        "認証状態が変更されました:",
        currentUser ? "ログイン" : "ログアウト"
      );

      // ユーザー情報を更新
      setUser(currentUser);
      setCurrentUserId(currentUser?.uid || null);

      // 認証が初期化されたことをマーク（最初の一度だけ）
      if (!authInitialized) {
        authInitialized = true;
        setIsAuthInitialized(true);
        setLoading(false);
        console.log("認証初期化が完了しました");
      }

      // ユーザーが存在する場合のみトークンを更新
      if (currentUser) {
        console.log("認証ユーザー検出:", currentUser.uid);
        // 少し遅延を入れて確実に状態が更新された後にトークンを更新
        setTimeout(() => {
          updateAndSaveToken(currentUser.uid, false);
        }, 1000);
      }
    });

    // 認証リスナー設定後に自動ログインを試みる
    setTimeout(() => {
      if (isMounted) {
        autoSignIn();
      }
    }, 500);

    // クリーンアップ関数
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // 依存配列を空にして、マウント時にのみ実行

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    updateToken: (userId: string) => updateAndSaveToken(userId, true), // 強制更新用の関数を公開
  };
}
