export const MAX_FRAME = 1320;

function envelope(local, duration) {
  return Math.sin((Math.max(0, Math.min(duration, local)) / duration) * Math.PI);
}

function section(frame, start, duration) {
  const local = frame - start;
  if (local < 0 || local >= duration) return null;
  return { local, t: local / duration, env: envelope(local, duration) };
}

function wave(t, phase = 0) {
  return Math.sin(t * Math.PI * 2 + phase);
}

function randomSigned(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

function travelingFold(frame, stripIndex, count) {
  const state = section(frame, 0, 220);
  if (!state) return null;

  const phase = state.t * Math.PI * 4.2 - (stripIndex / Math.max(1, count - 1)) * Math.PI * 2.8;
  const turn = state.env * (0.75 + 0.45 * wave(state.t, stripIndex * 0.22)) * Math.sin(phase);
  return { top: turn, bottom: turn };
}

function centerBloom(frame, stripIndex, count) {
  const state = section(frame, 220, 230);
  if (!state) return null;

  const center = (count - 1) / 2;
  const distance = Math.abs(stripIndex - center);
  const normalized = distance / Math.max(1, center);
  const delay = normalized * 0.32;
  const localT = Math.max(0, Math.min(1, (state.t - delay) / 0.68));
  const bloom = envelope(localT, 1);
  const direction = stripIndex < center ? -1 : 1;
  const twist = direction * bloom * state.env * (2.9 - normalized * 0.75);
  return { top: twist, bottom: -twist };
}

function alternatingZipper(frame, stripIndex, count) {
  const state = section(frame, 450, 230);
  if (!state) return null;

  const side = stripIndex % 2 === 0 ? 1 : -1;
  const phase = state.t * Math.PI * 6 + stripIndex * 0.55;
  const spread = 0.7 + 0.35 * Math.cos((stripIndex / Math.max(1, count - 1)) * Math.PI);
  const twist = side * state.env * spread * (1.15 + Math.sin(phase)) * 0.9;
  return { top: twist, bottom: -twist * 0.65 };
}

function randomSearch(frame, stripIndex) {
  const state = section(frame, 680, 280);
  if (!state) return null;

  const seedA = randomSigned(stripIndex + 3);
  const seedB = randomSigned(stripIndex * 7 + 11);
  const seedC = randomSigned(stripIndex * 13 + 19);
  const drift = wave(state.t * 1.7, seedC * Math.PI);
  const top = state.env * (seedA * 2.6 + drift * 0.7);
  const bottom = state.env * (seedB * 2.6 - drift * 0.55);
  return { top, bottom };
}

function corkscrew(frame, stripIndex, count) {
  const state = section(frame, 960, 220);
  if (!state) return null;

  const phase = (stripIndex / Math.max(1, count - 1)) * Math.PI * 3.6 + state.t * Math.PI * 3;
  const twist = state.env * Math.sin(phase) * 2.35;
  return { top: twist, bottom: -twist };
}

function resetRipple(frame, stripIndex, count) {
  const state = section(frame, 1180, 140);
  if (!state) return null;

  const edgeDistance = Math.min(stripIndex, count - 1 - stripIndex);
  const phase = state.t * Math.PI * 3.2 - edgeDistance * 0.42;
  const turn = state.env * Math.sin(phase) * 1.15;
  return { top: turn, bottom: turn };
}

export function sequenceValue(frame, stripIndex, count) {
  const sequences = [
    travelingFold,
    centerBloom,
    alternatingZipper,
    randomSearch,
    corkscrew,
    resetRipple,
  ];

  for (const getSequenceValue of sequences) {
    const value = getSequenceValue(frame, stripIndex, count);
    if (value) return value;
  }

  return { top: 0, bottom: 0 };
}
