// src/screens/account/RegisterDogScreen.tsx
import React, { useState } from "react";
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
  Pressable,
  Platform,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { db } from "../../config/firebase";
import { getStorage } from "firebase/storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AccountStackParamList } from "../../navigation/types";
import { doc, setDoc, updateDoc, collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuthState } from "../../hooks/useAuthState";

const RegisterDogScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const storage = getStorage();
  const { user } = useAuthState();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [likes, setLikes] = useState("");
  const [remarks, setRemarks] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isAgePickerVisible, setIsAgePickerVisible] = useState(false);

  // 年齢の選択肢を生成（0〜20歳）
  const ageOptions = Array.from({ length: 21 }, (_, i) => ({
    label: `${i}`,
    value: i.toString(),
  }));

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
      setImage(result.assets[0].uri);
    }
  };

  const validateInputs = () => {
    if (!name.trim()) {
      Alert.alert("エラー", "お名前を入力してください");
      return false;
    }
    if (!age) {
      Alert.alert("エラー", "年齢を選択してください");
      return false;
    }
    if (!gender) {
      Alert.alert("エラー", "性別を選択してください");
      return false;
    }
    return true;
  };

  // uploadImage関数の修正
  const uploadImage = async (uri: string, dogId: string) => {
    try {
      console.log("画像アップロード開始:", uri);
      console.log("dogId:", dogId);

      const response = await fetch(uri);
      const blob = await response.blob();

      // 正しいパスに戻す
      const storageRef = ref(storage, `dogs/${dogId}/profile/dogImage`);
      console.log("アップロード先パス:", `dogs/${dogId}/profile/dogImage`);

      // アップロード処理
      console.log("uploadBytes開始...");
      const uploadTask = await uploadBytes(storageRef, blob);
      console.log("uploadBytes完了:", uploadTask);

      // URLの取得
      console.log("getDownloadURL開始...");
      const downloadURL = await getDownloadURL(uploadTask.ref);
      console.log("getDownloadURL完了:", downloadURL);

      return downloadURL;
    } catch (error) {
      console.error("画像アップロード処理エラー（詳細）:", error);
      if (error instanceof Error) {
        console.error("エラーメッセージ:", error.message);
        console.error("エラー名:", error.name);
        console.error("エラースタック:", error.stack);
      }
      throw error;
    }
  };

  // handleRegister関数の修正
  const handleRegister = async () => {
    if (!user) {
      Alert.alert("エラー", "ログインが必要です");
      return;
    }

    if (!validateInputs()) return;

    try {
      setIsLoading(true);
      console.log("犬の登録処理を開始します");

      // まずFirestoreドキュメントを作成
      // 修正
      const dogCollectionRef = collection(db, "dogs");
      const dogDocRef = await addDoc(dogCollectionRef, {
        userID: user.uid,
        dogname: name,
        age: parseInt(age),
        sex: gender,
        likes: likes,
        notes: remarks,
        profileImage: null, // まずnullに設定
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("ドキュメントの作成準備完了:", user.uid);

      // Firestoreドキュメント作成後に画像をアップロード
      let imageUrl = null;
      if (image) {
        try {
          console.log("画像アップロード処理を開始します");

          // 少し待ってからアップロード（Firestoreの更新が反映されるまで待つ）
          console.log("1秒待機中...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log("待機完了");

          imageUrl = await uploadImage(image, user.uid);
          console.log("画像のアップロードに成功しました。URL:", imageUrl);

          // 画像URLでドキュメントを更新
          await updateDoc(dogDocRef, {
            profileImage: imageUrl,
            updatedAt: new Date(),
          });
          console.log("犬のドキュメントを画像URLで更新しました");
        } catch (uploadError) {
          console.error("画像アップロードエラー発生:", uploadError);
          Alert.alert(
            "画像アップロードエラー",
            "プロフィール画像のアップロードに失敗しました。後でもう一度お試しください。"
          );
        }
      } else {
        console.log("画像が選択されていないため、アップロードはスキップします");
      }

      // ユーザードキュメントも更新
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          isOwner: true,
        },
        { merge: true }
      );
      console.log("ユーザードキュメントを更新しました (isOwner: true)");

      Alert.alert("登録完了", "わんちゃんのプロフィールを登録しました", [
        {
          text: "OK",
          onPress: () => {
            const parent = navigation.getParent();
            if (!parent) {
              navigation.navigate("AccountMain", {
                shouldRefresh: true,
              });
              return;
            }

            const parentId = parent.getId();
            if (!parentId || !parentId.includes("Account")) {
              parent.navigate("Account", {
                screen: "AccountMain",
                params: { shouldRefresh: true },
              });
            } else {
              navigation.navigate("AccountMain", {
                shouldRefresh: true,
              });
            }
          },
        },
      ]);
    } catch (error) {
      console.error("登録エラー（詳細）:", error);
      if (error instanceof Error) {
        console.error("エラーメッセージ:", error.message);
        console.error("エラー名:", error.name);
      }
      Alert.alert(
        "エラー",
        "プロフィールの登録に失敗しました。もう一度お試しください。"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.header}>わんちゃんプロフィール登録</Text>

        {/* 画像アップロード部分 */}
        <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholderContainer]}>
              <MaterialIcons name="pets" size={60} color="#888888" />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={pickImage} style={styles.uploadButton}>
          <Text style={styles.uploadButtonText}>画像を選択</Text>
        </TouchableOpacity>

        {/* 名前入力 */}
        <Text style={styles.label}>お名前</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="お名前"
        />

        {/* 年齢選択 */}
        <Text style={styles.label}>年齢</Text>
        <View style={styles.rowContainer}>
          <TouchableOpacity
            style={styles.pickerContainer}
            onPress={() => setIsAgePickerVisible(true)}
          >
            <Text style={styles.pickerText}>
              {age ? `${age}` : "選択してください"}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#999" />
          </TouchableOpacity>
          <Text style={styles.unitText}>才</Text>
        </View>

        <Modal
          visible={isAgePickerVisible}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>年齢を選択</Text>
                <TouchableOpacity
                  onPress={() => setIsAgePickerVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>完了</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {ageOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      age === option.value && styles.selectedOption,
                    ]}
                    onPress={() => {
                      setAge(option.value);
                      setIsAgePickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        age === option.value && styles.selectedOptionText,
                      ]}
                    >
                      {option.label}才
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* 性別選択 */}
        <View style={styles.radioContainer}>
          <Pressable
            style={styles.radioButton}
            onPress={() => setGender("male")}
          >
            <View style={styles.radioCircle}>
              {gender === "male" && <View style={styles.radioChecked} />}
            </View>
            <Text style={styles.maleText}>♂</Text>
          </Pressable>

          <Pressable
            style={styles.radioButton}
            onPress={() => setGender("female")}
          >
            <View style={styles.radioCircle}>
              {gender === "female" && <View style={styles.radioChecked} />}
            </View>
            <Text style={styles.femaleText}>♀</Text>
          </Pressable>
        </View>

        {/* 好きなこと入力 */}
        <Text style={styles.label}>好きなこと</Text>
        <TextInput
          style={styles.input}
          value={likes}
          onChangeText={setLikes}
          placeholder="好きなこと"
        />

        {/* 備考入力 */}
        <Text style={styles.label}>備考</Text>
        <TextInput
          style={styles.textArea}
          value={remarks}
          onChangeText={setRemarks}
          multiline={true}
          numberOfLines={4}
          placeholder="その他、何かあればご記入ください"
        />

        {/* 登録ボタン */}
        <TouchableOpacity
          style={[styles.registerButton, isLoading && styles.disabledButton]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.registerButtonText}>登録する</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
    borderRadius: 5,
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
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  pickerContainer: {
    width: 150,
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  pickerText: {
    fontSize: 16,
    color: "#000",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
  optionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedOption: {
    backgroundColor: "#f0f0f0",
  },
  optionText: {
    fontSize: 16,
  },
  selectedOptionText: {
    color: "#007AFF",
  },
  unitText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  radioContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 15,
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioChecked: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#000",
  },
  maleText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "blue",
  },
  femaleText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "red",
  },
  textArea: {
    width: "100%",
    height: 120,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    textAlignVertical: "top",
    padding: 10,
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: "#f9a8a8",
    borderRadius: 25,
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
    marginVertical: 20,
  },
  registerButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#ffd0d0",
  },
});

export default RegisterDogScreen;
