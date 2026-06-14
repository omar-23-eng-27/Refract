import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { gsap } from "gsap";
import api from "../api/axios";
import GlassCard from "../components/ui/GlassCard";
import GlassPrism from "../components/three/GlassPrism";
import RadarChart3D from "../components/three/RadarChart3D";

function CountUp({ target, duration = 1.8, color = "#6366f1" }) {
  const [value, setVal] = useState(0);
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setVal(target); return; }
    const start = performance.now();
    const frame = (now) => {
      const elapsed = (now - start) / (duration * 1000);
      const t = Math.min(elapsed, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setVal(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [target, duration]);
  return <span style={{ color }}>{value}</span>;
}

function ScoreCircle({ score, size = 140 }) {
  const circumference = 2 * Math.PI * 54;
  const dashoffset = circumference * (1 - score / 100);
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={54} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={54}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 1.2 }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 32, fontWeight: 800, color }}>
          <CountUp target={score} color={color} />
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>/ 100</span>
      </div>
    </div>
  );
}

function MissedFindingCard({ item, index }) {
  return (
    <motion.div
      initial={{ rotateY: 180, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ delay: 0.5 + index * 0.15, duration: 0.6, ease: "easeOut" }}
      style={{ transformStyle: "preserve-3d", perspective: 600 }}
    >
      <GlassCard style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              background: item.severity === "critical" || item.severity === "high"
                ? "rgba(244,63,94,0.15)"
                : "rgba(245,158,11,0.15)",
              color: item.severity === "critical" || item.severity === "high" ? "#f43f5e" : "#f59e0b",
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            {item.severity}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Missed</span>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{item.description}</p>
      </GlassCard>
    </motion.div>
  );
}

function SectionDivider({ color, delay }) {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.8, ease: "easeOut", delay }}
      style={{
        height: 2,
        borderRadius: 2,
        background: color,
        transformOrigin: "left",
        margin: "32px 0",
        opacity: 0.5,
      }}
    />
  );
}

export default function AIArbitration() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [introPhase, setIntroPhase] = useState("dark"); // dark | prism | layout
  const containerRef = useRef(null);

  useEffect(() => {
    api.get(`/api/reviews/submissions/${submissionId}/arbitration/`).then((res) => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [submissionId]);

  // Cinematic entry
  useEffect(() => {
    if (loading) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setIntroPhase("layout"); return; }
    const t1 = setTimeout(() => setIntroPhase("prism"), 300);
    const t2 = setTimeout(() => setIntroPhase("layout"), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loading]);

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading…</div>;
  }

  const reviews = data?.reviews || [];
  const bestReview = reviews.length > 0
    ? reviews.reduce((best, r) => (r.ai_quality_score || 0) > (best.ai_quality_score || 0) ? r : best, reviews[0])
    : null;
  const overallScore = bestReview?.ai_quality_score ?? null;
  const aiAnalysis = data?.ai_analysis;

  return (
    <div ref={containerRef} style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Cinematic dark overlay → prism reveal */}
      <AnimatePresence>
        {introPhase === "dark" && (
          <motion.div
            key="dark"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ position: "fixed", inset: 0, background: "#000", zIndex: 200, pointerEvents: "none" }}
          />
        )}
        {introPhase === "prism" && (
          <motion.div
            key="prism"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "#05070f", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}
          >
            <Canvas camera={{ position: [0, 0, 7], fov: 60 }} style={{ width: 400, height: 300 }}>
              <ambientLight intensity={0.1} />
              <Environment preset="city" />
              <GlassPrism />
            </Canvas>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout — fades in after intro */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: introPhase === "layout" ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} style={{ marginBottom: 32 }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 12 }}>← Back</button>
          <h1 style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>
            AI Arbitration
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
            Senior engineer analysis of peer reviews for submission #{submissionId}
          </p>
        </motion.div>

        {/* Score */}
        {overallScore !== null && (
          <>
            <SectionDivider color="#6366f1" delay={0.3} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
              <GlassCard style={{ padding: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap" }}>
                  <ScoreCircle score={Math.round(overallScore)} />
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Review quality score</h2>
                    {[
                      { label: "Coverage", value: bestReview.coverage_score, color: "#6366f1" },
                      { label: "Accuracy", value: bestReview.accuracy_score, color: "#10b981" },
                      { label: "Constructiveness", value: bestReview.constructiveness_score, color: "#f59e0b" },
                      { label: "Bug detection", value: bestReview.bug_detection_score, color: "#f43f5e" },
                    ].map(({ label, value, color }) => value != null && (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
                          <span style={{ color, fontWeight: 600 }}><CountUp target={Math.round(value)} color={color} /></span>
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 4 }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${value}%` }}
                            transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
                            style={{ height: "100%", background: color, borderRadius: 4 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </>
        )}

        {/* Strengths & improvements */}
        {bestReview && (
          <>
            <SectionDivider color="#10b981" delay={0.5} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>
              {bestReview.strengths?.length > 0 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
                  <GlassCard style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#10b981", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: 12 }}>
                      Strengths
                    </h3>
                    {bestReview.strengths.map((s, i) => (
                      <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.06 }}
                        style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 8, paddingLeft: 12, borderLeft: "2px solid #10b981", lineHeight: 1.6 }}>
                        {s}
                      </motion.p>
                    ))}
                  </GlassCard>
                </motion.div>
              )}
              {bestReview.areas_for_improvement?.length > 0 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
                  <GlassCard style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Areas to improve
                    </h3>
                    {bestReview.areas_for_improvement.map((s, i) => (
                      <motion.p key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.06 }}
                        style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 8, paddingLeft: 12, borderLeft: "2px solid #f59e0b", lineHeight: 1.6 }}>
                        {s}
                      </motion.p>
                    ))}
                  </GlassCard>
                </motion.div>
              )}
            </div>
          </>
        )}

        {/* Missed bugs — flip card cascade */}
        {bestReview?.missed_bugs?.length > 0 && (
          <>
            <SectionDivider color="#f43f5e" delay={0.7} />
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f43f5e", marginBottom: 16 }}>
                Bugs you missed ({bestReview.missed_bugs.length})
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {bestReview.missed_bugs.map((bug, i) => (
                  <MissedFindingCard key={i} item={bug} index={i} />
                ))}
              </div>
            </motion.div>
          </>
        )}

        {/* Skill update note */}
        <SectionDivider color="#f59e0b" delay={0.9} />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
          <GlassCard style={{ padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 32 }}>✨</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Skill scores updated</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                Your readability, efficiency, and security scores have been updated based on this review cycle.
                Check your profile to see the new radar chart.
              </p>
            </div>
            <button
              onClick={() => navigate("/profile")}
              style={{
                marginLeft: "auto",
                padding: "8px 18px",
                borderRadius: 8,
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                color: "#6366f1",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              View profile
            </button>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
