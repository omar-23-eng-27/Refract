import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const SHAPES = [
  { type: "icosahedron", pos: [-3, 1.5, -2], z: -2, scale: 0.55, speed: 0.22, color: "#6366f1" },
  { type: "octahedron", pos: [3.5, -1, -4], z: -4, scale: 0.45, speed: 0.18, color: "#10b981" },
  { type: "torus", pos: [-2.5, -2.5, -1], z: -1, scale: 0.4, speed: 0.28, color: "#f59e0b" },
  { type: "icosahedron", pos: [2, 2.5, -6], z: -6, scale: 0.65, speed: 0.14, color: "#6366f1" },
  { type: "octahedron", pos: [-4, 0.5, -3], z: -3, scale: 0.38, speed: 0.3, color: "#f43f5e" },
  { type: "torus", pos: [4, 1.5, -5], z: -5, scale: 0.5, speed: 0.16, color: "#10b981" },
];

function Shape({ config, mouseRef }) {
  const meshRef = useRef();
  const basePos = useMemo(() => new THREE.Vector3(...config.pos), [config.pos]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * config.speed;
    if (!meshRef.current) return;

    // Depth-based parallax — shapes closer (z > -3) react more to mouse
    const depth = Math.abs(config.z);
    const parallaxFactor = 1 / depth;

    const mx = mouseRef.current.x * parallaxFactor * 0.8;
    const my = mouseRef.current.y * parallaxFactor * 0.8;

    meshRef.current.position.set(
      basePos.x + Math.sin(t) * 0.3 + mx,
      basePos.y + Math.cos(t * 0.7) * 0.25 + my,
      basePos.z
    );
    meshRef.current.rotation.x = t * 0.6;
    meshRef.current.rotation.y = t * 0.4;
    meshRef.current.rotation.z = t * 0.2;
  });

  const geometry = useMemo(() => {
    switch (config.type) {
      case "icosahedron": return new THREE.IcosahedronGeometry(1, 0);
      case "octahedron": return new THREE.OctahedronGeometry(1, 0);
      case "torus": return new THREE.TorusGeometry(1, 0.3, 8, 12);
      default: return new THREE.IcosahedronGeometry(1, 0);
    }
  }, [config.type]);

  return (
    <mesh ref={meshRef} geometry={geometry} scale={config.scale}>
      <meshBasicMaterial color={config.color} wireframe opacity={0.35} transparent />
    </mesh>
  );
}

export default function FloatingShapes({ mouseRef }) {
  return (
    <group>
      {SHAPES.map((cfg, i) => (
        <Shape key={i} config={cfg} mouseRef={mouseRef} />
      ))}
    </group>
  );
}
