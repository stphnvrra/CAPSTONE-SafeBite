import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { Fonts } from '../theme/typography';
import { registerWithUsername } from '../lib/firebase';

export default function RegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async () => {
    if (!fullName || !username || !password) return Alert.alert('Validation', 'Fill all fields');
    try {
      await registerWithUsername(username.trim(), password, { fullName: fullName.trim() });
      Alert.alert('Success', 'Account created. Please log in.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Registration failed', e?.message ?? 'Unknown error');
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.logo}>SafeBite</Text>
      <View style={styles.card}>
        <Text style={styles.title}>Register</Text>
        <TextInput placeholder="Full Name" placeholderTextColor="#000" value={fullName} onChangeText={setFullName} style={styles.input} />
        <TextInput placeholder="Username" placeholderTextColor="#000" value={username} onChangeText={setUsername} style={styles.input} />
        <TextInput placeholder="Password" placeholderTextColor="#000" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
        <Pressable style={[styles.btn, styles.primary]} onPress={onSubmit}><Text style={styles.btnText}>Submit</Text></Pressable>
        <Pressable style={[styles.btn, styles.secondary]} onPress={() => navigation.goBack()}><Text style={styles.btnText}>Login</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEFEF', padding: 20 },
  logo: { fontSize: 32, color: '#2F80ED', fontFamily: Fonts.extraBold, letterSpacing: 0.5, marginBottom: 16 },
  card: { width: '88%', backgroundColor: '#F5F5F5', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E3E3E3' },
  title: { textAlign: 'center', fontFamily: Fonts.bold, marginBottom: 12, color: '#222' },
  input: { backgroundColor: '#FFF', color: '#000', borderRadius: 12, borderWidth: 1, borderColor: '#DDD', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, fontFamily: Fonts.regular },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  primary: { backgroundColor: '#2F80ED', elevation: 1 },
  secondary: { backgroundColor: '#4CAF50', elevation: 1 },
  btnText: { color: '#FFF', fontFamily: Fonts.bold },
});


