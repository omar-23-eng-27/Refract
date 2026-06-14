import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 2000;

export default function ParticleField() {
  const meshRef = useRef();

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 4;
      velocities[i] = 0.002 + Math.random() * 0.004;
    }
    return { positions, velocities };
  }, []);

  const posRef = useRef(positions.slice());

  useFrame(() => {
    if (!meshRef.current) return;
    const pos = meshRef.current.geometry.attributes.position;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posRef.current[i * 3 + 1] += velocities[i];
      if (posRef.current[i * 3 + 1] > 10) {
        posRef.current[i * 3 + 1] = -10;
      }
      pos.array[i * 3] = posRef.current[i * 3];
      pos.array[i * 3 + 1] = posRef.current[i * 3 + 1];
      pos.array[i * 3 + 2] = posRef.current[i * 3 + 2];
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={PARTICLE_COUNT} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#ffffff" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}
