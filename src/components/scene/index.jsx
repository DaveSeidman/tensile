import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_FRAME, sequenceValue } from '../../demoSequence';
import { MATERIAL_FINISHES } from './constants';
import RopeBarrier from './RopeBarrier';
import Strip from './Strip';
import Workshop from './Workshop';
import './index.scss';

export default function Scene({ stripCount, turns, playing, presetMode, frame, setFrame, materialSettings, effects, cameraMode }) {
  const finish = MATERIAL_FINISHES[materialSettings.finish] ?? MATERIAL_FINISHES.satin;
  const stripMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: materialSettings.color,
        roughness: finish.roughness,
        metalness: 0,
        clearcoat: finish.clearcoat,
        clearcoatRoughness: 0.35,
        envMapIntensity: effects.look === 'light' ? 1.35 : 1.8,
        transmission: Math.max(materialSettings.transmission, finish.transmission),
        thickness: 0.22,
        transparent: materialSettings.transmission > 0 || finish.transmission > 0,
        opacity: materialSettings.transmission > 0 || finish.transmission > 0 ? 0.72 : 1,
        side: THREE.DoubleSide,
        shadowSide: THREE.FrontSide,
      }),
    [effects.look, finish.clearcoat, finish.roughness, finish.transmission, materialSettings.color, materialSettings.transmission],
  );
  const holderMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#b9bdc2',
        metalness: 1,
        roughness: 0.018,
        clearcoat: 1,
        clearcoatRoughness: 0.01,
        envMapIntensity: 5.2,
      }),
    [],
  );
  const stemMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#020304',
        metalness: 0.85,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 4.4,
      }),
    [],
  );
  const ropeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#7d101d',
        roughness: 0.78,
        metalness: 0,
      }),
    [],
  );
  const floorHardwareMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#f4f7fb',
        metalness: 1,
        roughness: 0.025,
        clearcoat: 1,
        clearcoatRoughness: 0.015,
        envMapIntensity: 5.6,
      }),
    [],
  );

  useFrame((_, delta) => {
    if (!playing) return;
    setFrame((current) => (current + delta * 24) % MAX_FRAME);
  });

  return (
    <Workshop effects={effects} cameraMode={cameraMode}>
      <RopeBarrier metalMaterial={holderMaterial} ropeMaterial={ropeMaterial} />
      {Array.from({ length: stripCount }, (_, index) => {
        const presetTurns = sequenceValue(frame, index, stripCount);
        const manualTurns = typeof turns[index] === 'number' ? { top: turns[index], bottom: -turns[index] } : turns[index];
        const activeTurns = presetMode ? presetTurns : manualTurns ?? { top: 0, bottom: 0 };
        return (
          <Strip
            key={index}
            index={index}
            count={stripCount}
            turns={activeTurns}
            material={stripMaterial}
            holderMaterial={holderMaterial}
            stemMaterial={stemMaterial}
            floorHardwareMaterial={floorHardwareMaterial}
          />
        );
      })}
    </Workshop>
  );
}
