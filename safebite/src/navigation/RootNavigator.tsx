import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MainMapScreen from '../screens/MainMapScreen';
import ARViewScreen from '../screens/ARViewScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainMap" component={MainMapScreen} />
        <Stack.Screen name="ARView" component={ARViewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


