import React, { useEffect, useRef, useState } from 'react';
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
const WEBCAM_STATUS_LABELS = {
  idle: 'Off',
  requesting: 'Requesting',
  live: 'Live',
  error: 'Error',
};
const DEBUG_FLOW_MAX = 4;
const MOTOR_LIMIT = 20;
const MAX_STRAND_TWIST = 20;
const FLOW_CANVAS_HEIGHT = 72;

function getMotorValue({ webcamEnabled, webcamTurns, presetMode, frame, stripCount, turns, index, motor }) {
  if (webcamEnabled) {
    return webcamTurns?.[index]?.[motor] ?? 0;
  }

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

function getMotorProgress(value) {
  return `${Math.max(0, Math.min(100, ((value + MOTOR_LIMIT) / (MOTOR_LIMIT * 2)) * 100))}%`;
}

function clampMotorValue(value) {
  return Math.max(-MOTOR_LIMIT, Math.min(MOTOR_LIMIT, value));
}

function drawFlowCanvas(canvas, debug, fallbackColumns) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.round(rect.width || canvas.clientWidth || 300));
  const cssHeight = Math.max(1, Math.round(rect.height || FLOW_CANVAS_HEIGHT));
  const ratio = window.devicePixelRatio || 1;

  if (canvas.width !== Math.round(cssWidth * ratio)) canvas.width = Math.round(cssWidth * ratio);
  if (canvas.height !== Math.round(cssHeight * ratio)) canvas.height = Math.round(cssHeight * ratio);

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);

  const columns = Math.max(1, debug?.columns ?? fallbackColumns);
  const topVectors = debug?.topVectors ?? [];
  const bottomVectors = debug?.bottomVectors ?? [];
  const rows = [
    { vectors: topVectors, y: cssHeight * 0.3, color: '#f1f4f8' },
    { vectors: bottomVectors, y: cssHeight * 0.7, color: '#aeb7c4' },
  ];
  const columnWidth = cssWidth / columns;

  context.fillStyle = '#050608';
  context.fillRect(0, 0, cssWidth, cssHeight);

  context.strokeStyle = 'rgba(217, 221, 228, 0.09)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, cssHeight / 2);
  context.lineTo(cssWidth, cssHeight / 2);
  for (let column = 1; column < columns; column += 1) {
    const x = column * columnWidth;
    context.moveTo(x, 0);
    context.lineTo(x, cssHeight);
  }
  context.stroke();

  rows.forEach(({ vectors, y, color }) => {
    context.strokeStyle = 'rgba(217, 221, 228, 0.16)';
    context.lineWidth = 1;
    context.beginPath();
    for (let column = 0; column < columns; column += 1) {
      const vector = vectors[column];
      const x = column * columnWidth + columnWidth / 2;
      const offset = (vector?.turn ?? 0) * 2.4;
      if (column === 0) context.moveTo(x, y - offset);
      else context.lineTo(x, y - offset);
    }
    context.stroke();

    for (let column = 0; column < columns; column += 1) {
      const vector = vectors[column];
      const magnitude = Math.min(1, (vector?.magnitude ?? 0) / DEBUG_FLOW_MAX);
      const x = column * columnWidth + columnWidth / 2;
      context.globalAlpha = 0.08 + magnitude * 0.28;
      context.fillStyle = color;
      context.beginPath();
      context.arc(x, y, 1.5 + magnitude * 3.2, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    vectors.forEach((vector, column) => {
      const dx = vector?.dx ?? 0;
      const dy = vector?.dy ?? 0;
      const magnitude = Math.min(1, (vector?.magnitude ?? 0) / DEBUG_FLOW_MAX);
      if (magnitude <= 0.005) return;

      const x = column * columnWidth + columnWidth / 2;
      const angle = Math.atan2(dy, dx);
      const length = 5 + magnitude * Math.min(32, columnWidth * 0.82);
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      const head = 4 + magnitude * 3;

      context.globalAlpha = 0.34 + magnitude * 0.66;
      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineWidth = 1.2 + magnitude * 1.4;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(endX, endY);
      context.stroke();
      context.beginPath();
      context.moveTo(endX, endY);
      context.lineTo(endX - Math.cos(angle - 0.65) * head, endY - Math.sin(angle - 0.65) * head);
      context.lineTo(endX - Math.cos(angle + 0.65) * head, endY - Math.sin(angle + 0.65) * head);
      context.closePath();
      context.fill();
    });
    context.globalAlpha = 1;
  });
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
  webcamEnabled,
  setWebcamEnabled,
  webcamTurns,
  webcamDebug,
  webcamStatus,
  webcamError,
  webcamSensitivity,
  setWebcamSensitivity,
}) {
  const [lookOpen, setLookOpen] = useState(false);
  const colorInputRef = useRef(null);
  const flowCanvasRef = useRef(null);
  const flowCanvasStateRef = useRef({ debug: webcamDebug, stripCount });
  const cameraLabel = CAMERA_MODES.find(([value]) => value === cameraMode)?.[1] ?? CAMERA_MODES[0][1];
  const inputModeLabel = webcamEnabled ? 'Webcam' : presetMode ? 'Demo' : 'Free';
  const webcamStatusLabel = WEBCAM_STATUS_LABELS[webcamStatus] ?? webcamStatus;
  flowCanvasStateRef.current = { debug: webcamDebug, stripCount };

  useEffect(() => {
    const canvas = flowCanvasRef.current;
    if (!canvas) return undefined;

    const draw = () =>
      drawFlowCanvas(canvas, flowCanvasStateRef.current.debug, flowCanvasStateRef.current.stripCount);
    draw();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', draw);
      return () => window.removeEventListener('resize', draw);
    }

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [webcamEnabled, webcamStatus]);

  useEffect(() => {
    const canvas = flowCanvasRef.current;
    if (canvas) drawFlowCanvas(canvas, webcamDebug, stripCount);
  }, [stripCount, webcamDebug]);

  const setTurn = (index, motor, value) => {
    setTurns((current) => {
      const next = [...current];
      const currentTurn = next[index] ?? { top: 0, bottom: 0 };
      const nextValue = clampMotorValue(Number(value));
      const top =
        motor === 'top'
          ? Math.max(currentTurn.bottom - MAX_STRAND_TWIST, Math.min(currentTurn.bottom + MAX_STRAND_TWIST, nextValue))
          : currentTurn.top;
      const bottom =
        motor === 'bottom'
          ? Math.max(top - MAX_STRAND_TWIST, Math.min(top + MAX_STRAND_TWIST, nextValue))
          : currentTurn.bottom;

      next[index] = {
        top: clampMotorValue(top),
        bottom: clampMotorValue(bottom),
      };
      return next;
    });
  };
  const cycleInputMode = () => {
    if (presetMode && !webcamEnabled) {
      setWebcamEnabled(true);
      setPresetMode(false);
      setPlaying(false);
      return;
    }

    if (webcamEnabled) {
      setWebcamEnabled(false);
      setPresetMode(false);
      setPlaying(false);
      return;
    }

    setWebcamEnabled(false);
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
        <button onClick={cycleInputMode}>Mode: {inputModeLabel}</button>
        <button onClick={() => setPlaying(!playing)} disabled={webcamEnabled}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={() => setFrame(0)} disabled={webcamEnabled}>
          Restart
        </button>
        <button onClick={cycleCameraMode}>Camera {cameraLabel}</button>
      </div>

      {(webcamEnabled || webcamStatus === 'error') && (
        <section className="controls__camera-debug">
          <div className="controls__camera-debug-header">
            <span>Optical Flow</span>
            <strong>{webcamStatusLabel}</strong>
          </div>
          <label className="controls__field controls__field--compact">
            <span>
              Sensitivity <strong>{Math.round(webcamSensitivity * 100)}%</strong>
            </span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.01"
              value={webcamSensitivity}
              onChange={(event) => setWebcamSensitivity(Number(event.target.value))}
            />
          </label>
          {webcamError && <p className="controls__camera-error">{webcamError}</p>}
          <canvas
            ref={flowCanvasRef}
            className="controls__flow-canvas"
            aria-label="Top and bottom optical flow by strand"
          />
        </section>
      )}

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
            top: getMotorValue({
              webcamEnabled,
              webcamTurns,
              presetMode,
              frame,
              stripCount,
              turns,
              index,
              motor: 'top',
            }),
            bottom: getMotorValue({
              webcamEnabled,
              webcamTurns,
              presetMode,
              frame,
              stripCount,
              turns,
              index,
              motor: 'bottom',
            }),
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
                    min={-MOTOR_LIMIT}
                    max={MOTOR_LIMIT}
                    step="0.05"
                    value={values[motor]}
                    disabled={presetMode || webcamEnabled}
                    aria-label={`Strip ${index + 1} ${motor} motor`}
                    title={`${motor} ${values[motor].toFixed(2)}`}
                    style={{ '--progress': getMotorProgress(values[motor]) }}
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
