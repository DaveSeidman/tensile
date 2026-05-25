import React, { useEffect, useMemo, useRef } from 'react';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
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

export default function Workshop({ children, effects }) {
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const [benchColor, benchNormal, benchRoughness, floorColor, floorNormal, floorRoughness, wallColor, wallNormal, wallRoughness] =
    useLoader(EXRLoader, [
      'textures/weathered_planks_diff_1k.exr',
      'textures/weathered_planks_nor_dx_1k.exr',
      'textures/weathered_planks_rough_1k.exr',
      'textures/concrete_floor_worn_001_diff_1k.exr',
      'textures/concrete_floor_worn_001_nor_dx_1k.exr',
      'textures/concrete_floor_worn_001_rough_1k.exr',
      'textures/concrete_floor_worn_001_diff_1k.exr',
      'textures/concrete_floor_worn_001_nor_dx_1k.exr',
      'textures/concrete_floor_worn_001_rough_1k.exr',
    ]);

  useMemo(() => {
    [benchColor, benchNormal, benchRoughness, floorColor, floorNormal, floorRoughness, wallColor, wallNormal, wallRoughness].forEach((texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.needsUpdate = true;
    });

    benchColor.colorSpace = THREE.SRGBColorSpace;
    floorColor.colorSpace = THREE.SRGBColorSpace;
    wallColor.colorSpace = THREE.SRGBColorSpace;

    benchColor.repeat.set(2.2, 0.9);
    benchNormal.repeat.set(2.2, 0.9);
    benchRoughness.repeat.set(2.2, 0.9);

    floorColor.repeat.set(4, 3);
    floorNormal.repeat.set(18, 14);
    floorRoughness.repeat.set(4, 3);

    wallColor.repeat.set(2.5, 1.6);
    wallNormal.repeat.set(8, 5);
    wallRoughness.repeat.set(2.5, 1.6);
  }, [benchColor, benchNormal, benchRoughness, floorColor, floorNormal, floorRoughness, wallColor, wallNormal, wallRoughness]);

  const sceneSurfaces = effects.look === 'light'
    ? {
      background: '#f7f7f4',
      floorTint: '#ffffff',
      wallTint: '#ffffff',
      metalness: 0.45,
      roughness: 0.22,
    }
    : {
      background: '#050608',
      floorTint: '#8f9390',
      wallTint: '#9ca0a4',
      metalness: 0.18,
      roughness: 0.58,
    };
  const woodMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#b38a63',
        map: benchColor,
        normalMap: benchNormal,
        roughnessMap: benchRoughness,
        roughness: 0.92,
        metalness: 0,
        normalScale: new THREE.Vector2(0.45, 0.28),
      }),
    [benchColor, benchNormal, benchRoughness],
  );

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
      {effects.look !== 'light' && <fog attach="fog" args={['#050608', 5, 11]} />}
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
          color={sceneSurfaces.floorTint}
          map={effects.look === 'light' ? null : floorColor}
          metalness={sceneSurfaces.metalness}
          roughness={sceneSurfaces.roughness}
          normalMap={floorNormal}
          roughnessMap={floorRoughness}
          normalScale={[0.35, 0.35]}
        />
      </mesh>
      <mesh position={[0, 2.1, 1.85]} receiveShadow>
        <boxGeometry args={[7.5, 4.4, 0.08]} />
        <meshStandardMaterial
          color={sceneSurfaces.wallTint}
          map={effects.look === 'light' ? null : wallColor}
          metalness={sceneSurfaces.metalness * 0.6}
          roughness={sceneSurfaces.roughness}
          normalMap={wallNormal}
          roughnessMap={wallRoughness}
          normalScale={[0.1, 0.1]}
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
