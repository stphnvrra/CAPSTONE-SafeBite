import React from 'react';
import { StatusBar } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';

// Root component mounting the navigation container and setting status bar style
export default function App() {
  return (
    <React.Fragment>
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
    </React.Fragment>
  );
}
