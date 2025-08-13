import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HeatmapLegend() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Heatmap</Text>
      <View style={styles.scaleRow}>
        <View style={[styles.swatch, { backgroundColor: 'rgb(0, 255, 0)' }]} />
        <View style={[styles.swatch, { backgroundColor: 'rgb(255, 0, 0)' }]} />
      </View>
      <View style={styles.labelsRow}>
        <Text style={styles.label}>Low</Text>
        <Text style={styles.label}>High</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 5,
    top: 30,
    backgroundColor: 'rgba(255,255,255,0.50)', // Reduced opacity from 0.95 to 0.85
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  title: { fontWeight: '700', marginBottom: 6, color: '#222' },
  scaleRow: { flexDirection: 'row', justifyContent:"space-between", gap: 4 },
  swatch: { width: 15, height: 10, borderRadius: 2 },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { fontSize: 10, color: '#555' },
});


