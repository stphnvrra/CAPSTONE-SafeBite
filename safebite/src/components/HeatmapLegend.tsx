import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Explains heat intensity; UI is a small overlay card with green→red swatches and Low/High labels
export default function HeatmapLegend() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Heatmap</Text>
      
      {/* Moderate entry */}
      <View style={styles.legendEntry}>
        <View style={[styles.swatch, { backgroundColor: 'rgb(255, 165, 0)' }]} />
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Moderate</Text>
          <Text style={styles.scoreRange}>2.1 - 3</Text>
        </View>
      </View>
      
      {/* High entry */}
      <View style={styles.legendEntry}>
        <View style={[styles.swatch, { backgroundColor: 'rgb(255, 0, 0)' }]} />
        <View style={styles.labelContainer}>
          <Text style={styles.label}>High</Text>
          <Text style={styles.scoreRange}>3.1 - 5+</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 15,
    top: 100,
    backgroundColor: 'rgba(255,255,255,0.50)', // Reduced opacity from 0.95 to 0.85
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    minWidth: 100,  // Add this line to set minimum width
  },
  title: { fontWeight: '700', marginBottom: 6, color: '#222' },
  legendEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  swatch: { 
    width: 12, 
    height: 12, 
    borderRadius: 2,
    marginRight: 8,
  },
  labelContainer: {
    flex: 1,
  },
  label: { 
    fontSize: 11, 
    color: '#333',
    marginBottom: 2,
  },
  scoreRange: { 
    fontSize: 9, 
    color: '#666', 
    fontWeight: '500',
  },
});


