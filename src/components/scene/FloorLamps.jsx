import React, { useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const FLOOR_LAMPS_MODEL_PATH = `${import.meta.env.BASE_URL}models/floor-lamps.glb`;

export default function FloorLamps({ floorIntensity }) {
  const { scene } = useGLTF(FLOOR_LAMPS_MODEL_PATH);
  const lamps = useMemo(() => {
    const instance = clone(scene);
    instance.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }

      if (child.isLight) {
        child.castShadow = true;
        child.userData.baseIntensity = child.intensity;
      }
    });
    return instance;
  }, [scene]);

  useLayoutEffect(() => {
    lamps.traverse((child) => {
      if (!child.isLight) return;
      child.intensity = child.userData.baseIntensity * floorIntensity;
    });
  }, [floorIntensity, lamps]);

  return <primitive object={lamps} />;
}

useGLTF.preload(FLOOR_LAMPS_MODEL_PATH);
