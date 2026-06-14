import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

const AXES = [
  { label: "Readability", color: "#6366f1", angle: Math.PI / 2 },
  { label: "Efficiency", color: "#10b981", angle: Math.PI / 2 + (2 * Math.PI) / 3 },
  { label: "Security", color: "#f59e0b", angle: Math.PI / 2 + (4 * Math.PI) / 3 },
];
const RADIUS = 1.6;

function hexagonPoints(r, n = 6) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  pts.push(pts[0].clone());
  return pts;
}

function dataPolygon(scores) {
  const pts = AXES.map((ax, i) => {
    const r = (scores[i] / 100) * RADIUS;
    return new THREE.Vector3(Math.cos(ax.angle) * r, Math.sin(ax.angle) * r, 0);
  });
  pts.push(pts[0].clone());
  return pts;
}

export default function RadarChart3D({ readability = 0, efficiency = 0, security = 0 }) {
  const groupRef = useRef();
  const scores = [readability, efficiency, security];

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.15;
      groupRef.current.rotation.x = -0.25 + Math.sin(clock.getElapsedTime() * 0.2) * 0.04;
    }
  });

  const gridGeometries = useMemo(
    () => [0.4, 0.7, 1.0].map((f) => {
      const pts = hexagonPoints(RADIUS * f);
      return new THREE.BufferGeometry().setFromPoints(pts);
    }),
    []
  );

  const dataGeo = useMemo(() => {
    const pts = dataPolygon(scores);
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [scores[0], scores[1], scores[2]]);

  const dataFillGeo = useMemo(() => {
    const pts = AXES.map((ax, i) => {
      const r = (scores[i] / 100) * RADIUS;
      return new THREE.Vector2(Math.cos(ax.angle) * r, Math.sin(ax.angle) * r);
    });
    const shape = new THREE.Shape(pts);
    return new THREE.ShapeGeometry(shape);
  }, [scores[0], scores[1], scores[2]]);

  return (
    <group ref={groupRef}>
      {/* Grid rings */}
      {gridGeometries.map((geo, i) => (
        <line key={i} geometry={geo}>
          <lineBasicMaterial color="rgba(255,255,255,0.15)" transparent opacity={0.25} />
        </line>
      ))}

      {/* Axis lines + glowing axis tips */}
      {AXES.map((ax, i) => {
        const end = new THREE.Vector3(
          Math.cos(ax.angle) * RADIUS,
          Math.sin(ax.angle) * RADIUS,
          0
        );
        const axGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), end]);
        return (
          <group key={i}>
            <line geometry={axGeo}>
              <lineBasicMaterial color={ax.color} transparent opacity={0.6} />
            </line>
            <mesh position={[end.x, end.y, end.z]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial color={ax.color} emissive={ax.color} emissiveIntensity={3} />
            </mesh>
            <Text
              position={[end.x * 1.22, end.y * 1.22, 0]}
              fontSize={0.18}
              color={ax.color}
              anchorX="center"
              anchorY="middle"
              font="/fonts/Inter-Medium.woff"
            >
              {ax.label}
            </Text>
          </group>
        );
      })}

      {/* Data fill */}
      <mesh geometry={dataFillGeo} renderOrder={1}>
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Data outline */}
      <line geometry={dataGeo}>
        <lineBasicMaterial color="#6366f1" transparent opacity={0.9} linewidth={2} />
      </line>

      {/* Center glow */}
      <mesh>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={4} />
      </mesh>
    </group>
  );
}
