import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useAuth } from "../contexts/AuthContext";
import GlassPrism from "../components/three/GlassPrism";
import ParticleField from "../components/three/ParticleField";
import GlassCard from "../components/ui/GlassCard";

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 14,
  outline: "none",
  fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  color: "rgba(255,255,255,0.6)",
  marginBottom: 6,
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    role: "student",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.password2) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const user = await register(form);
      navigate(user.role === "instructor" ? "/instructor" : "/dashboard");
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msg = Object.values(data).flat().join(". ");
        setError(msg);
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const focusHandler = (e) => (e.target.style.borderColor = "rgba(99,102,241,0.6)");
  const blurHandler = (e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05070f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Canvas camera={{ position: [0, 0, 7], fov: 60 }} gl={{ alpha: true }} style={{ background: "transparent" }}>
          <ambientLight intensity={0.1} />
          <Environment preset="city" />
          <ParticleField />
          <GlassPrism />
        </Canvas>
      </div>

      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 440 }}
      >
        <GlassCard style={{ padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "#fff" }}>
            Create account
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
            Join Refract — learn through peer code review
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Username</label>
              <input name="username" value={form.username} onChange={handleChange} required
                style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required
                style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required
                style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Confirm password</label>
              <input name="password2" type="password" value={form.password2} onChange={handleChange} required
                style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} />
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
                background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 20 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#6366f1", textDecoration: "none" }}>Sign in</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
