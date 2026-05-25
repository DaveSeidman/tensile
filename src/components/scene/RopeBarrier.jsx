import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ROPE_POSTS } from './constants';

function VelvetRope({ points, material }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      false,
      'catmullrom',
      0.55,
    );
    return new THREE.TubeGeometry(curve, 72, 0.026, 18, false);
  }, [points]);

  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

function Post({ position, material }) {
  const [x, height, z] = position;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.012, 0]} material={material} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.27, 0.024, 56]} />
      </mesh>
      <mesh position={[0, 0.04, 0]} material={material} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.19, 0.03, 56]} />
      </mesh>
      <mesh position={[0, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]} material={material} castShadow receiveShadow>
        <torusGeometry args={[0.145, 0.008, 10, 56]} />
      </mesh>
      <mesh position={[0, height / 2, 0]} material={material} castShadow receiveShadow>
        <cylinderGeometry args={[0.044, 0.052, height - 0.12, 40]} />
      </mesh>
      <mesh position={[0, height - 0.18, 0]} rotation={[Math.PI / 2, 0, 0]} material={material} castShadow receiveShadow>
        <torusGeometry args={[0.066, 0.009, 10, 40]} />
      </mesh>
      <mesh position={[0, height - 0.105, 0]} material={material} castShadow receiveShadow>
        <cylinderGeometry args={[0.072, 0.056, 0.11, 40]} />
      </mesh>
      <mesh position={[0, height, 0]} material={material} castShadow receiveShadow>
        <sphereGeometry args={[0.078, 36, 18]} />
      </mesh>
      <mesh position={[0, height + 0.085, 0]} material={material} castShadow receiveShadow>
        <cylinderGeometry args={[0.038, 0.052, 0.09, 32]} />
      </mesh>
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]} material={material} castShadow receiveShadow>
        <torusGeometry args={[0.13, 0.012, 10, 40]} />
      </mesh>
    </group>
  );
}

function RopeHook({ from, to, material }) {
  const angle = Math.atan2(to[0] - from[0], to[2] - from[2]);

  return (
    <group position={[from[0], from[1] - 0.015, from[2]]} rotation={[0, angle, 0]}>
      <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]} material={material} castShadow receiveShadow>
        <torusGeometry args={[0.052, 0.008, 10, 28, Math.PI * 1.55]} />
      </mesh>
      <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]} material={material} castShadow receiveShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.1, 16]} />
      </mesh>
      <mesh position={[0, 0, 0.145]} rotation={[Math.PI / 2, 0, 0]} material={material} castShadow receiveShadow>
        <sphereGeometry args={[0.018, 16, 8]} />
      </mesh>
    </group>
  );
}

export default function RopeBarrier({ metalMaterial, ropeMaterial }) {
  const ropePoints = ROPE_POSTS.flatMap((post, index) => {
    if (index === ROPE_POSTS.length - 1) return [post];

    const next = ROPE_POSTS[index + 1];
    return [
      post,
      [(post[0] + next[0]) / 2, post[1] - 0.16, (post[2] + next[2]) / 2],
    ];
  });

  return (
    <group>
      {ROPE_POSTS.map((post) => (
        <React.Fragment key={`${post[0]}-${post[2]}`}>
          <Post position={post} material={metalMaterial} />
          {ROPE_POSTS.map((candidate, index, posts) => {
            const postIndex = posts.indexOf(post);
            if (Math.abs(index - postIndex) !== 1) return null;
            return <RopeHook key={`${post[0]}-${candidate[0]}`} from={post} to={candidate} material={metalMaterial} />;
          })}
        </React.Fragment>
      ))}
      <VelvetRope points={ropePoints} material={ropeMaterial} />
    </group>
  );
}
