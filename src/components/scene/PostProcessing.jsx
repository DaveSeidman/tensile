import React from 'react';
import { DepthOfField, EffectComposer, Noise, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';

export default function PostProcessing({ enabled, filmIntensity }) {
  if (!enabled) return null;

  return (
    <EffectComposer multisampling={4}>
      <DepthOfField
        focusDistance={0.018}
        focalLength={0.028}
        bokehScale={0.85}
        height={480}
      />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={filmIntensity} />
      <ToneMapping mode={ToneMappingMode.AGX} />
    </EffectComposer>
  );
}
