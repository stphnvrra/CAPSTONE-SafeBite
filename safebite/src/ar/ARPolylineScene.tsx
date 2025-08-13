import React, { useState, useEffect } from 'react';
import { ViroARScene, ViroText, ViroPolyline, ViroMaterials } from '@viro-community/react-viro';

export default function ARPolylineScene() {
  const [state, setState] = useState<'initializing' | 'tracking' | 'limited'>('initializing');
  const [materialsReady, setMaterialsReady] = useState(false);

  const onTrackingUpdated = (status: number) => {
    // Using numeric constants since ViroConstants might not be available
    switch (status) {
      case 3: // TRACKING_NORMAL
        setState('tracking');
        break;
      case 1: // TRACKING_NONE
      default:
        setState('limited');
        break;
    }
  };

  // Simple forward polyline in front of the device to simulate a route
  const points: [number, number, number][] = [
    [0, 0, -0.5],
    [0, 0, -1],
    [0, 0, -2],
    [0, 0, -3],
  ];

  useEffect(() => {
    // Register a simple blue material when native module is available.
    try {
      ViroMaterials.createMaterials({ routeBlue: { diffuseColor: '#2F80ED' } });
      setMaterialsReady(true);
    } catch (err) {
      console.warn('Viro materials unavailable, AR polyline disabled', err);
      setMaterialsReady(false);
    }
  }, []);

  return (
    <ViroARScene onTrackingUpdated={onTrackingUpdated}>
      {state !== 'tracking' && (
        <ViroText text="Move phone to detect surface…" position={[0, 0, -1]} style={{ fontSize: 20, color: '#FFFFFF' }} />
      )}
      {materialsReady && (
        <ViroPolyline points={points} thickness={0.05} materials={['routeBlue']} />
      )}
      {!materialsReady && (
        <ViroText text="AR materials not ready" position={[0, 0, -1.2]} style={{ fontSize: 14, color: '#FFFFFF' }} />
      )}
    </ViroARScene>
  );
}

