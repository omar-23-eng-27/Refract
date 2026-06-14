import { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import GlassPrism from "./GlassPrism";
import FloatingShapes from "./FloatingShapes";
import ParticleField from "./ParticleField";

export default function BackgroundCanvas() {
  const mouseRef = useRef({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onMouse = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        transform: `translateY(${scrollY * 0.2}px)`,
        willChange: "transform",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.15} />
        <Environment preset="city" />
        <ParticleField />
        <FloatingShapes mouseRef={mouseRef} />
        <GlassPrism scrollY={scrollY} />
      </Canvas>
    </div>
  );
}
