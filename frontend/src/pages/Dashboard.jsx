import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import GlassCard from "../components/ui/GlassCard";
import AnimatedSection from "../components/ui/AnimatedSection";
import RadarChart3D from "../components/three/RadarChart3D";

gsap.registerPlugin(ScrollTrigger);

const LANG_BADGE_COLORS = {
  python: "#3776ab",
  javascript: "#f7df1e",
  java: "#b07219",
  cpp: "#f34b7d",
  c: "#555555",
  typescript: "#3178c6",
};

function StatusPill({ status }) {
  const colors = {
    passed: { bg: "rgba(16,185,129,0.15)", color: "#10b981", label: "Passed" },
    failed: { bg: "rgba(244,63,94,0.15)", color: "#f43f5e", label: "Failed" },
    pending: { bg: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", label: "Pending" },
    running: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: "Running" },
    error: { bg: "rgba(244,63,94,0.12)", color: "#f43f5e", label: "Error" },
  };
  const s = colors[status] || colors.pending;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
      }}
    >
      {s.label}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const cardsRef = useRef(null);

  useEffect(() => {
    api.get("/api/auth/dashboard/").then((res) => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Stagger assignment cards on scroll
  useEffect(() => {
    if (!data || !cardsRef.current) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const cards = cardsRef.current.querySelectorAll("[data-card]");
    const ctx = gsap.context(() => {
      cards.forEach((card, i) => {
        const fromX = i % 2 === 0 ? -40 : 40;
        gsap.fromTo(
          card,
          { opacity: 0, x: fromX, scale: 0.95 },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.6,
            ease: "power2.out",
            delay: i * 0.06,
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          }
        );
      });
    });
    return () => ctx.revert();
  }, [data]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  const { assignments = [], recent_submissions = [], skill_snapshots = [] } = data || {};
  const latestSkills = skill_snapshots.length
    ? skill_snapshots[skill_snapshots.length - 1]
    : { readability: user?.readability_score || 0, efficiency: user?.efficiency_score || 0, security: user?.security_score || 0 };

  return (
    <div style={{ padding: "40px 24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ marginBottom: 48 }}
      >
        <h1
          style={{
            fontSize: "clamp(22px, 3.5vw, 36px)",
            fontWeight: 700,
            letterSpacing: "-1px",
            color: "#fff",
            marginBottom: 6,
          }}
        >
          Welcome back, {user?.username} 👋
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
          Here's your progress and active assignments
        </p>
      </motion.div>

      {/* Radar chart + skill scores */}
      <AnimatedSection style={{ marginBottom: 48 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            alignItems: "center",
          }}
        >
          {/* 3D Radar */}
          <GlassCard style={{ padding: 0, overflow: "hidden", height: 340 }}>
            <Canvas camera={{ position: [0, 0, 4], fov: 55 }} style={{ background: "transparent" }}>
              <ambientLight intensity={0.4} />
              <pointLight position={[3, 3, 3]} intensity={6} color="#6366f1" />
              <pointLight position={[-3, -2, 2]} intensity={4} color="#10b981" />
              <RadarChart3D
                readability={latestSkills.readability}
                efficiency={latestSkills.efficiency}
                security={latestSkills.security}
              />
            </Canvas>
          </GlassCard>

          {/* Score breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Readability", value: latestSkills.readability, color: "#6366f1" },
              { label: "Efficiency", value: latestSkills.efficiency, color: "#10b981" },
              { label: "Security", value: latestSkills.security, color: "#f59e0b" },
            ].map(({ label, value, color }) => (
              <GlassCard key={label} style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>{label}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color }}>{Math.round(value)}</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                    style={{ height: "100%", background: color, borderRadius: 4 }}
                  />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Recent submissions */}
      {recent_submissions.length > 0 && (
        <AnimatedSection style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 16 }}>
            Recent submissions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recent_submissions.map((sub) => (
              <GlassCard
                key={sub.id}
                onClick={() => navigate(`/assignments/${sub.assignment}`)}
                style={{ padding: "16px 20px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#fff", marginBottom: 3 }}>
                      {sub.assignment_title}
                    </p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                      Version {sub.version} · {new Date(sub.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusPill status={sub.status} />
                </div>
              </GlassCard>
            ))}
          </div>
        </AnimatedSection>
      )}

      {/* Assignments */}
      <AnimatedSection>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 20 }}>
          Active assignments
        </h2>
        <div ref={cardsRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {assignments.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, gridColumn: "1/-1" }}>
              No active assignments yet.
            </p>
          )}
          {assignments.map((a) => (
            <div key={a.id} data-card style={{ opacity: 0 }}>
              <GlassCard
                onClick={() => navigate(`/assignments/${a.id}`)}
                style={{ padding: "24px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      color: LANG_BADGE_COLORS[a.language] || "#fff",
                      background: "rgba(255,255,255,0.06)",
                      padding: "3px 9px",
                      borderRadius: 6,
                    }}
                  >
                    {a.language}
                  </span>
                  {a.user_submission && <StatusPill status={a.user_submission.status} />}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8, lineHeight: 1.3 }}>
                  {a.title}
                </h3>
                {a.due_date && (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    Due {new Date(a.due_date).toLocaleDateString()}
                  </p>
                )}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.4)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>by {a.created_by_username}</span>
                  <span
                    style={{
                      color: "#6366f1",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    View →
                  </span>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      </AnimatedSection>
    </div>
  );
}
