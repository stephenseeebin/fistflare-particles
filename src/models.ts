import * as THREE from 'three';

export type ModelKind = 'heart' | 'flower' | 'saturn' | 'firework' | 'galaxy';

export const PARTICLE_COUNT = 8200;

const randomUnit = () => Math.random() * 2 - 1;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

export function createModelPositions(kind: ModelKind, count = PARTICLE_COUNT): Float32Array {
  if (kind === 'flower') return createFlower(count);
  if (kind === 'saturn') return createSaturn(count);
  if (kind === 'firework') return createFirework(count);
  if (kind === 'galaxy') return createGalaxy(count);
  return createHeart(count);
}

export function createBurstPositions(power = 1.15, count = PARTICLE_COUNT): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const direction = new THREE.Vector3(randomUnit(), randomUnit(), randomUnit() * 0.5).normalize();
    const radius = rand(7.8, 15.5) * power;
    positions[i * 3] = direction.x * radius;
    positions[i * 3 + 1] = direction.y * radius;
    positions[i * 3 + 2] = direction.z * radius - rand(0, 1.5);
  }
  return positions;
}

function createSpherePoint(radius: number): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function createHeart(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const t = Math.random() * Math.PI * 2;
    const shell = 0.52 + Math.random() * 0.5;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    positions[i * 3] = (x / 7.7) * shell;
    positions[i * 3 + 1] = (y / 7.7) * shell - 0.25;
    positions[i * 3 + 2] = randomUnit() * 0.62 * (1.15 - shell);
  }
  return positions;
}

function createFlower(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const t = Math.random() * Math.PI * 2;
    const petal = Math.abs(Math.sin(6 * t));
    const radius = (0.75 + petal * 2.15) * Math.sqrt(Math.random());
    positions[i * 3] = Math.cos(t) * radius;
    positions[i * 3 + 1] = Math.sin(t) * radius;
    positions[i * 3 + 2] = Math.cos(6 * t) * 0.22 + randomUnit() * 0.12;
  }
  return positions;
}

function createSaturn(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const inRing = Math.random() > 0.36;
    if (inRing) {
      const angle = Math.random() * Math.PI * 2;
      const radius = rand(2.2, 4.1);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * 0.26 + randomUnit() * 0.06;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.42;
    } else {
      const sphere = createSpherePoint(1.45 * Math.cbrt(Math.random()));
      positions[i * 3] = sphere.x;
      positions[i * 3 + 1] = sphere.y;
      positions[i * 3 + 2] = sphere.z;
    }
  }
  return positions;
}

function createFirework(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const centers = Array.from({ length: 9 }, () => new THREE.Vector3(rand(-2.3, 2.3), rand(-1.4, 1.5), rand(-0.9, 0.9)));
  for (let i = 0; i < count; i += 1) {
    const center = centers[i % centers.length];
    const spark = createSpherePoint(rand(0.15, Math.random() > 0.78 ? 2.35 : 1.2));
    positions[i * 3] = center.x + spark.x;
    positions[i * 3 + 1] = center.y + spark.y;
    positions[i * 3 + 2] = center.z + spark.z;
  }
  return positions;
}

function createGalaxy(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const arm = i % 5;
    const radius = Math.pow(Math.random(), 0.62) * 4.6;
    const angle = radius * 1.35 + arm * Math.PI * 0.4 + rand(-0.24, 0.24);
    const noise = Math.max(0.08, 0.52 - radius * 0.06);
    positions[i * 3] = Math.cos(angle) * radius + rand(-noise, noise);
    positions[i * 3 + 1] = rand(-0.26, 0.26);
    positions[i * 3 + 2] = Math.sin(angle) * radius * 0.58 + rand(-noise, noise);
  }
  return positions;
}
