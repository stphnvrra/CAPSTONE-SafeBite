import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

type Props = { visible: boolean; onConfirm: () => void; onCancel: () => void };

export default function LogoutModal({ visible, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Are you sure?</Text>
          <Pressable style={[styles.btn, styles.yes]} onPress={onConfirm}><Text style={styles.btnText}>Yes</Text></Pressable>
          <Text style={styles.or}>or</Text>
          <Pressable style={[styles.btn, styles.no]} onPress={onCancel}><Text style={styles.btnText}>No</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '80%', backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16, alignItems: 'center' },
  title: { fontWeight: '700', marginBottom: 12, color: '#000' },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', width: '70%', marginTop: 6 },
  yes: { backgroundColor: '#D9534F' },
  no: { backgroundColor: '#4CAF50' },
  btnText: { color: '#FFF', fontWeight: '700' },
  or: { marginVertical: 6, color: '#666' },
});


