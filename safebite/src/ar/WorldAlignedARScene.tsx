import React, { useState, useEffect, useMemo } from 'react';
import { ViroARScene, ViroPolyline, ViroText, ViroMaterials } from '@viro-community/react-viro';
import { latLonToENU } from './geo';

type Props = { origin: { lat: number; lon: number }; route: Array<{ lat: number; lon: number }> };

export default function WorldAlignedARScene({ origin, route }: Props) {
  const [materialsReady, setMaterialsReady] = useState(false);
  const points = useMemo(() => {
    return route.map((p) => {
      const { east, north } = latLonToENU(origin, p);
      return [east / 10, 0, -north / 10] as [number, number, number]; // scale down for AR
    });
  }, [origin, route]);

  useEffect(() => {
    try {
      ViroMaterials.createMaterials({ routeBlue: { diffuseColor: '#2F80ED' } });
      setMaterialsReady(true);
    } catch (err) {
      console.warn('Viro materials unavailable', err);
      setMaterialsReady(false);
    }
  }, []);

  return (
    <ViroARScene>
      {materialsReady && (
        <ViroPolyline points={points} thickness={0.05} materials={['routeBlue']} />
      )}
      {!materialsReady && (
        <ViroText text="AR materials not ready" position={[0, 0, -1.2]} style={{ fontSize: 14, color: '#FFFFFF' }} />
      )}
      <ViroText text="World‑aligned path" position={[0, 0, -1]} style={{ fontSize: 14, color: '#FFFFFF' }} />
    </ViroARScene>
  );
}



