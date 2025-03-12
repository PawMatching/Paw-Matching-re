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
  getDoc,
  doc,
} from "firebase/firestore";

const Tab = createBottomTabNavigator<RootTabParamList>();

const TabNavigator = () => {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const db = getFirestore();
    const appliesRef = collection(db, "applies");

    // 自分の犬に対する未処理の申請を監視
    const unsubscribe = onSnapshot(
      query(appliesRef, where("status", "==", "pending")),
      async (snapshot) => {
        let count = 0;
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          // 自分の犬に対する申請かどうかを確認
          const dogDocRef = doc(db, "dogs", data.dogID);
          const dogDocSnapshot = await getDoc(dogDocRef);
          if (
            dogDocSnapshot.exists() &&
            dogDocSnapshot.data()?.userID === currentUser.uid
          ) {
            count++;
          }
        }
        setPendingRequestsCount(count);
      }
    );

    return () => unsubscribe();
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
