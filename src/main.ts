import * as THREE from 'three';
import './styles.css';
import { GestureController, type GestureMode } from './gesture';
import { createBurstPositions, createModelPositions, type ModelKind, PARTICLE_COUNT } from './models';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const modelSelect = document.querySelector<HTMLSelectElement>('#modelSelect');
const fullscreenButton = document.querySelector<HTMLButtonElement>('#fullscreenButton');
const video = document.querySelector<HTMLVideoElement>('#camera');
const statusText = document.querySelector<HTMLElement>('#status');
const gestureLabel = document.querySelector<HTMLElement>('#gestureLabel');
const gestureDot = document.querySelector<HTMLElement>('#gestureDot');

if (!canvas || !modelSelect || !fullscreenButton || !video || !statusText || !gestureLabel || !gestureDot) {
  throw new Error('Missing required DOM nodes');
}

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x05070d, 7, 18);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x05070d, 1);

const positions = createModelPositions('heart');
let targetPositions = createModelPositions('heart');
let burstPositions = createBurstPositions();
let mode: GestureMode = 'gather';

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({
  color: 0xff7ab6,
  size: 0.026,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const points = new THREE.Points(geometry, material);
scene.add(points);

const halo = new THREE.PointLight(0xff6da7, 12, 9);
halo.position.set(1.8, 2.2, 3.5);
scene.add(halo);
scene.add(new THREE.AmbientLight(0x6dd7ff, 0.55));

function setModel(kind: ModelKind) {
  targetPositions = createModelPositions(kind);
  burstPositions = createBurstPositions();
  material.color.set(kind === 'sphere' ? 0x76e5ff : kind === 'saturn' ? 0xffd166 : 0xff7ab6);
}

modelSelect.addEventListener('change', () => {
  setModel(modelSelect.value as ModelKind);
});

fullscreenButton.addEventListener('click', async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

new GestureController(video, statusText, (state) => {
  mode = state.mode;
  gestureLabel.textContent = state.label;
  gestureDot.dataset.mode = state.mode;
}).start().catch((error: unknown) => {
  statusText.textContent = '摄像头或手势模型启动失败';
  console.error(error);
});

function animate(time: number) {
  const current = geometry.attributes.position.array as Float32Array;
  const destination = mode === 'burst' ? burstPositions : targetPositions;
  const ease = mode === 'burst' ? 0.08 : 0.045;

  for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
    current[i] += (destination[i] - current[i]) * ease;
    current[i + 1] += (destination[i + 1] - current[i + 1]) * ease;
    current[i + 2] += (destination[i + 2] - current[i + 2]) * ease;
  }

  geometry.attributes.position.needsUpdate = true;
  points.rotation.y = Math.sin(time * 0.00022) * 0.24 + time * 0.00006;
  points.rotation.x = Math.sin(time * 0.00017) * 0.08;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
