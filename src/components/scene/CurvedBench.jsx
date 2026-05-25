import React, { useMemo } from 'react';
import * as THREE from 'three';

function makeBenchGeometry(startDegrees, endDegrees) {
  const outerRadius = 2.12;
  const innerRadius = 1.72;
  const start = THREE.MathUtils.degToRad(startDegrees);
  const end = THREE.MathUtils.degToRad(endDegrees);
  const steps = 22;
  const shape = new THREE.Shape();

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const angle = start + (end - start) * t;
    const x = Math.cos(angle) * outerRadius;
    const z = Math.sin(angle) * outerRadius;
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }

  for (let index = steps; index >= 0; index -= 1) {
    const t = index / steps;
    const angle = start + (end - start) * t;
    shape.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
  }

  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
}

function BenchSection({ start, end, xOffset, rotationY, woodMaterial }) {
  const geometry = useMemo(() => makeBenchGeometry(start, end), [end, start]);
  const legAngles = useMemo(() => [start + (end - start) * 0.18, start + (end - start) * 0.82], [end, start]);

  return (
    <group position={[xOffset, 0.36, -1.28]} rotation={[0, rotationY, 0]}>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} material={woodMaterial} castShadow receiveShadow />
      {legAngles.map((angleInDegrees) => {
        const angle = THREE.MathUtils.degToRad(angleInDegrees);
        return (
          <mesh
            key={angleInDegrees}
            position={[Math.cos(angle) * 1.92, -0.19, Math.sin(angle) * 1.92]}
            rotation={[0, Math.PI / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.07, 0.34, 0.34]} />
            <meshStandardMaterial color="#262a2d" metalness={0.4} roughness={0.32} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function CurvedBench({ woodMaterial }) {
  return (
    <>
      <BenchSection
        start={146}
        end={190}
        xOffset={-0.28}
        rotationY={THREE.MathUtils.degToRad(-50)}
        woodMaterial={woodMaterial}
      />
      <BenchSection
        start={34}
        end={-10}
        xOffset={0.28}
        rotationY={THREE.MathUtils.degToRad(50)}
        woodMaterial={woodMaterial}
      />
    </>
  );
}
