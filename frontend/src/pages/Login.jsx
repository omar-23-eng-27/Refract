import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useSpring, useTransform } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useAuth } from "../contexts/AuthContext";
import GlassPrism from "../components/three/GlassPrism";
import ParticleField from "../components/three/ParticleField";
import GlassCard from "../components/ui/GlassCard";

const TAGLINE = "Submit. Review. Refract.";

function TypewriterText({ text, startDelay = 600 }) {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setDisplayed(text); setDone(true); return; }

    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, 60);
      return () => clearInterval(interval);
    }, startDelay);

    const cursorInterval = setInterval(() => setShowCursor((c) => !c), 500);
    return () => { clearTimeout(timeout); clearInterval(cursorInterval); };
  }, [text, startDelay]);

  return (
    <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
      {displayed}
      {!done && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: "1em",
            background: "#6366f1",
            marginLeft: 2,
            verticalAlign: "text-bottom",
            opacity: showCursor ? 1 : 0,
            transition: "opacity 0.1s",
          }}
        />
      )}
    </span>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      navigate(user.role === "instructor" ? "/instructor" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05070f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Full-screen 3D scene */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Canvas camera={{ position: [0, 0, 7], fov: 60 }} gl={{ alpha: true }} style={{ background: "transparent" }}>
          <ambientLight intensity={0.1} />
          <Environment preset="city" />
          <ParticleField />
          <GlassPrism />
        </Canvas>
      </div>

      {/* Hero text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 10, textAlign: "center", marginBottom: 48 }}
      >
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 52px)",
            fontWeight: 800,
            letterSpacing: "-2px",
            marginBottom: 16,
            background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Refract
        </h1>
        <p
          style={{
            fontSize: "clamp(16px, 2.5vw, 22px)",
            color: "rgba(255,255,255,0.7)",
            fontWeight: 400,
            minHeight: "1.4em",
          }}
        >
          <TypewriterText text={TAGLINE} />
        </p>
      </motion.div>

      {/* Auth card */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.2 }}
        style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 400 }}
      >
        <GlassCard style={{ padding: 32 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 24,
              color: "#fff",
            }}
          >
            Sign in
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "Inter, sans-serif",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.6)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "Inter, sans-serif",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.6)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            {error && (
              <p style={{ color: "#f43f5e", fontSize: 13, marginBottom: 16, textAlign: "center" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                background: loading
                  ? "rgba(99,102,241,0.4)"
                  : "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 20 }}>
            No account?{" "}
            <Link to="/register" style={{ color: "#6366f1", textDecoration: "none" }}>
              Register
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
