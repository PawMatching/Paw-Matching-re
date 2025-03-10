import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
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

const AccountScreen = () => {
  const navigation = useNavigation<AccountScreenNavigationProp>();
  const { signOut, user } = useAuthState();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dogData, setDogData] = useState<DogData | null>(null);

  useEffect(() => {
    const fetchUserAndDogData = async () => {
      if (!user) return;

      try {
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
              const dogData = dogSnapshot.docs[0].data() as DogData;
              setDogData(dogData);
            }
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
    };

    fetchUserAndDogData();
  }, [user]);

  const handleEditUserProfile = () => {
    navigation.navigate("EditProfile");
  };

  const handleEditDogProfile = () => {
    if (dogData) {
      navigation.navigate("EditDogProfile", { dogId: dogData.userID });
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
          <Text style={styles.sectionTitle}>ユーザープロフィール</Text>
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
            <Text style={styles.sectionTitle}>犬のプロフィール</Text>
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
          <MaterialIcons name="logout" size={24} color="#ff6b6b" />
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
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  profileSection: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
    padding: 16,
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  editButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    fontSize: 14,
  },
  profileContent: {
    alignItems: "center",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  iconContainer: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  noDogContainer: {
    alignItems: "center",
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
  },
  noDogText: {
    fontSize: 16,
    marginBottom: 16,
  },
  registerDogButton: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  registerDogButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  actionSection: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
    marginBottom: 15,
  },
  logoutButton: {
    borderColor: "#ffecec",
    backgroundColor: "#fff5f5",
  },
  actionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  logoutText: {
    color: "#ff6b6b",
  },
});

export default AccountScreen;
