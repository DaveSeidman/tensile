import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

const BENCH_MODEL_PATH = `${import.meta.env.BASE_URL}models/bench.glb`;
const BENCH_PLACEMENTS = [
  { position: [-2.75, 0, -3.35], rotationY: 0.42 },
  { position: [2.75, 0, -3.35], rotationY: -0.42 },
];

export default function CurvedBench() {
  const { scene } = useGLTF(BENCH_MODEL_PATH);
  const benches = useMemo(
    () =>
      BENCH_PLACEMENTS.map(({ position, rotationY }) => {
        const bench = scene.clone();
        bench.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
        });
        return { bench, position, rotationY };
      }),
    [scene],
  );

  return (
    <group>
      {benches.map(({ bench, position, rotationY }) => (
        <primitive
          key={`${position[0]}-${position[2]}`}
          object={bench}
          position={position}
          rotation={[0, rotationY, 0]}
        />
      ))}
    </group>
  );
}

useGLTF.preload(BENCH_MODEL_PATH);
