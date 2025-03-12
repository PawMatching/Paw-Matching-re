// src/navigation/TabNavigator.tsx
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { RootTabParamList } from "./types";
import HomeStackNavigator from "./stacks/HomeStackNavigator";
import SearchStackNavigator from "./stacks/SearchStackNavigator";
import MatchingStackNavigator from "./stacks/MatchingStackNavigator";
import ChatStackNavigator from "./stacks/ChatStackNavigator";
import AccountStackNavigator from "./stacks/AccountStackNavigator";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

const Tab = createBottomTabNavigator<RootTabParamList>();

const TabNavigator = () => {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    // ユーザーがログアウトした場合はカウントをリセット
    if (!currentUser) {
      setPendingRequestsCount(0);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    
    // 認証トークンが反映されるまで少し待つ
    const timer = setTimeout(() => {
      const db = getFirestore();

      // まず自分の犬のIDを取得する関数
      const fetchMyDogIds = async () => {
        try {
          const dogsRef = collection(db, "dogs");
          const dogsQuery = query(dogsRef, where("userID", "==", currentUser.uid));
          const dogsSnapshot = await getDocs(dogsQuery);
          return dogsSnapshot.docs.map(doc => doc.id);
        } catch (error) {
          console.error("Error fetching dog IDs:", error);
          return [];
        }
      };
      
      // 自分の犬のIDを取得して、それに対する申請を監視
      fetchMyDogIds().then(dogIds => {
        if (dogIds.length === 0) return;
        
        // Firestoreの制限（in句に最大10個まで）のため、分割処理
        const batchSize = 10;
        
        for (let i = 0; i < dogIds.length; i += batchSize) {
          const batch = dogIds.slice(i, i + batchSize);
          
          // 自分の犬に対する未処理の申請を監視
          const appliesRef = collection(db, "applies");
          const q = query(
            appliesRef,
            where("dogID", "in", batch),
            where("status", "==", "pending")
          );
          
          const unsubscribe = onSnapshot(q, (snapshot) => {
            // 各バッチでのカウント
            const batchCount = snapshot.docs.length;
            
            // 全体のカウントを更新
            setPendingRequestsCount(batchCount);
          }, (error) => {
            console.error("Error in snapshot listener:", error);
          });
          
          unsubscribes.push(unsubscribe);
        }
      }).catch(error => {
        console.error("Error setting up listeners:", error);
      });
    }, 2500); // 2.5秒待つ
    
    // クリーンアップ関数を適切に返す
    return () => {
      clearTimeout(timer); // タイマーをクリア
      
      // すべてのリスナーを解除するコード
      unsubscribes.forEach(unsub => {
        if (typeof unsub === 'function') {
          unsub();
        }
      });
    };
  }, [currentUser]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#4dabf7",
        tabBarInactiveTintColor: "#adb5bd",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          tabBarLabel: "ホーム",
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
          tabBarLabel: "さがす",
        }}
      />
      <Tab.Screen
        name="Matching"
        component={MatchingStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="heart-outline" size={size} color={color} />
              {pendingRequestsCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    right: -6,
                    top: -3,
                    backgroundColor: "#ff6b6b",
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {pendingRequestsCount}
                  </Text>
                </View>
              )}
            </View>
          ),
          tabBarLabel: "マッチング",
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
          tabBarLabel: "チャット",
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          tabBarLabel: "アカウント",
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
