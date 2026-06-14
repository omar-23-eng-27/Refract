import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function GlassPrism({ scrollY = 0 }) {
  const meshRef = useRef();
  const lightRed = useRef();
  const lightGreen = useRef();
  const lightBlue = useRef();

  const geometry = useMemo(() => {
    // Octahedron as the "prism" base
    return new THREE.OctahedronGeometry(1.4, 0);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.18 + scrollY * 0.0015;
      meshRef.current.rotation.x = Math.sin(t * 0.12) * 0.3;
    }
    if (lightRed.current) {
      lightRed.current.position.x = Math.sin(t * 0.5) * 4;
      lightRed.current.position.y = Math.cos(t * 0.4) * 2;
    }
    if (lightGreen.current) {
      lightGreen.current.position.x = Math.cos(t * 0.37) * 4;
      lightGreen.current.position.z = Math.sin(t * 0.44) * 3;
    }
    if (lightBlue.current) {
      lightBlue.current.position.y = Math.sin(t * 0.6) * 3;
      lightBlue.current.position.x = Math.cos(t * 0.55) * -3;
    }
  });

  return (
    <group>
      {/* Colored light beams that shift with scroll */}
      <pointLight ref={lightRed} color="#6366f1" intensity={15} distance={12} />
      <pointLight ref={lightGreen} color="#10b981" intensity={12} distance={12} />
      <pointLight ref={lightBlue} color="#f59e0b" intensity={10} distance={12} />

      <mesh ref={meshRef} geometry={geometry} position={[0, 0, 0]}>
        <meshPhysicalMaterial
          transmission={1}
          roughness={0}
          thickness={2}
          ior={1.8}
          metalness={0}
          transparent
          opacity={0.9}
          color="#ffffff"
          envMapIntensity={2}
          attenuationColor="#a5b4fc"
          attenuationDistance={0.5}
        />
      </mesh>
    </group>
  );
}
