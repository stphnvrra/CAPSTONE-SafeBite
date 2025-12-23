// Babel configuration - tells Babel how to transform JavaScript/TypeScript code
// Uses React Native preset for mobile app compilation
module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
  ],
};
