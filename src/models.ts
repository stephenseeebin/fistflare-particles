import * as THREE from 'three';

export type ModelKind = 'heart' | 'sphere' | 'saturn';

export const PARTICLE_COUNT = 9000;

const randomUnit = () => Math.random() * 2 - 1;

export function createModelPositions(kind: ModelKind, count = PARTICLE_COUNT): Float32Array {
  if (kind === 'sphere') {
    return createSphere(count);
  }

  if (kind === 'saturn') {
    return createSaturn(count);
  }

  return createHeart(count);
}

export function createBurstPositions(count = PARTICLE_COUNT): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const direction = new THREE.Vector3(randomUnit(), randomUnit(), randomUnit() * 0.55).normalize();
    const radius = 8 + Math.random() * 12;
    positions[i * 3] = direction.x * radius;
    positions[i * 3 + 1] = direction.y * radius;
    positions[i * 3 + 2] = direction.z * radius - 1;
  }
  return positions;
}

function createSphere(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const radius = 2.45 * Math.cbrt(Math.random());
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  return positions;
}

function createHeart(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const t = Math.random() * Math.PI * 2;
    const shell = 0.58 + Math.random() * 0.42;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    positions[i * 3] = (x / 8) * shell;
    positions[i * 3 + 1] = (y / 8) * shell - 0.25;
    positions[i * 3 + 2] = randomUnit() * 0.78 * (1 - Math.abs(shell - 0.58));
  }
  return positions;
}

function createSaturn(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const inRing = Math.random() > 0.42;
    if (inRing) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.45 + Math.random() * 1.4;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = randomUnit() * 0.07;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.42;
    } else {
      const sphere = createSphere(1);
      positions[i * 3] = sphere[0] * 0.72;
      positions[i * 3 + 1] = sphere[1] * 0.72;
      positions[i * 3 + 2] = sphere[2] * 0.72;
    }
  }
  return positions;
}
