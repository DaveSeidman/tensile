import React, { useEffect, useMemo, useRef } from 'react';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import {
  CAMERA_POSITION,
  CAMERA_TARGET,
  FLOOR_LIGHTS,
  ORBIT_MAX_POLAR_ANGLE,
  ORBIT_MIN_POLAR_ANGLE,
} from './constants';
import CurvedBench from './CurvedBench';
import PostProcessing from './PostProcessing';
import Uplight from './Uplight';
import { makeSurfaceNormalTexture } from './textures';

export default function Workshop({ children, effects }) {
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const sceneSurfaces = effects.look === 'light'
    ? {
        background: '#f6f7f5',
        fog: '#f6f7f5',
        floor: '#f8f8f3',
        wall: '#ffffff',
        metalness: 0.42,
        roughness: 0.28,
      }
    : {
        background: '#050608',
        fog: '#050608',
        floor: '#3f4240',
        wall: '#595d5f',
        metalness: 0.18,
        roughness: 0.58,
      };
  const woodMaterial = useMemo(
    () => {
      const woodMap = new THREE.TextureLoader().load('/textures/bench-wood.png');
      woodMap.wrapS = THREE.RepeatWrapping;
      woodMap.wrapT = THREE.RepeatWrapping;
      woodMap.repeat.set(2.4, 0.7);
      woodMap.colorSpace = THREE.SRGBColorSpace;

      return new THREE.MeshStandardMaterial({
        color: '#8e5f35',
        map: woodMap,
        normalMap: makeSurfaceNormalTexture({ repeat: [3, 1], strength: 10 }),
        normalScale: new THREE.Vector2(0.18, 0.08),
        roughness: 0.46,
        metalness: 0,
      });
    },
    [],
  );
  const floorNormal = useMemo(() => makeSurfaceNormalTexture({ repeat: [18, 14], strength: 24 }), []);
  const wallNormal = useMemo(() => makeSurfaceNormalTexture({ repeat: [8, 5], strength: 10 }), []);

  useEffect(() => {
    const resetCamera = (event) => {
      if (event.key.toLowerCase() !== 'f' || !cameraRef.current || !controlsRef.current) return;

      cameraRef.current.position.set(...CAMERA_POSITION);
      controlsRef.current.target.set(...CAMERA_TARGET);
      controlsRef.current.update();
    };

    window.addEventListener('keydown', resetCamera);
    return () => window.removeEventListener('keydown', resetCamera);
  }, []);

  return (
    <>
      <color attach="background" args={[sceneSurfaces.background]} />
      {effects.look !== 'light' && <fog attach="fog" args={[sceneSurfaces.fog, 5, 11]} />}
      <ambientLight intensity={effects.ambient} />
      <hemisphereLight args={['#dfe8ff', '#20140c', effects.hemi]} />
      <pointLight
        position={[0, 2.8, -3.2]}
        color="#fff1dd"
        intensity={effects.key}
        distance={7.5}
        decay={2}
        shadow-bias={-0.00015}
        shadow-normalBias={0.025}
      />
      <pointLight position={[0, 1.35, -2]} color="#bcd1ff" intensity={effects.fill} distance={5.5} decay={2} />
      <Environment preset="warehouse" environmentIntensity={0.12} />
      <PerspectiveCamera ref={cameraRef} makeDefault position={CAMERA_POSITION} fov={42} />
      <OrbitControls
        ref={controlsRef}
        target={CAMERA_TARGET}
        minPolarAngle={ORBIT_MIN_POLAR_ANGLE}
        maxPolarAngle={ORBIT_MAX_POLAR_ANGLE}
        minDistance={3.2}
        maxDistance={8}
        enablePan={false}
        enableDamping
      />
      <PostProcessing enabled={effects.post} filmIntensity={effects.film} />

      <mesh position={[0, -0.035, 0.25]} receiveShadow>
        <boxGeometry args={[15, 0.07, 11]} />
        <meshStandardMaterial
          color={sceneSurfaces.floor}
          metalness={sceneSurfaces.metalness}
          roughness={sceneSurfaces.roughness}
          normalMap={floorNormal}
          normalScale={[0.28, 0.28]}
        />
      </mesh>
      <mesh position={[0, 2.1, 1.85]} receiveShadow>
        <boxGeometry args={[7.5, 4.4, 0.08]} />
        <meshStandardMaterial
          color={sceneSurfaces.wall}
          metalness={sceneSurfaces.metalness * 0.6}
          roughness={sceneSurfaces.roughness}
          normalMap={wallNormal}
          normalScale={[0.08, 0.08]}
        />
      </mesh>
      <CurvedBench woodMaterial={woodMaterial} />

      {FLOOR_LIGHTS.map(([x, y, z, color, intensity, rotationY]) => (
        <Uplight
          key={`${x}-${z}`}
          position={[x, y, z]}
          color={color}
          intensity={intensity * effects.floor}
          rotationY={rotationY}
        />
      ))}

      {children}
    </>
  );
}
