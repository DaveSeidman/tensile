import { useEffect, useRef, useState } from 'react';

const SAMPLE_FPS = 18;
const MIRROR_CAMERA = true;
const FLOW_COLUMN_PIXELS = 6;
const FLOW_ROWS = 48;
const FLOW_PATCH_RADIUS = 2;
const FLOW_SEARCH_RADIUS = 4;
const FLOW_VERTICAL_WEIGHT = 0.35;
const FLOW_ACCELERATION = 11;
const FLOW_REST_DECAY = 2.2;
const MAX_FLOW_SPIN = 8;
const MAX_STRAND_TWIST = 20;
const COMMON_ROTATION_PERIOD = 2;
const HOME_RESET_SECONDS = 5;
const HOME_RESET_ACTIVITY_CUTOFF = 0.35;
const HOME_RESET_SETTLE = 0.02;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function clampIndex(value, max) {
  return Math.min(max, Math.max(0, value));
}

function createNeutralTurns(count) {
  return Array.from({ length: count }, () => ({ top: 0, bottom: 0 }));
}

function createNeutralVelocities(count) {
  return Array.from({ length: count }, () => ({ top: 0, bottom: 0 }));
}

function createZeroVector() {
  return { dx: 0, dy: 0, magnitude: 0, turn: 0, confidence: 0 };
}

function createBlankDebug(columns) {
  const safeColumns = Math.max(1, columns);
  return {
    columns: safeColumns,
    rows: 2,
    topVectors: Array.from({ length: safeColumns }, createZeroVector),
    bottomVectors: Array.from({ length: safeColumns }, createZeroVector),
    motion: 0,
  };
}

function getSensitivitySettings(sensitivity) {
  const amount = clamp(sensitivity);
  return {
    gain: 0.45 + amount * 1.35,
    deadzone: 0.04 - amount * 0.03,
  };
}

function createGrayscaleFrame(video, canvas, stripCount) {
  if (!video || !canvas || video.readyState < 2) return null;

  const columns = Math.max(1, stripCount);
  const width = columns * FLOW_COLUMN_PIXELS;
  const height = FLOW_ROWS;

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.save();
  context.clearRect(0, 0, width, height);
  if (MIRROR_CAMERA) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(video, 0, 0, width, height);
  context.restore();

  const pixels = context.getImageData(0, 0, width, height).data;
  const grayscale = new Float32Array(width * height);

  for (let index = 0; index < grayscale.length; index += 1) {
    const offset = index * 4;
    grayscale[index] = (pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722) / 255;
  }

  return { columns, width, height, grayscale };
}

function patchDifference(previous, current, width, height, x, y, dx, dy, radius) {
  let total = 0;
  let samples = 0;
  const maxX = width - 1;
  const maxY = height - 1;

  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    const previousY = clampIndex(y + offsetY, maxY);
    const currentY = clampIndex(y + offsetY + dy, maxY);

    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      const previousX = clampIndex(x + offsetX, maxX);
      const currentX = clampIndex(x + offsetX + dx, maxX);
      total += Math.abs(previous[previousY * width + previousX] - current[currentY * width + currentX]);
      samples += 1;
    }
  }

  return samples > 0 ? total / samples : 0;
}

function findFlowVector(previous, current, width, height, x, y, settings) {
  const baseError = patchDifference(previous, current, width, height, x, y, 0, 0, FLOW_PATCH_RADIUS);
  let bestError = Number.POSITIVE_INFINITY;
  let bestDx = 0;
  let bestDy = 0;

  for (let dy = -FLOW_SEARCH_RADIUS; dy <= FLOW_SEARCH_RADIUS; dy += 1) {
    for (let dx = -FLOW_SEARCH_RADIUS; dx <= FLOW_SEARCH_RADIUS; dx += 1) {
      const error = patchDifference(previous, current, width, height, x, y, dx, dy, FLOW_PATCH_RADIUS);
      if (error < bestError) {
        bestError = error;
        bestDx = dx;
        bestDy = dy;
      }
    }
  }

  const improvement = Math.max(0, baseError - bestError);
  const confidence = Math.min(1, improvement / Math.max(settings.deadzone, 0.001));

  if (baseError < settings.deadzone || confidence < 0.22) {
    return createZeroVector();
  }

  const dx = bestDx * confidence;
  const dy = bestDy * confidence;
  const magnitude = Math.hypot(dx, dy);
  const signedFlow = dx - dy * FLOW_VERTICAL_WEIGHT;
  const turn = clamp(signedFlow * settings.gain, -MAX_FLOW_SPIN, MAX_FLOW_SPIN);

  return {
    dx,
    dy,
    magnitude,
    turn,
    confidence,
  };
}

function averageVectors(vectors, settings) {
  let totalWeight = 0;
  let dx = 0;
  let dy = 0;

  vectors.forEach((vector) => {
    const weight = vector.confidence;
    dx += vector.dx * weight;
    dy += vector.dy * weight;
    totalWeight += weight;
  });

  if (totalWeight <= 0) return createZeroVector();

  dx /= totalWeight;
  dy /= totalWeight;

  const magnitude = Math.hypot(dx, dy);
  const signedFlow = dx - dy * FLOW_VERTICAL_WEIGHT;
  const turn = clamp(signedFlow * settings.gain, -MAX_FLOW_SPIN, MAX_FLOW_SPIN);

  return {
    dx,
    dy,
    magnitude,
    turn,
    confidence: Math.min(1, totalWeight / vectors.length),
  };
}

function measureColumnBand(previous, current, frame, column, band, settings) {
  const columnWidth = frame.width / frame.columns;
  const x = Math.round(column * columnWidth + columnWidth / 2);
  const bandCenter = band === 'top' ? frame.height * 0.28 : frame.height * 0.72;
  const bandSpread = frame.height * 0.1;
  const ySamples = [
    Math.round(bandCenter - bandSpread),
    Math.round(bandCenter),
    Math.round(bandCenter + bandSpread),
  ];

  return averageVectors(
    ySamples.map((y) =>
      findFlowVector(
        previous.grayscale,
        current.grayscale,
        frame.width,
        frame.height,
        clampIndex(x, frame.width - 1),
        clampIndex(y, frame.height - 1),
        settings,
      ),
    ),
    settings,
  );
}

function sampleCameraFrame(video, canvas, stripCount, sensitivity, previousFrameRef) {
  const currentFrame = createGrayscaleFrame(video, canvas, stripCount);
  if (!currentFrame) return null;

  const previousFrame = previousFrameRef.current;
  previousFrameRef.current = currentFrame;

  if (!previousFrame || previousFrame.width !== currentFrame.width || previousFrame.height !== currentFrame.height) {
    return {
      ...createBlankDebug(currentFrame.columns),
      columnVelocities: createNeutralVelocities(currentFrame.columns),
    };
  }

  const settings = getSensitivitySettings(sensitivity);
  const topVectors = [];
  const bottomVectors = [];
  const columnVelocities = [];
  let totalMotion = 0;

  for (let column = 0; column < currentFrame.columns; column += 1) {
    const top = measureColumnBand(previousFrame, currentFrame, currentFrame, column, 'top', settings);
    const bottom = measureColumnBand(previousFrame, currentFrame, currentFrame, column, 'bottom', settings);

    topVectors.push(top);
    bottomVectors.push(bottom);
    columnVelocities.push({
      top: top.turn,
      bottom: bottom.turn,
    });
    totalMotion += top.magnitude + bottom.magnitude;
  }

  return {
    columns: currentFrame.columns,
    rows: 2,
    topVectors,
    bottomVectors,
    columnVelocities,
    motion: totalMotion / Math.max(1, currentFrame.columns * 2 * FLOW_SEARCH_RADIUS),
  };
}

function normalizeCommonRotation(turns) {
  const average = (turns.top + turns.bottom) / 2;
  const offset = COMMON_ROTATION_PERIOD * Math.round(average / COMMON_ROTATION_PERIOD);

  return {
    top: turns.top - offset,
    bottom: turns.bottom - offset,
  };
}

function constrainStrandTwist(turns) {
  const average = (turns.top + turns.bottom) / 2;
  const twist = clamp(turns.top - turns.bottom, -MAX_STRAND_TWIST, MAX_STRAND_TWIST);
  return normalizeCommonRotation({
    top: average + twist / 2,
    bottom: average - twist / 2,
  });
}

function mixVelocity(current, target, deltaSeconds) {
  const rate = Math.abs(target) > 0.001 ? FLOW_ACCELERATION : FLOW_REST_DECAY;
  const mix = 1 - Math.exp(-rate * deltaSeconds);
  return current + (target - current) * mix;
}

function homeResetBlend(targetVelocity, currentVelocity, deltaSeconds) {
  const activity =
    (Math.abs(targetVelocity.top) +
      Math.abs(targetVelocity.bottom) +
      Math.abs(currentVelocity.top) +
      Math.abs(currentVelocity.bottom)) /
    MAX_FLOW_SPIN;
  const idleAmount = 1 - clamp(activity / HOME_RESET_ACTIVITY_CUTOFF);

  if (idleAmount <= 0) return 0;

  return (1 - HOME_RESET_SETTLE ** (deltaSeconds / HOME_RESET_SECONDS)) * idleAmount;
}

function integrateTurns(currentTurns, currentVelocities, targetVelocities, maxStrips, deltaSeconds) {
  const nextTurns = [];
  const nextVelocities = [];

  for (let index = 0; index < maxStrips; index += 1) {
    const currentTurn = currentTurns[index] ?? { top: 0, bottom: 0 };
    const currentVelocity = currentVelocities[index] ?? { top: 0, bottom: 0 };
    const targetVelocity = targetVelocities[index] ?? { top: 0, bottom: 0 };
    let topVelocity = mixVelocity(currentVelocity.top, targetVelocity.top, deltaSeconds);
    let bottomVelocity = mixVelocity(currentVelocity.bottom, targetVelocity.bottom, deltaSeconds);

    const proposedTwist = currentTurn.top + topVelocity * deltaSeconds - (currentTurn.bottom + bottomVelocity * deltaSeconds);
    const twistVelocity = topVelocity - bottomVelocity;
    if (
      (proposedTwist > MAX_STRAND_TWIST && twistVelocity > 0) ||
      (proposedTwist < -MAX_STRAND_TWIST && twistVelocity < 0)
    ) {
      const commonVelocity = (topVelocity + bottomVelocity) / 2;
      topVelocity = commonVelocity;
      bottomVelocity = commonVelocity;
    }

    const constrained = constrainStrandTwist({
      top: currentTurn.top + topVelocity * deltaSeconds,
      bottom: currentTurn.bottom + bottomVelocity * deltaSeconds,
    });
    const resetBlend = homeResetBlend(targetVelocity, { top: topVelocity, bottom: bottomVelocity }, deltaSeconds);
    const resetTurns = {
      top: constrained.top * (1 - resetBlend),
      bottom: constrained.bottom * (1 - resetBlend),
    };

    nextTurns.push(resetTurns);
    nextVelocities.push({ top: topVelocity, bottom: bottomVelocity });
  }

  return { turns: nextTurns, velocities: nextVelocities };
}

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useWebcamInput({ enabled, stripCount, maxStrips, sensitivity }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const previousFrameRef = useRef(null);
  const velocityRef = useRef(createNeutralVelocities(maxStrips));
  const stripCountRef = useRef(stripCount);
  const sensitivityRef = useRef(sensitivity);
  const [turns, setTurns] = useState(() => createNeutralTurns(maxStrips));
  const [debug, setDebug] = useState(() => createBlankDebug(stripCount));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    stripCountRef.current = stripCount;
    previousFrameRef.current = null;
    velocityRef.current = createNeutralVelocities(maxStrips);
    setDebug((current) => (current.columns === stripCount ? current : createBlankDebug(stripCount)));
  }, [stripCount, maxStrips]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(
    () => () => {
      stopStream(streamRef.current);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let frameId = 0;
    let lastSample = 0;

    const stopCamera = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      previousFrameRef.current = null;
      velocityRef.current = createNeutralVelocities(maxStrips);
      stopStream(streamRef.current);
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };

    if (!enabled) {
      stopCamera();
      setStatus('idle');
      setError('');
      setTurns(createNeutralTurns(maxStrips));
      setDebug(createBlankDebug(stripCountRef.current));
      return () => {
        cancelled = true;
        if (frameId) cancelAnimationFrame(frameId);
      };
    }

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setError('Camera access is not available in this browser.');
        return;
      }

      setStatus('requesting');
      setError('');
      previousFrameRef.current = null;
      velocityRef.current = createNeutralVelocities(maxStrips);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
        });

        if (cancelled) {
          stopStream(stream);
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error('Camera video element was not ready.');

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        if (cancelled) return;
        setStatus('live');

        const sample = (time) => {
          if (cancelled) return;

          if (time - lastSample >= 1000 / SAMPLE_FPS) {
            const deltaSeconds = lastSample ? Math.min(0.2, (time - lastSample) / 1000) : 1 / SAMPLE_FPS;
            lastSample = time;
            const nextDebug = sampleCameraFrame(
              video,
              canvasRef.current,
              stripCountRef.current,
              sensitivityRef.current,
              previousFrameRef,
            );
            if (nextDebug) {
              setDebug(nextDebug);
              setTurns((current) => {
                const integrated = integrateTurns(
                  current,
                  velocityRef.current,
                  nextDebug.columnVelocities,
                  maxStrips,
                  deltaSeconds,
                );
                velocityRef.current = integrated.velocities;
                return integrated.turns;
              });
            }
          }

          frameId = requestAnimationFrame(sample);
        };

        frameId = requestAnimationFrame(sample);
      } catch (cameraError) {
        stopCamera();
        if (cancelled) return;
        setStatus('error');
        setError(cameraError?.message || 'Camera access failed.');
        setTurns(createNeutralTurns(maxStrips));
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [enabled, maxStrips]);

  return {
    videoRef,
    canvasRef,
    turns,
    debug,
    status,
    error,
  };
}
