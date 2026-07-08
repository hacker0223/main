const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...config.watchFolders, workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Windows' fallback file watcher (no Watchman) crashes with ENOENT walking
// react-native's native Android/iOS/C++ source trees. They're irrelevant to
// JS bundling, so exclude them from both watching and resolution.
config.resolver.blockList = [
  /node_modules[\\/]react-native[\\/]ReactAndroid[\\/].*/,
  /node_modules[\\/]react-native[\\/]ReactCommon[\\/].*/,
  /node_modules[\\/]react-native[\\/]sdks[\\/].*/,
];

module.exports = config;
