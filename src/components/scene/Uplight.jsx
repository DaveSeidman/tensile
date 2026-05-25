import React, { useLayoutEffect, useRef } from 'react';

export default function Uplight({ position, color, intensity, rotationY }) {
  const lightRef = useRef(null);
  const targetRef = useRef(null);
  const [, y] = position;

  useLayoutEffect(() => {
    if (!lightRef.current || !targetRef.current) return;
    lightRef.current.target = targetRef.current;
    lightRef.current.target.updateMatrixWorld();
  }, []);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <object3D ref={targetRef} position={[0, 2.14 - y, 1.28]} />
      <mesh rotation={[-0.17, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.44, 0.12, 0.25]} />
        <meshStandardMaterial color="#121316" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.075, 0.03]} rotation={[-0.48, 0, 0]}>
        <boxGeometry args={[0.36, 0.075, 0.035]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={4.2} roughness={0.18} />
      </mesh>
      <spotLight
        ref={lightRef}
        position={[0, 0.12, 0.02]}
        color={color}
        intensity={intensity}
        angle={0.92}
        penumbra={0.9}
        distance={8.5}
        shadow-bias={-0.00025}
        shadow-normalBias={0.025}
        castShadow
      />
    </group>
  );
}
