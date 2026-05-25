import * as THREE from 'three';

export function makeSurfaceNormalTexture({ repeat = [1, 1], strength = 18 } = {}) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const grain = Math.sin(x * 0.41) * 0.45 + Math.sin(y * 0.37) * 0.35 + (Math.random() - 0.5) * 0.4;
      image.data[index] = 128 + grain * strength;
      image.data[index + 1] = 128 + Math.sin((x + y) * 0.23) * strength * 0.45;
      image.data[index + 2] = 255;
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
