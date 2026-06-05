import React, { useRef, useState } from 'react';
import { MAX_FRAME, sequenceValue } from '../../demoSequence';
import './index.scss';

const MAX_STRIPS = 24;
const FINISHES = [
  ['matte', 'Matte'],
  ['satin', 'Satin'],
  ['gloss', 'Gloss'],
];
const ENVIRONMENTS = [
  ['dark', 'Dark', { look: 'dark', ambient: 0.07, hemi: 0.22, key: 10, fill: 2.2, floor: 1.25, film: 0.22 }],
  ['light', 'Bright', { look: 'light', ambient: 0.28, hemi: 0.72, key: 30, fill: 10, floor: 0.8, film: 0.08 }],
];
const CAMERA_MODES = [
  ['free', 'Free'],
  ['sweep', 'Sweep'],
  ['push', 'Push'],
  ['crane', 'Crane'],
];

function getMotorValue({ presetMode, frame, stripCount, turns, index, motor }) {
  if (presetMode) {
    return sequenceValue(frame, index, stripCount)[motor];
  }

  return turns[index]?.[motor] ?? 0;
}

function getSwatchIconColor(hex) {
  const value = hex.replace('#', '');
  const expanded = value.length === 3 ? value.split('').map((char) => `${char}${char}`).join('') : value;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 160 ? '#111318' : '#f7f8fa';
}

export default function Controls({
  stripCount,
  setStripCount,
  turns,
  setTurns,
  playing,
  setPlaying,
  presetMode,
  setPresetMode,
  frame,
  setFrame,
  materialSettings,
  setMaterialSettings,
  effects,
  setEffects,
  cameraMode,
  setCameraMode,
}) {
  const [lookOpen, setLookOpen] = useState(false);
  const colorInputRef = useRef(null);
  const cameraLabel = CAMERA_MODES.find(([value]) => value === cameraMode)?.[1] ?? CAMERA_MODES[0][1];
  const setTurn = (index, motor, value) => {
    setTurns((current) => {
      const next = [...current];
      next[index] = {
        ...(next[index] ?? { top: 0, bottom: 0 }),
        [motor]: Number(value),
      };
      return next;
    });
  };
  const toggleMode = () => {
    if (presetMode) {
      setPresetMode(false);
      setPlaying(false);
      return;
    }

    setPresetMode(true);
    setPlaying(true);
  };
  const cycleCameraMode = () => {
    setCameraMode((current) => {
      const index = CAMERA_MODES.findIndex(([value]) => value === current);
      return CAMERA_MODES[(index + 1) % CAMERA_MODES.length][0];
    });
  };

  return (
    <aside className="controls">
      <header className="controls__header">
        <h1>Tensile</h1>
        <p>Interactive motorized twist-strip prototype with manual sliders and preset animation sequences.</p>
      </header>

      <label className="controls__field">
        <span>
          Strip Count <strong>{stripCount}</strong>
        </span>
        <input
          type="range"
          min="1"
          max={MAX_STRIPS}
          value={stripCount}
          onChange={(event) => setStripCount(Number(event.target.value))}
        />
      </label>

      <div className="controls__buttons">
        <button onClick={toggleMode}>{presetMode ? 'Manual' : 'Demo'}</button>
        <button onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
        <button onClick={() => setFrame(0)}>Restart</button>
        <button onClick={cycleCameraMode}>Camera {cameraLabel}</button>
      </div>

      <label className="controls__field">
        <span>
          Frame <strong>{Math.round(frame)}</strong>
        </span>
        <input
          type="range"
          min="0"
          max={MAX_FRAME}
          value={frame}
          onChange={(event) => setFrame(Number(event.target.value))}
        />
      </label>

      <details className="controls__material" onToggle={(event) => setLookOpen(event.currentTarget.open)}>
        <summary>
          <span>Look</span>
          <strong>{lookOpen ? 'Close' : 'Open'}</strong>
        </summary>
        <div className="controls__material-body">
          <div className="controls__section-title">Lighting</div>
          <div className="controls__segments">
            {ENVIRONMENTS.map(([value, label, preset]) => (
              <button
                type="button"
                key={value}
                className={effects.look === value ? 'is-active' : ''}
                onClick={() => setEffects((current) => ({ ...current, ...preset }))}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="controls__section-title">Material</div>
          <div className="controls__color">
            <span>Color</span>
            <button
              type="button"
              className="controls__color-button"
              style={{
                '--swatch-color': materialSettings.color,
                '--swatch-icon': getSwatchIconColor(materialSettings.color),
              }}
              aria-label="Choose material color"
              onClick={() => colorInputRef.current?.click()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M14.8 3.8c.5-.5 1.2-.8 2-.8s1.5.3 2 .8l1.4 1.4c1 1 1 2.6 0 3.5l-1.1 1.1 1.6 1.6-2.8 2.8-1.6-1.6-5.3 5.3c-.5.5-1.1.8-1.8.8H7.1l-.8 1.9-2.4.8.8-2.4 1.9-.8v-1.1c0-.7.3-1.3.8-1.8l5.3-5.3-1.6-1.6 2.8-2.8 1.6 1.6 1.1-1.1c.3-.3.3-.8 0-1.1l-1.4-1.4c-.3-.3-.8-.3-1.1 0l-1.3 1.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <input
              ref={colorInputRef}
              className="controls__color-input"
              type="color"
              aria-label="Choose material color"
              value={materialSettings.color}
              onChange={(event) => setMaterialSettings((current) => ({ ...current, color: event.target.value }))}
            />
          </div>
          <div className="controls__segments">
            {FINISHES.map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={materialSettings.finish === value ? 'is-active' : ''}
                onClick={() => setMaterialSettings((current) => ({ ...current, finish: value }))}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="controls__field controls__field--compact">
            <span>
              Translucency <strong>{Math.round(materialSettings.transmission * 100)}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="0.85"
              step="0.01"
              value={materialSettings.transmission}
              onChange={(event) =>
                setMaterialSettings((current) => ({ ...current, transmission: Number(event.target.value) }))
              }
            />
          </label>
        </div>
      </details>

      <div className="controls__sliders">
        {Array.from({ length: stripCount }, (_, index) => {
          const values = {
            top: getMotorValue({ presetMode, frame, stripCount, turns, index, motor: 'top' }),
            bottom: getMotorValue({ presetMode, frame, stripCount, turns, index, motor: 'bottom' }),
          };

          return (
            <div className="controls__strip" key={index}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div className="controls__motor-pair">
                {['top', 'bottom'].map((motor) => (
                  <input
                    key={motor}
                    className={`controls__motor controls__motor--${motor}`}
                    type="range"
                    min="-10"
                    max="10"
                    step="0.05"
                    value={values[motor]}
                    disabled={presetMode}
                    aria-label={`Strip ${index + 1} ${motor} motor`}
                    title={`${motor} ${values[motor].toFixed(2)}`}
                    style={{ '--progress': `${((values[motor] + 10) / 20) * 100}%` }}
                    onChange={(event) => setTurn(index, motor, event.target.value)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
