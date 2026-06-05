import { writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { FLOOR_LIGHTS, ROPE_POSTS } from '../src/components/scene/constants.js';

globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};

const LED_HOLES = Array.from({ length: 18 }, (_, index) => {
  const column = index % 6;
  const row = Math.floor(index / 6);
  return [(column - 2.5) * 0.055, (row - 1) * 0.024];
});

const metalMaterial = new THREE.MeshStandardMaterial({
  name: 'brushed_black_metal',
  color: '#f4f7fb',
  metalness: 1,
  roughness: 0.2,
});

const ropeMaterial = new THREE.MeshStandardMaterial({
  name: 'deep_red_velvet',
  color: '#7d101d',
  roughness: 0.75,
  metalness: 0,
});

const lampBodyMaterial = new THREE.MeshStandardMaterial({
  name: 'black_floor_lamp_body',
  color: '#121316',
  metalness: 0.55,
  roughness: 0.34,
});

const ledHoleMaterial = new THREE.MeshStandardMaterial({
  name: 'led_hole_black',
  color: '#050607',
  metalness: 0.1,
  roughness: 0.7,
});

function mesh(geometry, material, { position, rotation, name } = {}) {
  const item = new THREE.Mesh(geometry, material);
  if (name) item.name = name;
  if (position) item.position.set(...position);
  if (rotation) item.rotation.set(...rotation);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function createPost(position) {
  const [x, height, z] = position;
  const post = new THREE.Group();
  post.name = `rope_post_${x}_${z}`;
  post.position.set(x, 0, z);

  post.add(mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.024, 56), metalMaterial, { position: [0, 0.012, 0], name: 'base_plate' }));
  post.add(mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.03, 56), metalMaterial, { position: [0, 0.04, 0], name: 'base_step' }));
  post.add(mesh(new THREE.TorusGeometry(0.145, 0.008, 10, 56), metalMaterial, { position: [0, 0.065, 0], rotation: [Math.PI / 2, 0, 0], name: 'base_ring' }));
  post.add(mesh(new THREE.CylinderGeometry(0.044, 0.052, height - 0.12, 40), metalMaterial, { position: [0, height / 2, 0], name: 'post_stem' }));
  post.add(mesh(new THREE.TorusGeometry(0.066, 0.009, 10, 40), metalMaterial, { position: [0, height - 0.18, 0], rotation: [Math.PI / 2, 0, 0], name: 'top_collar' }));
  post.add(mesh(new THREE.CylinderGeometry(0.072, 0.056, 0.11, 40), metalMaterial, { position: [0, height - 0.105, 0], name: 'top_neck' }));
  post.add(mesh(new THREE.SphereGeometry(0.078, 36, 18), metalMaterial, { position: [0, height, 0], name: 'finial' }));
  post.add(mesh(new THREE.TorusGeometry(0.13, 0.012, 10, 40), metalMaterial, { position: [0, height, 0], rotation: [Math.PI / 2, 0, 0], name: 'top_ring' }));

  return post;
}

function createRopeHook(from, to) {
  const hook = new THREE.Group();
  hook.name = `rope_hook_${from[0]}_${from[2]}_to_${to[0]}_${to[2]}`;
  hook.position.set(from[0], from[1] - 0.015, from[2]);
  hook.rotation.y = Math.atan2(to[0] - from[0], to[2] - from[2]);

  hook.add(mesh(new THREE.TorusGeometry(0.052, 0.008, 10, 28, Math.PI * 1.55), metalMaterial, { position: [0, 0, 0.09], rotation: [Math.PI / 2, 0, 0], name: 'hook_loop' }));
  hook.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 16), metalMaterial, { position: [0, 0, 0.04], rotation: [Math.PI / 2, 0, 0], name: 'hook_pin' }));
  hook.add(mesh(new THREE.SphereGeometry(0.018, 16, 8), metalMaterial, { position: [0, 0, 0.145], rotation: [Math.PI / 2, 0, 0], name: 'hook_tip' }));

  return hook;
}

function createVelvetRopeBarrier() {
  const barrier = new THREE.Group();
  barrier.name = 'velvet_rope_barrier';

  const ropePoints = ROPE_POSTS.flatMap((post, index) => {
    if (index === ROPE_POSTS.length - 1) return [post];
    const next = ROPE_POSTS[index + 1];
    return [post, [(post[0] + next[0]) / 2, post[1] - 0.16, (post[2] + next[2]) / 2]];
  });

  ROPE_POSTS.forEach((post, postIndex) => {
    barrier.add(createPost(post));
    ROPE_POSTS.forEach((candidate, index) => {
      if (Math.abs(index - postIndex) !== 1) return;
      barrier.add(createRopeHook(post, candidate));
    });
  });

  const curve = new THREE.CatmullRomCurve3(
    ropePoints.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'catmullrom',
    0.55,
  );
  barrier.add(mesh(new THREE.TubeGeometry(curve, 72, 0.026, 18, false), ropeMaterial, { name: 'velvet_rope' }));

  return barrier;
}

function createUplight(position, color, intensity, rotationY) {
  const lightColor = new THREE.Color(color);
  const lensMaterial = new THREE.MeshStandardMaterial({
    name: `emissive_lens_${color.replace('#', '')}`,
    color: lightColor,
    emissive: lightColor,
    emissiveIntensity: 4.2,
    roughness: 0.18,
  });

  const lamp = new THREE.Group();
  lamp.name = `floor_lamp_${color.replace('#', '')}_${position[0]}_${position[2]}`;
  lamp.position.set(...position);
  lamp.rotation.y = rotationY;

  lamp.add(mesh(new THREE.BoxGeometry(0.44, 0.12, 0.25), lampBodyMaterial, { rotation: [-0.17, 0, 0], name: 'lamp_body' }));
  lamp.add(mesh(new THREE.BoxGeometry(0.36, 0.075, 0.035), lensMaterial, { position: [0, 0.075, 0.03], rotation: [-0.48, 0, 0], name: 'colored_lens' }));

  const ledGroup = new THREE.Group();
  ledGroup.name = 'led_hole_grid';
  ledGroup.position.set(0, 0.098, 0.017);
  ledGroup.rotation.x = -0.48;
  LED_HOLES.forEach(([x, y], index) => {
    ledGroup.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 14), ledHoleMaterial, { position: [x, y, -0.021], rotation: [Math.PI / 2, 0, 0], name: `led_hole_${index}` }));
  });
  lamp.add(ledGroup);

  const beam = new THREE.Group();
  beam.name = 'floor_lamp_light_beam';
  beam.rotation.y = Math.PI;

  const glow = new THREE.PointLight(lightColor, intensity * 0.015, 1.2, 2);
  glow.name = `floor_lamp_glow_${color.replace('#', '')}`;
  glow.position.set(0, 0.14, 0.02);
  beam.add(glow);

  const spot = new THREE.SpotLight(lightColor, intensity, 8.5, 0.92, 0.9, 2);
  spot.name = `floor_lamp_spot_${color.replace('#', '')}`;
  spot.position.set(0, 0.12, 0.02);
  spot.castShadow = true;

  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, 2.08, 1.28);
  spot.lookAt(spotTarget.position);
  spot.target = new THREE.Object3D();
  spot.target.position.set(0, 0, -1);
  spot.add(spot.target);
  beam.add(spot);

  lamp.add(beam);

  return lamp;
}

function createFloorLamps() {
  const lamps = new THREE.Group();
  lamps.name = 'floor_lamps';

  FLOOR_LIGHTS.forEach(([x, y, z, color, intensity, rotationY]) => {
    lamps.add(createUplight([x, y, z], color, intensity, rotationY));
  });

  return lamps;
}

function exportGlb(object) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      object,
      (result) => resolve(Buffer.from(result)),
      reject,
      { binary: true },
    );
  });
}

async function main() {
  const exports = [
    ['public/models/velvet-rope-barrier.glb', createVelvetRopeBarrier()],
    ['public/models/floor-lamps.glb', createFloorLamps()],
  ];

  for (const [path, object] of exports) {
    object.updateMatrixWorld(true);
    await writeFile(path, await exportGlb(object));
    console.log(path);
  }
}

await main();
