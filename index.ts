// index.ts
import "react-native-gesture-handler";
import { AppRegistry } from "react-native";
import { registerRootComponent } from "expo";
import App from "./App";

// 明示的にAppRegistryに登録
AppRegistry.registerComponent("main", () => App);

// Expoのregisterを維持
registerRootComponent(App);
