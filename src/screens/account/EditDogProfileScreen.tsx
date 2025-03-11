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
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { db } from "../../config/firebase";
import { getStorage } from "firebase/storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { AccountStackParamList } from "../../navigation/types";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuthState } from "../../hooks/useAuthState";
import RNPickerSelect from "react-native-picker-select";

type EditDogProfileScreenRouteProp = RouteProp<
  AccountStackParamList,
  "EditDogProfile"
>;

const EditDogProfileScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const route = useRoute<EditDogProfileScreenRouteProp>();
  const storage = getStorage();
  const { user } = useAuthState();
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [likes, setLikes] = useState("");
  const [remarks, setRemarks] = useState("");
  const [image, setImage] = useState<string | null>(null);

  // 年齢の選択肢を生成（0〜20歳）
  const ageOptions = Array.from({ length: 21 }, (_, i) => ({
    label: `${i}`,
    value: i.toString(),
  }));

  useEffect(() => {
    const fetchDogProfile = async () => {
      if (!user) return;

      try {
        const dogDocRef = doc(db, "dogs", user.uid);
        const dogDoc = await getDoc(dogDocRef);

        if (!dogDoc.exists()) {
          Alert.alert("エラー", "犬のプロフィール情報が見つかりませんでした");
          navigation.goBack();
          return;
        }

        const dogData = dogDoc.data();
        setName(dogData.dogname || "");
        setAge(dogData.age ? dogData.age.toString() : "");
        setGender(dogData.sex || "");
        setLikes(dogData.likes || "");
        setRemarks(dogData.notes || "");
        if (dogData.profileImage) {
          setImage(dogData.profileImage);
        }
      } catch (error) {
        console.error("犬のプロフィール取得エラー:", error);
        Alert.alert("エラー", "犬のプロフィール情報の取得に失敗しました");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchDogProfile();
  }, [user]);

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

  const uploadImage = async (uri: string, userId: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const storageRef = ref(storage, `dogs/${userId}/profile/dogImage`);
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

      let imageUrl = image;
      if (image && !image.startsWith("http")) {
        try {
          imageUrl = await uploadImage(image, user.uid);
        } catch (uploadError) {
          console.error("画像アップロードエラー:", uploadError);
          Alert.alert(
            "画像アップロードエラー",
            "プロフィール画像のアップロードに失敗しました。後でもう一度お試しください。"
          );
        }
      }

      const dogDocRef = doc(db, "dogs", user.uid);
      await updateDoc(dogDocRef, {
        dogname: name,
        age: parseInt(age),
        sex: gender,
        likes: likes,
        notes: remarks,
        profileImage: imageUrl,
        updatedAt: new Date(),
      });

      Alert.alert("更新完了", "わんちゃんのプロフィールを更新しました", [
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
      console.error("更新エラー:", error);
      Alert.alert(
        "エラー",
        "プロフィールの更新に失敗しました。もう一度お試しください。"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f9a8a8" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.header}>わんちゃんプロフィール編集</Text>

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
          <Text style={styles.uploadButtonText}>画像を変更</Text>
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
          <View style={styles.pickerContainer}>
            <RNPickerSelect
              value={age}
              items={ageOptions}
              onValueChange={(value) => setAge(value)}
              style={{
                inputIOS: {
                  fontSize: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 4,
                  color: "black",
                  paddingRight: 30,
                  backgroundColor: "white",
                },
                inputAndroid: {
                  fontSize: 16,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 4,
                  color: "black",
                  paddingRight: 30,
                  backgroundColor: "white",
                },
                iconContainer: {
                  top: 10,
                  right: 12,
                },
              }}
              useNativeAndroidPickerStyle={false}
              placeholder={{ label: "選択してください", value: "" }}
              Icon={() => (
                <MaterialIcons name="arrow-drop-down" size={24} color="#999" />
              )}
            />
          </View>
          <Text style={styles.unitText}>才</Text>
        </View>

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

        {/* 更新ボタン */}
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
  updateButton: {
    backgroundColor: "#f9a8a8",
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

export default EditDogProfileScreen;
