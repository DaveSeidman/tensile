import React, { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

export default function PostProcessing({ enabled, filmIntensity }) {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const nextComposer = new EffectComposer(gl);
    nextComposer.addPass(new RenderPass(scene, camera));
    nextComposer.addPass(
      new BokehPass(scene, camera, {
        focus: 6.45,
        aperture: 0.00058,
        maxblur: 0.016,
      }),
    );
    nextComposer.addPass(new FilmPass(filmIntensity, false));
    nextComposer.addPass(new OutputPass());
    return nextComposer;
  }, [camera, filmIntensity, gl, scene]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size.height, size.width]);

  useEffect(
    () => () => {
      composer.dispose();
    },
    [composer],
  );

  useFrame((_, delta) => {
    if (!enabled) return;
    composer.render(delta);
  }, 1);

  return null;
}
