import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { db } from "../../config/firebase";
import { getStorage } from "firebase/storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AccountStackParamList } from "../../navigation/types";
import {
  User,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuthState } from "../../hooks/useAuthState";
import { SafeAreaView } from "react-native-safe-area-context";

const EditProfileScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const storage = getStorage();
  const { user } = useAuthState();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [password, setPassword] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!user) {
          return; // userがnullの場合は何もしない（初期化待ち）
        }

        setEmail(user.email || "");

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Firestoreのnameを優先的に使用し、なければdisplayNameを使用
          setUsername(userData.name || user.displayName || "");
          if (userData.comment) {
            setComment(userData.comment);
          }
          if (userData.profileImage) {
            setProfileImage(userData.profileImage);
          }
        } else {
          // Firestoreにデータがない場合はdisplayNameを使用
          setUsername(user.displayName || "");
        }

        setInitialDataLoaded(true);
      } catch (error) {
        console.error("ユーザーデータの取得エラー:", error);
        Alert.alert("エラー", "ユーザー情報の取得に失敗しました");
      }
    };

    fetchUserData();
  }, [user]); // userを依存配列に含める

  // ユーザーが未認証の場合のリダイレクト
  useEffect(() => {
    if (user === null && initialDataLoaded) {
      Alert.alert("エラー", "ログインが必要です");
      navigation.goBack();
    }
  }, [user, initialDataLoaded, navigation]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("エラー", "写真へのアクセス許可が必要です");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const validateInputs = () => {
    if (!username.trim()) {
      Alert.alert("エラー", "ユーザー名を入力してください");
      return false;
    }

    if (!password.trim()) {
      Alert.alert("エラー", "確認のためパスワードを入力してください");
      return false;
    }

    return true;
  };

  const uploadImage = async (uri: string, userId: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const storageRef = ref(storage, `users/${userId}/profile/profileImage`);
    const uploadTask = await uploadBytes(storageRef, blob);

    return await getDownloadURL(uploadTask.ref);
  };

  const handleUpdate = async () => {
    if (!user) {
      Alert.alert("エラー", "ログインが必要です");
      return;
    }

    if (!validateInputs()) return;

    try {
      setIsLoading(true);

      const credential = EmailAuthProvider.credential(
        user.email || "",
        password
      );

      await reauthenticateWithCredential(user, credential);

      let imageUrl = profileImage;
      if (profileImage && !profileImage.startsWith("http")) {
        try {
          imageUrl = await uploadImage(profileImage, user.uid);
        } catch (uploadError) {
          console.error("画像アップロードエラー:", uploadError);
          Alert.alert(
            "画像アップロードエラー",
            "プロフィール画像のアップロードに失敗しました。後でもう一度お試しください。"
          );
        }
      }

      await updateProfile(user, {
        displayName: username,
      });

      const now = new Date();
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        name: username,
        comment: comment,
        profileImage: imageUrl,
        updatedAt: now,
      });

      // 更新されたユーザーデータを作成（updatedAtを文字列として渡す）
      const updatedUserData = {
        name: username,
        comment: comment,
        profileImage: imageUrl,
        email: user.email,
        updatedAt: now.toISOString(),
      };

      Alert.alert("更新完了", "プロフィールを更新しました", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("AccountMain", {
              updatedUserData,
              shouldRefresh: true,
            });
          },
        },
      ]);
    } catch (error) {
      console.error("更新エラー:", error);
      Alert.alert(
        "エラー",
        "プロフィールの更新に失敗しました。パスワードが正しいか確認してください。"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialDataLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f9a8a8" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.container}>
            <Text style={styles.header}>プロフィール編集</Text>

            <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.placeholderContainer]}>
                  <MaterialIcons name="person" size={60} color="#888888" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={pickImage} style={styles.uploadButton}>
              <Text style={styles.uploadButtonText}>
                プロフィール画像を変更
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>ユーザー名</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="ユーザー名"
            />

            <Text style={styles.label}>メールアドレス</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
            />

            <Text style={styles.label}>一言コメント</Text>
            <TextInput
              style={styles.textArea}
              value={comment}
              onChangeText={setComment}
              multiline={true}
              numberOfLines={4}
              placeholder="自己紹介や一言コメントをどうぞ"
            />

            <Text style={styles.label}>パスワード確認</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="変更を確定するにはパスワードを入力してください"
              secureTextEntry={true}
            />

            <TouchableOpacity
              style={[styles.updateButton, isLoading && styles.disabledButton]}
              onPress={handleUpdate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.updateButtonText}>更新する</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: "white",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  imageContainer: {
    alignSelf: "center",
    marginBottom: 10,
  },
  placeholderContainer: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  uploadButton: {
    backgroundColor: "#ddd",
    borderRadius: 20,
    padding: 10,
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  uploadButtonText: {
    color: "#000",
  },
  label: {
    marginTop: 10,
    marginBottom: 5,
    alignSelf: "flex-start",
    color: "#888",
  },
  input: {
    width: "100%",
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 15,
  },
  disabledInput: {
    backgroundColor: "#f9f9f9",
    color: "#888",
  },
  textArea: {
    width: "100%",
    height: 100,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    textAlignVertical: "top",
    padding: 10,
    marginBottom: 20,
  },
  updateButton: {
    backgroundColor: "#FF9500",
    borderRadius: 25,
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
    marginVertical: 20,
  },
  updateButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#ffd0d0",
  },
});

export default EditProfileScreen;
