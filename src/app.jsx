import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Controls from './components/controls';
import Scene from './components/scene';
import './index.scss';

const MAX_STRIPS = 24;
const DEFAULT_MATERIAL = {
  color: '#d2cec0',
  finish: 'gloss',
  transmission: 0,
};
const DEFAULT_EFFECTS = {
  look: 'dark',
  ambient: 0.07,
  hemi: 0.22,
  key: 10,
  fill: 2.2,
  floor: 1.25,
  film: 0.22,
  post: false,
};

export default function App() {
  const [stripCount, setStripCount] = useState(18);
  const [turns, setTurns] = useState(() => Array.from({ length: MAX_STRIPS }, () => ({ top: 0, bottom: 0 })));
  const [playing, setPlaying] = useState(true);
  const [presetMode, setPresetMode] = useState(true);
  const [frame, setFrame] = useState(0);
  const [materialSettings, setMaterialSettings] = useState(DEFAULT_MATERIAL);
  const [effects, setEffects] = useState(DEFAULT_EFFECTS);
  const [cameraMode, setCameraMode] = useState('free');
  const [devOpen, setDevOpen] = useState(false);

  useEffect(() => {
    const toggleDev = (event) => {
      if (event.key !== 'F1') return;
      event.preventDefault();
      setDevOpen((current) => !current);
    };

    window.addEventListener('keydown', toggleDev);
    return () => window.removeEventListener('keydown', toggleDev);
  }, []);

  return (
    <main className="app">
      <Canvas className="app__canvas" shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <Scene
          stripCount={stripCount}
          turns={turns}
          playing={playing}
          presetMode={presetMode}
          frame={frame}
          setFrame={setFrame}
          materialSettings={materialSettings}
          effects={effects}
          cameraMode={cameraMode}
        />
      </Canvas>
      {devOpen && (
        <section className="dev-panel">
          <header>
            <strong>Lighting</strong>
            <span>F1</span>
          </header>
          {[
            ['ambient', 'Ambient', 0, 0.6, 0.01],
            ['hemi', 'Hemisphere', 0, 1.2, 0.01],
            ['key', 'Key', 0, 40, 0.5],
            ['fill', 'Fill', 0, 16, 0.25],
            ['floor', 'Floor lights', 0, 1.8, 0.05],
            ['film', 'Film noise', 0, 0.6, 0.01],
          ].map(([key, label, min, max, step]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={effects[key]}
                onChange={(event) => setEffects((current) => ({ ...current, [key]: Number(event.target.value) }))}
              />
            </label>
          ))}
          <button type="button" onClick={() => setEffects((current) => ({ ...current, post: !current.post }))}>
            Post {effects.post ? 'On' : 'Off'}
          </button>
        </section>
      )}
      <Controls
        stripCount={stripCount}
        setStripCount={setStripCount}
        turns={turns}
        setTurns={setTurns}
        playing={playing}
        setPlaying={setPlaying}
        presetMode={presetMode}
        setPresetMode={setPresetMode}
        frame={frame}
        setFrame={setFrame}
        materialSettings={materialSettings}
        setMaterialSettings={setMaterialSettings}
        effects={effects}
        setEffects={setEffects}
        cameraMode={cameraMode}
        setCameraMode={setCameraMode}
      />
    </main>
  );
}
