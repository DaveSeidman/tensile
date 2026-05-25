import React, { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import {
  GAP,
  HOLDER_DEPTH,
  HOLDER_HEIGHT,
  HOLDER_RADIUS,
  HOLDER_WIDTH,
  SEGMENTS,
  STRIP_CENTER_Y,
  STRIP_DEPTH,
  STRIP_HEIGHT,
  STRIP_WIDTH,
} from './constants';

function makeStripGeometry({ top, bottom }) {
  const vertices = [];
  const indices = [];
  const halfWidth = STRIP_WIDTH / 2;
  const halfDepth = STRIP_DEPTH / 2;
  const corners = [
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
  ];
  const bottomAngle = Math.PI * bottom;
  const topAngle = Math.PI * top;

  for (let segment = 0; segment <= SEGMENTS; segment += 1) {
    const t = segment / SEGMENTS;
    const y = -STRIP_HEIGHT / 2 + STRIP_HEIGHT * t;
    const angle = bottomAngle + (topAngle - bottomAngle) * t;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);

    corners.forEach(([x, z]) => {
      vertices.push(x * ca - z * sa, y, x * sa + z * ca);
    });
  }

  for (let segment = 0; segment < SEGMENTS; segment += 1) {
    const current = segment * 4;
    const next = (segment + 1) * 4;
    indices.push(current, current + 1, next + 1, current, next + 1, next);
    indices.push(current + 1, current + 2, next + 2, current + 1, next + 2, next + 1);
    indices.push(current + 2, current + 3, next + 3, current + 2, next + 3, next + 2);
    indices.push(current + 3, current, next, current + 3, next, next + 3);
  }

  const topSegment = SEGMENTS * 4;
  indices.push(0, 1, 2, 0, 2, 3);
  indices.push(topSegment + 3, topSegment + 2, topSegment + 1, topSegment + 3, topSegment + 1, topSegment);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export default function Strip({ index, count, turns, material, holderMaterial }) {
  const geometry = useMemo(() => makeStripGeometry(turns), [turns]);
  const spacing = STRIP_WIDTH + GAP;
  const x = ((count - 1) * spacing) / 2 - index * spacing;
  const bottomAngle = Math.PI * turns.bottom;
  const topAngle = Math.PI * turns.top;

  return (
    <group position={[x, STRIP_CENTER_Y, 0]}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <RoundedBox
        args={[HOLDER_WIDTH, HOLDER_HEIGHT, HOLDER_DEPTH]}
        radius={HOLDER_RADIUS}
        smoothness={6}
        position={[0, -STRIP_HEIGHT / 2 - HOLDER_HEIGHT / 2, 0]}
        rotation={[0, -bottomAngle, 0]}
        material={holderMaterial}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[HOLDER_WIDTH, HOLDER_HEIGHT, HOLDER_DEPTH]}
        radius={HOLDER_RADIUS}
        smoothness={6}
        position={[0, STRIP_HEIGHT / 2 + HOLDER_HEIGHT / 2, 0]}
        rotation={[0, -topAngle, 0]}
        material={holderMaterial}
        castShadow
        receiveShadow
      />
    </group>
  );
}
