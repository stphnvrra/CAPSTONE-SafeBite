import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MainMapScreen from '../screens/MainMapScreen';

const Stack = createNativeStackNavigator();

// Configures root navigation; UI is a full-screen stack with Login, Register, and MainMap (headers hidden)
export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false, detachInactiveScreens: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainMap" component={MainMapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


