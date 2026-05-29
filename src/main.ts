import * as THREE from 'three';
import './styles.css';
import { GestureController, type GestureMode } from './gesture';
import { createBurstPositions, createModelPositions, type ModelKind, PARTICLE_COUNT } from './models';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const modelSelect = document.querySelector<HTMLSelectElement>('#modelSelect');
const fullscreenButton = document.querySelector<HTMLButtonElement>('#fullscreenButton');
const calmButton = document.querySelector<HTMLButtonElement>('#calmButton');
const burstButton = document.querySelector<HTMLButtonElement>('#burstButton');
const primaryColor = document.querySelector<HTMLInputElement>('#primaryColor');
const accentColor = document.querySelector<HTMLInputElement>('#accentColor');
const burstPower = document.querySelector<HTMLInputElement>('#burstPower');
const glowPower = document.querySelector<HTMLInputElement>('#glowPower');
const video = document.querySelector<HTMLVideoElement>('#camera');
const statusText = document.querySelector<HTMLElement>('#status');
const gestureLabel = document.querySelector<HTMLElement>('#gestureLabel');
const gestureHint = document.querySelector<HTMLElement>('#gestureHint');
const gestureDot = document.querySelector<HTMLElement>('#gestureDot');

if (
  !canvas ||
  !modelSelect ||
  !fullscreenButton ||
  !calmButton ||
  !burstButton ||
  !primaryColor ||
  !accentColor ||
  !burstPower ||
  !glowPower ||
  !video ||
  !statusText ||
  !gestureLabel ||
  !gestureHint ||
  !gestureDot
) {
  throw new Error('Missing required DOM nodes');
}

const primaryColorInput = primaryColor;
const accentColorInput = accentColor;
const burstPowerInput = burstPower;
const glowPowerInput = glowPower;
const gestureLabelNode = gestureLabel;
const gestureHintNode = gestureHint;
const gestureDotNode = gestureDot;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030512, 0.044);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 8.4);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x030512, 1);

const positions = createModelPositions('heart');
const colors = new Float32Array(PARTICLE_COUNT * 3);
const sizes = new Float32Array(PARTICLE_COUNT);
let targetPositions = createModelPositions('heart');
let burstPositions = createBurstPositions(Number(burstPowerInput.value));
let mode: GestureMode = 'gather';
let manualHold = 0;

for (let i = 0; i < PARTICLE_COUNT; i += 1) {
  sizes[i] = 0.75 + Math.random() * 1.4;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

const particleTexture = createParticleTexture();
const material = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true,
  uniforms: {
    uMap: { value: particleTexture },
    uBaseSize: { value: 18 },
    uGlow: { value: Number(glowPower.value) },
  },
  vertexShader: `
    attribute float aSize;
    uniform float uBaseSize;
    varying vec3 vColor;

    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uBaseSize * (1.0 / max(1.0, -mvPosition.z * 0.2));
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D uMap;
    uniform float uGlow;
    varying vec3 vColor;

    void main() {
      vec4 sprite = texture2D(uMap, gl_PointCoord);
      gl_FragColor = vec4(vColor * (1.0 + sprite.a * uGlow), sprite.a * 0.94);
    }
  `,
});

const points = new THREE.Points(geometry, material);
scene.add(points);

const halo = new THREE.PointLight(primaryColorInput.value, 14, 12);
halo.position.set(1.8, 2.2, 3.5);
const sideLight = new THREE.PointLight(accentColorInput.value, 9, 14);
sideLight.position.set(-3, -2, 4);
scene.add(halo, sideLight, new THREE.AmbientLight(0x6dd7ff, 0.4));

updateParticleColors();

function setModel(kind: ModelKind) {
  targetPositions = createModelPositions(kind);
  burstPositions = createBurstPositions(Number(burstPowerInput.value));
}

function updateParticleColors() {
  const start = new THREE.Color(primaryColorInput.value);
  const end = new THREE.Color(accentColorInput.value);
  const mixed = new THREE.Color();

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    mixed.copy(start).lerp(end, 0.18 + 0.82 * ((i % 761) / 761));
    const pulse = 0.72 + Math.sin(i * 0.031) * 0.22;
    colors[i * 3] = mixed.r * pulse;
    colors[i * 3 + 1] = mixed.g * pulse;
    colors[i * 3 + 2] = mixed.b * pulse;
  }

  geometry.attributes.color.needsUpdate = true;
  halo.color.set(primaryColorInput.value);
  sideLight.color.set(accentColorInput.value);
  document.documentElement.style.setProperty('--hot', primaryColorInput.value);
  document.documentElement.style.setProperty('--cold', accentColorInput.value);
}

modelSelect.addEventListener('change', () => {
  setModel(modelSelect.value as ModelKind);
});

primaryColorInput.addEventListener('input', updateParticleColors);
accentColorInput.addEventListener('input', updateParticleColors);

burstPowerInput.addEventListener('input', () => {
  burstPositions = createBurstPositions(Number(burstPowerInput.value));
});

glowPowerInput.addEventListener('input', () => {
  material.uniforms.uGlow.value = Number(glowPowerInput.value);
  material.uniforms.uBaseSize.value = 14 + Number(glowPowerInput.value) * 3.2;
});

calmButton.addEventListener('click', () => {
  manualHold = performance.now() + 1400;
  setGesture('gather', '手动聚拢', '粒子回到当前模板');
});

burstButton.addEventListener('click', () => {
  manualHold = performance.now() + 1400;
  setGesture('burst', '手动发散', '粒子向屏幕四周飞散');
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
  if (performance.now() < manualHold) return;
  const hint =
    state.mode === 'burst'
      ? `握拳识别 ${(state.confidence * 100).toFixed(0)}%，发散破碎`
      : state.label === '未检测到手'
        ? '未检测到手，自动聚拢成形'
        : `张掌识别 ${(state.openConfidence * 100).toFixed(0)}%，聚拢成形`;
  setGesture(state.mode, state.label, hint);
}).start().catch((error: unknown) => {
  statusText.textContent = '摄像头或手势模型启动失败';
  gestureHint.textContent = '请检查网络、摄像头权限或浏览器设置';
  console.error(error);
});

function setGesture(nextMode: GestureMode, label: string, hint: string) {
  mode = nextMode;
  gestureLabelNode.textContent = label;
  gestureHintNode.textContent = hint;
  gestureDotNode.dataset.mode = nextMode;
}

function animate(time: number) {
  const current = geometry.attributes.position.array as Float32Array;
  const destination = mode === 'burst' ? burstPositions : targetPositions;
  const ease = mode === 'burst' ? 0.16 : 0.1;
  const turbulence = mode === 'burst' ? 0.006 : 0.0016;

  for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
    const wave = Math.sin(time * 0.0012 + i * 0.007) * turbulence;
    current[i] += (destination[i] - current[i]) * ease - current[i + 1] * wave;
    current[i + 1] += (destination[i + 1] - current[i + 1]) * ease + current[i] * wave;
    current[i + 2] += (destination[i + 2] - current[i + 2]) * ease;
  }

  geometry.attributes.position.needsUpdate = true;
  points.rotation.y = Math.sin(time * 0.00022) * 0.22 + time * 0.000055;
  points.rotation.x = Math.sin(time * 0.00017) * 0.08;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function createParticleTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 96;
  textureCanvas.height = 96;
  const context = textureCanvas.getContext('2d');
  if (!context) return new THREE.Texture();

  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.22, 'rgba(255,255,255,.95)');
  gradient.addColorStop(0.58, 'rgba(255,255,255,.22)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.needsUpdate = true;
  return texture;
}

requestAnimationFrame(animate);
