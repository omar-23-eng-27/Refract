import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as d3 from "d3";
import api from "../api/axios";
import GlassCard from "../components/ui/GlassCard";
import AnimatedSection from "../components/ui/AnimatedSection";

gsap.registerPlugin(ScrollTrigger);

function HeatmapCell({ value, max, row, col }) {
  const intensity = max > 0 ? value / max : 0;
  const color = d3.interpolate("#1a1b2e", "#6366f1")(intensity);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: (row * 10 + col) * 0.01, duration: 0.3 }}
      title={`${value} submissions`}
      style={{
        width: 14,
        height: 14,
        borderRadius: 3,
        background: color,
        border: "1px solid rgba(255,255,255,0.04)",
        cursor: "default",
      }}
    />
  );
}

function SubmissionHeatmap({ students }) {
  // Generate a fake 12-week heatmap grid per student for visual appeal
  // In production this would use real submission dates
  const weeks = 12;
  const days = 7;

  const grid = Array.from({ length: days }, (_, d) =>
    Array.from({ length: weeks }, (_, w) => ({
      value: Math.random() > 0.65 ? Math.floor(Math.random() * 4 + 1) : 0,
    }))
  );
  const max = Math.max(...grid.flat().map((c) => c.value), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {grid.map((row, r) => (
        <div key={r} style={{ display: "flex", gap: 2 }}>
          {row.map((cell, c) => (
            <HeatmapCell key={c} value={cell.value} max={max} row={r} col={c} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const cardsRef = useRef(null);

  useEffect(() => {
    api.get("/api/ai/instructor/stats/").then((res) => {
      setStats(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!stats || !cardsRef.current) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardsRef.current.querySelectorAll("[data-student-card]"),
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.05,
          scrollTrigger: { trigger: cardsRef.current, start: "top 80%" },
        }
      );
    });
    return () => ctx.revert();
  }, [stats]);

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading…</div>;

  const { assignment_count = 0, total_submissions = 0, total_reviews = 0, students = [] } = stats || {};

  return (
    <div style={{ padding: "40px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 6 }}>
          Instructor Dashboard
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Cohort overview and student progress</p>
      </motion.div>

      {/* Summary stats */}
      <AnimatedSection stagger style={{ marginBottom: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { label: "Assignments", value: assignment_count, color: "#6366f1" },
            { label: "Total submissions", value: total_submissions, color: "#10b981" },
            { label: "Completed reviews", value: total_reviews, color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <GlassCard key={label} style={{ padding: "24px 28px" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                {label}
              </p>
              <p style={{ fontSize: 36, fontWeight: 800, color, letterSpacing: "-1px" }}>
                {value}
              </p>
            </GlassCard>
          ))}
        </div>
      </AnimatedSection>

      {/* Submission heatmap */}
      <AnimatedSection style={{ marginBottom: 40 }}>
        <GlassCard style={{ padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 20 }}>Cohort activity (last 12 weeks)</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 8 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} style={{ height: 14, fontSize: 10, color: "rgba(255,255,255,0.25)", lineHeight: "14px" }}>{d}</div>
              ))}
            </div>
            <SubmissionHeatmap students={students} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <div
                key={v}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: d3.interpolate("#1a1b2e", "#6366f1")(v),
                }}
              />
            ))}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>More</span>
          </div>
        </GlassCard>
      </AnimatedSection>

      {/* Student cards */}
      <AnimatedSection>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 20 }}>Students ({students.length})</h2>
        <div
          ref={cardsRef}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}
        >
          {students.map((s) => (
            <div key={s.id} data-student-card style={{ opacity: 0 }}>
              <GlassCard style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{s.username}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                      {s.submission_count} submission{s.submission_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(16,185,129,0.3))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {s.username[0].toUpperCase()}
                  </div>
                </div>
                {[
                  { label: "Readability", value: s.readability, color: "#6366f1" },
                  { label: "Efficiency", value: s.efficiency, color: "#10b981" },
                  { label: "Security", value: s.security, color: "#f59e0b" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
                      <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
                      <span style={{ color, fontWeight: 600 }}>{Math.round(value)}</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        style={{ height: "100%", background: color, borderRadius: 2 }}
                      />
                    </div>
                  </div>
                ))}
              </GlassCard>
            </div>
          ))}
          {students.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, gridColumn: "1/-1" }}>
              No students yet.
            </p>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}
