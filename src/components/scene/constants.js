export const STRIP_WIDTH = 2 / 12;
export const STRIP_HEIGHT = 4;
export const STRIP_DEPTH = 0.035;
export const HOLDER_HEIGHT = 1 / 12;
export const HOLDER_WIDTH = STRIP_WIDTH * 1.18;
export const HOLDER_DEPTH = STRIP_DEPTH * 1.4;
export const HOLDER_RADIUS = 0.009;
export const GAP = 0.5 / 12;
export const SEGMENTS = 192;
export const ORBIT_MIN_POLAR_ANGLE = (55 * Math.PI) / 180;
export const ORBIT_MAX_POLAR_ANGLE = (105 * Math.PI) / 180;
export const CAMERA_TARGET = [0, 2.12, 0];
export const CAMERA_POSITION = [0, 1.55, -6.35];
export const STRIP_CENTER_Y = 2.18;

export const MATERIAL_FINISHES = {
  matte: { roughness: 0.72, clearcoat: 0.04, transmission: 0 },
  satin: { roughness: 0.38, clearcoat: 0.14, transmission: 0 },
  gloss: { roughness: 0.12, clearcoat: 0.7, transmission: 0 },
};

export const ROPE_POSTS = [
  [-2.72, 0.9, 0.12],
  [-2.05, 0.9, -0.82],
  [-0.82, 0.9, -1.32],
  [0.82, 0.9, -1.32],
  [2.05, 0.9, -0.82],
  [2.72, 0.9, 0.12],
];

const FLOOR_LIGHT_COLORS = ['#ff9e40', '#739dff', '#ffb057', '#739dff', '#ff9e40'];
const FLOOR_LIGHT_INTENSITIES = [118, 104, 148, 104, 118];

export const FLOOR_LIGHTS = ROPE_POSTS.slice(0, -1).map((post, index) => {
  const next = ROPE_POSTS[index + 1];
  const segmentYaw = Math.atan2(next[0] - post[0], next[2] - post[2]) + Math.PI / 2;
  return [
    (post[0] + next[0]) / 2,
    0.06,
    (post[2] + next[2]) / 2,
    FLOOR_LIGHT_COLORS[index],
    FLOOR_LIGHT_INTENSITIES[index],
    segmentYaw,
  ];
});
