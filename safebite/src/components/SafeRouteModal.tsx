import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  onProceed: () => void;
  onCancel: () => void;
};

// Warns when no fully safe route exists; UI is a dark modal with warning text and Cancel/Proceed buttons
export default function SafeRouteModal({ visible, onProceed, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>No Safe Route</Text>
          </View>
          <Text style={styles.message}>
            A route that avoids high-risk streets is not available. You can proceed via the
            lowest-risk route, which may pass through high-risk areas.
          </Text>

          <View style={styles.actionsRow}>
            <Pressable accessibilityRole="button" style={[styles.action, styles.cancel]} onPress={onCancel}>
              <Text style={[styles.actionText, styles.cancelText]}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={[styles.action, styles.proceed]} onPress={onProceed}>
              <Text style={styles.actionText}>Proceed Anyway</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '88%', backgroundColor: '#1F242B', borderRadius: 16, padding: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { fontSize: 22, marginRight: 8 },
  title: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  message: { color: '#D1D5DB', marginTop: 6, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  action: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  cancel: { borderWidth: 1, borderColor: '#9CA3AF', marginRight: 8 },
  cancelText: { color: '#E5E7EB' },
  proceed: { backgroundColor: '#2F80ED' },
  actionText: { color: '#FFFFFF', fontWeight: '700' },
});


