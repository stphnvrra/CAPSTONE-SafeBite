import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ViroARSceneNavigator } from '@viro-community/react-viro';
import ARPolylineScene from '../ar/ARPolylineScene';
import WorldAlignedARScene from '../ar/WorldAlignedARScene';
import { getCurrentPosition } from '../lib/location';

export default function ARViewScreen({ navigation }: any) {
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [route, setRoute] = useState<Array<{ lat: number; lon: number }>>([]);

  useEffect(() => {
    // In a full flow, pass route coordinates via navigation params. Here we just set origin.
    getCurrentPosition().then(setOrigin).catch(() => {});
  }, []);
  return (
    <View style={styles.root}>
      {origin && route.length > 0 && (
        <ViroARSceneNavigator autofocus initialScene={{ scene: () => <WorldAlignedARScene origin={origin} route={route} /> as any }} />
      )}
      {(!origin || route.length === 0) && (
        <ViroARSceneNavigator autofocus initialScene={{ scene: ARPolylineScene }} />
      )}
      {/* HUD fallback overlay */}
      <View style={styles.hud} pointerEvents="none">
        <Text style={styles.hudText}>Follow arrow to destination</Text>
        <View style={styles.arrow} />
      </View>
      <Pressable style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.backText}>2D</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  back: { position: 'absolute', right: 16, top: 20, width: 42, height: 42, backgroundColor: '#000', opacity: 0.85, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#FFF', fontWeight: '700' },
  hud: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  hudText: { color: '#FFF', fontWeight: '700', marginBottom: 10 },
  arrow: { width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 24, borderStyle: 'solid', backgroundColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#2F80ED' },
});


