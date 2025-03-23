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
  KeyboardAvoidingView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { db } from "../../config/firebase";
import { getStorage } from "firebase/storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AccountStackParamList } from "../../navigation/types";
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuthState } from "../../hooks/useAuthState";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const uploadImage = async (uri: string, dogId: string) => {
    try {
      // 画像アップロード開始
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `dogs/${dogId}/profile/profileImage`);
      const uploadTask = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      return downloadURL;
    } catch (error) {
      console.error("画像のアップロードに失敗しました:", error);
      throw error;
    }
  };

  const handleRegister = async () => {
    if (!user) {
      Alert.alert("エラー", "ログインが必要です");
      return;
    }

    if (!validateInputs()) return;

    try {
      setIsLoading(true);

      // 犬のドキュメントを作成
      const dogRef = await addDoc(collection(db, "dogs"), {
        userID: user.uid,
        dogname: name,
        age: parseInt(age),
        sex: gender,
        likes: likes,
        notes: remarks,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dogId = dogRef.id;

      // 画像が選択されている場合、アップロード
      if (image) {
        try {
          // Firestoreの更新が反映されるまで待つ
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // ドキュメントの存在を確認
          const dogDoc = await getDoc(dogRef);
          if (!dogDoc.exists()) {
            throw new Error("ドキュメントが見つかりません");
          }

          // ドキュメントの内容を確認
          const dogData = dogDoc.data();

          if (dogData.userID !== user.uid) {
            throw new Error("ユーザーIDが一致しません");
          }

          const imageUrl = await uploadImage(image, dogId);

          // 画像URLでドキュメントを更新
          await updateDoc(dogRef, {
            profileImage: imageUrl,
            updatedAt: new Date(),
          });
        } catch (uploadError) {
          console.error("画像アップロードエラー発生:", uploadError);
          Alert.alert(
            "画像アップロードエラー",
            "プロフィール画像のアップロードに失敗しました。後でもう一度お試しください。"
          );
        }
      }

      // ユーザードキュメントを更新
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        isOwner: true,
        updatedAt: new Date(),
      });

      Alert.alert("登録完了", "わんちゃんを登録しました", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("AccountMain", {
              shouldRefresh: true,
            });
          },
        },
      ]);
    } catch (error) {
      console.error("犬の登録に失敗しました:", error);
      Alert.alert("エラー", "犬の登録に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView style={styles.scrollView}>
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
              style={[
                styles.registerButton,
                isLoading && styles.disabledButton,
              ]}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
    backgroundColor: "#f8f9fa",
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 30,
    color: "#2c3e50",
  },
  imageContainer: {
    alignSelf: "center",
    marginBottom: 10,
  },
  placeholderContainer: {
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: 160,
    height: 160,
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
  uploadButton: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uploadButtonText: {
    color: "#2c3e50",
    fontWeight: "500",
  },
  label: {
    marginTop: 10,
    marginBottom: 5,
    alignSelf: "flex-start",
    color: "#6c757d",
    fontSize: 15,
  },
  input: {
    width: "100%",
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
    marginBottom: 15,
    color: "#2c3e50",
    fontSize: 16,
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
    borderColor: "#dee2e6",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pickerText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    color: "#FF9500",
    fontSize: 16,
    fontWeight: "500",
  },
  optionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
  },
  selectedOption: {
    backgroundColor: "#f8f9fa",
  },
  optionText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  selectedOptionText: {
    color: "#FF9500",
    fontWeight: "500",
  },
  unitText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#2c3e50",
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
    borderColor: "#FF9500",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioChecked: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF9500",
  },
  maleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4dabf7",
  },
  femaleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff6b6b",
  },
  textArea: {
    width: "100%",
    height: 120,
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 12,
    textAlignVertical: "top",
    padding: 12,
    marginBottom: 20,
    backgroundColor: "#ffffff",
    color: "#2c3e50",
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  registerButton: {
    backgroundColor: "#FF9500",
    borderRadius: 12,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
    marginVertical: 20,
    shadowColor: "#FF9500",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  registerButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#ffd0d0",
  },
});

export default RegisterDogScreen;
