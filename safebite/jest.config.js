module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.(js|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@gorhom|@rnmapbox|@react-native-firebase)/)'
  ],
  setupFilesAfterEnv: [],
};

module.exports = {
  preset: 'react-native',
};
