export const MAX_FRAME = 1800;

function waveValue(frame, stripIndex, peak, start, duration, step) {
  const local = frame - start - stripIndex * step;
  if (local < 0 || local > duration) return 0;
  return peak * Math.sin((local / duration) * Math.PI);
}

function twistValue(frame, stripIndex, count) {
  if (frame < 300) return waveValue(frame, stripIndex, 2.2, 0, 70, 8);

  if (frame >= 330) {
    const center = (count - 1) / 2;
    const distance = Math.abs(stripIndex - center);
    const edge = count / 2 - distance;
    const edgeRipple = waveValue(frame, stripIndex, 2.8, 340 + edge * 7, 75, 0);
    const centerAnswer = waveValue(frame, stripIndex, -2.2, 435 + distance * 7, 85, 0);
    const shimmer = waveValue(frame, stripIndex, stripIndex % 2 ? -1.35 : 1.35, 550 + stripIndex * 2, 70, 0);
    const breath = waveValue(
      frame,
      stripIndex,
      1.6 * Math.cos((stripIndex / Math.max(1, count - 1)) * Math.PI),
      640 + distance * 2,
      55,
      0,
    );

    return edgeRipple + centerAnswer + shimmer + breath;
  }

  return 0;
}

export function sequenceValue(frame, stripIndex, count) {
  if (frame < 300) {
    const turn = waveValue(frame, stripIndex, 1, 0, 70, 8);
    return { top: turn, bottom: turn };
  }

  const twist = twistValue(frame - 330, stripIndex, count);
  return { top: twist, bottom: -twist };
}
