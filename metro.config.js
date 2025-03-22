const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// アセットファイルの解決設定を追加
config.resolver.assetExts.push("json");

module.exports = config;
