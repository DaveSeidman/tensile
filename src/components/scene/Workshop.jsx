import React, { useEffect, useMemo, useRef } from 'react';
import { Environment, MeshReflectorMaterial, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import {
  CAMERA_POSITION,
  CAMERA_TARGET,
  ORBIT_MAX_POLAR_ANGLE,
  ORBIT_MIN_POLAR_ANGLE,
} from './constants';
import autoshopEnvironment from '../../assets/images/autoshop_01_4k.exr';
import CurvedBench from './CurvedBench';
import FloorLamps from './FloorLamps';
import PostProcessing from './PostProcessing';

const CAMERA_LOOK_TARGET = new THREE.Vector3(...CAMERA_TARGET);

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

export default function Workshop({ children, effects, cameraMode }) {
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraPathStartRef = useRef(0);
  const environmentMap = useLoader(EXRLoader, autoshopEnvironment);
  const floorColor = useLoader(EXRLoader, 'textures/concrete_floor_worn_001_diff_1k.exr');

  const isDev = location.hostname === 'localhost';

  useMemo(() => {
    environmentMap.mapping = THREE.EquirectangularReflectionMapping;
    environmentMap.colorSpace = THREE.LinearSRGBColorSpace;
    environmentMap.needsUpdate = true;

    floorColor.wrapS = THREE.RepeatWrapping;
    floorColor.wrapT = THREE.RepeatWrapping;
    floorColor.needsUpdate = true;
    floorColor.colorSpace = THREE.SRGBColorSpace;
    floorColor.repeat.set(4, 3);
  }, [environmentMap, floorColor]);

  const sceneSurfaces = effects.look === 'light'
    ? {
      background: '#f7f7f4',
      floorTint: '#ffffff',
      floodTint: '#dce9f2',
      wallTint: '#ffffff',
      metalness: 0.45,
      roughness: 0.22,
    }
    : {
      background: '#050608',
      floorTint: '#8f9390',
      floodTint: '#27313a',
      wallTint: '#9ca0a4',
      metalness: 0.18,
      roughness: 0.58,
    };
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

  useEffect(() => {
    cameraPathStartRef.current = 0;
  }, [cameraMode]);

  useFrame(({ clock }) => {
    if (cameraMode === 'free' || !cameraRef.current) return;
    if (cameraPathStartRef.current === 0) cameraPathStartRef.current = clock.elapsedTime;

    const elapsed = clock.elapsedTime - cameraPathStartRef.current;
    const camera = cameraRef.current;

    if (cameraMode === 'sweep') {
      const yaw = Math.sin(elapsed * 0.42) * 0.48;
      const radius = 6.35;
      camera.position.set(Math.sin(yaw) * radius, 1.62, -Math.cos(yaw) * radius);
    }

    if (cameraMode === 'push') {
      const cycle = (Math.sin(elapsed * 0.28 - Math.PI / 2) + 1) / 2;
      const eased = smoothstep(cycle);
      camera.position.set(0, 1.48 + eased * 0.12, -7.2 + eased * 2.25);
    }

    if (cameraMode === 'crane') {
      const cycle = (Math.sin(elapsed * 0.34 - Math.PI / 2) + 1) / 2;
      const eased = smoothstep(cycle);
      camera.position.set(-2.1 + eased * 4.2, 1.05 + eased * 0.95, -5.25 + Math.sin(elapsed * 0.34) * 0.25);
    }

    camera.lookAt(CAMERA_LOOK_TARGET);
    if (controlsRef.current) {
      controlsRef.current.target.copy(CAMERA_LOOK_TARGET);
      controlsRef.current.update();
    }
  });

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
      <pointLight position={[0, 2.1, 1.45]} color="#dce7ff" intensity={effects.look === 'light' ? 3.5 : 5.5} distance={4.2} decay={2} />
      <Environment map={environmentMap} environmentIntensity={effects.look === 'light' ? 0.72 : 0.48} />
      <PerspectiveCamera ref={cameraRef} makeDefault position={CAMERA_POSITION} fov={42} />
      <OrbitControls
        ref={controlsRef}
        target={CAMERA_TARGET}
        enabled={cameraMode === 'free'}
        minPolarAngle={isDev ? 0 : ORBIT_MIN_POLAR_ANGLE}
        maxPolarAngle={isDev ? Math.PI : ORBIT_MAX_POLAR_ANGLE}
        minDistance={isDev ? undefined : 3.2}
        maxDistance={isDev ? undefined : 8}
        enablePan={isDev}
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
        />
      </mesh>
      <mesh position={[0, 0.006, 0.25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[15, 11]} />
        <MeshReflectorMaterial
          color={sceneSurfaces.floodTint}
          blur={[900, 320]}
          resolution={1024}
          mixBlur={effects.look === 'light' ? 1.55 : 1.22}
          mixStrength={effects.look === 'light' ? 2.2 : 3.35}
          mixContrast={effects.look === 'light' ? 0.98 : 1.18}
          mirror={effects.look === 'light' ? 0.54 : 0.74}
          depthScale={0.14}
          minDepthThreshold={0.25}
          maxDepthThreshold={1.45}
          roughness={effects.look === 'light' ? 0.18 : 0.12}
          metalness={0.05}
          envMapIntensity={effects.look === 'light' ? 1.5 : 1.85}
          transparent
          opacity={effects.look === 'light' ? 0.62 : 0.86}
        />
      </mesh>
      <mesh position={[0, 2.1, 1.85]} receiveShadow>
        <boxGeometry args={[7.5, 4.4, 0.08]} />
        <meshStandardMaterial
          color={sceneSurfaces.wallTint}
          map={effects.look === 'light' ? null : floorColor}
          metalness={sceneSurfaces.metalness * 0.6}
          roughness={sceneSurfaces.roughness}
        />
      </mesh>
      <CurvedBench />
      <FloorLamps floorIntensity={effects.floor} />

      {children}
    </>
  );
}
