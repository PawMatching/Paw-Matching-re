// src/screens/account/AccountScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuthState } from "../../hooks/useAuthState";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { UserData, DogData } from "../../types/user";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AccountStackParamList } from "../../navigation/types";

type AccountScreenNavigationProp =
  NativeStackNavigationProp<AccountStackParamList>;

type AccountScreenRouteProp = RouteProp<AccountStackParamList, "AccountMain">;

const AccountScreen = () => {
  const navigation = useNavigation<AccountScreenNavigationProp>();
  const route = useRoute<AccountScreenRouteProp>();
  const { signOut, user } = useAuthState();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dogData, setDogData] = useState<DogData | null>(null);

  const fetchUserAndDogData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // ユーザーデータの取得
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as UserData;
        setUserData(userData);

        // ユーザーが犬を登録している場合（isOwner=true）
        if (userData.isOwner) {
          const dogsQuery = query(
            collection(db, "dogs"),
            where("userID", "==", user.uid)
          );
          const dogSnapshot = await getDocs(dogsQuery);

          if (!dogSnapshot.empty) {
            const dogDoc = dogSnapshot.docs[0];
            const dogData = {
              id: dogDoc.id,
              ...dogDoc.data(),
            } as DogData;
            setDogData(dogData);
          }
        } else {
          setDogData(null);
        }
      } else {
        Alert.alert("エラー", "ユーザー情報が見つかりませんでした。");
      }
    } catch (error) {
      console.error("データ取得エラー:", error);
      Alert.alert("エラー", "データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 画面がフォーカスされる度にデータを再取得
  useFocusEffect(
    useCallback(() => {
      fetchUserAndDogData();
    }, [fetchUserAndDogData])
  );

  // プロフィール更新の監視
  useEffect(() => {
    const updatedData = route.params?.updatedUserData;
    if (updatedData) {
      setUserData(
        (prevData) =>
          ({
            ...prevData,
            name: updatedData.name,
            profileImage: updatedData.profileImage || "",
            email: updatedData.email || "",
            updatedAt: new Date(updatedData.updatedAt),
          } as UserData)
      );
    }
  }, [route.params?.updatedUserData]);

  const handleEditUserProfile = () => {
    navigation.navigate("EditProfile");
  };

  const handleEditDogProfile = () => {
    if (dogData) {
      navigation.navigate("EditDogProfile", { dogId: dogData.id });
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "ログアウト",
      "ログアウトしますか？",
      [
        {
          text: "キャンセル",
          style: "cancel",
        },
        {
          text: "ログアウト",
          onPress: async () => {
            try {
              // ログアウト前にユーザーデータをクリア
              setUserData(null);
              setDogData(null);

              // ログアウト実行
              await signOut();
            } catch (error) {
              console.error("ログアウトエラー:", error);
              Alert.alert("エラー", "ログアウトに失敗しました。");
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>アカウント設定</Text>

      {/* ユーザープロフィールセクション */}
      <View style={styles.profileSection}>
        <View style={styles.profileHeader}>
          <Text style={styles.sectionTitle}>ユーザー</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditUserProfile}
          >
            <Text style={styles.editButtonText}>編集</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileContent}>
          {userData?.profileImage ? (
            <Image
              source={{ uri: userData.profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImage, styles.iconContainer]}>
              <MaterialIcons name="person" size={60} color="#888888" />
            </View>
          )}
          <Text style={styles.profileName}>
            {userData?.name || "ユーザー名未設定"}
          </Text>
        </View>
      </View>

      {/* 犬のプロフィールセクション */}
      {userData?.isOwner && (
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Text style={styles.sectionTitle}>わんちゃん</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditDogProfile}
            >
              <Text style={styles.editButtonText}>編集</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileContent}>
            {dogData?.profileImage ? (
              <Image
                source={{ uri: dogData.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.iconContainer]}>
                <MaterialIcons name="pets" size={60} color="#888888" />
              </View>
            )}
            <Text style={styles.profileName}>
              {dogData?.dogname || "犬の名前未設定"}
            </Text>
          </View>
        </View>
      )}

      {/* 犬を登録していない場合の表示 */}
      {userData && !userData.isOwner && (
        <View style={styles.noDogContainer}>
          <Text style={styles.noDogText}>
            わんちゃんがいる場合は登録お願いします
          </Text>
          <TouchableOpacity
            style={styles.registerDogButton}
            onPress={() => navigation.navigate("RegisterDog")}
          >
            <Text style={styles.registerDogButtonText}>
              わんちゃんを登録する
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ログアウトボタン */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color="#fff" />
          <Text style={[styles.actionText, styles.logoutText]}>ログアウト</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 30,
    color: "#2c3e50",
  },
  profileSection: {
    marginBottom: 24,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2c3e50",
  },
  editButton: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editButtonText: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  profileContent: {
    alignItems: "center",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  iconContainer: {
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
  noDogContainer: {
    alignItems: "center",
    marginTop: 20,
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noDogText: {
    fontSize: 16,
    marginBottom: 16,
    color: "#6c757d",
    textAlign: "center",
  },
  registerDogButton: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#FF9500",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  registerDogButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  actionSection: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutButton: {
    backgroundColor: "#FF9500",
    borderColor: "#FF9500",
    shadowColor: "#FF9500",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 12,
    color: "#2c3e50",
    fontWeight: "500",
  },
  logoutText: {
    color: "#fff",
  },
});

export default AccountScreen;
