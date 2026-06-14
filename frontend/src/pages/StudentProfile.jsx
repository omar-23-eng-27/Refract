import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import * as d3 from "d3";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import GlassCard from "../components/ui/GlassCard";
import AnimatedSection from "../components/ui/AnimatedSection";

const COLORS = { readability: "#6366f1", efficiency: "#10b981", security: "#f59e0b" };

const BADGES = [
  { id: "first_review", label: "First Review", icon: "📝", description: "Completed your first peer review" },
  { id: "bug_hunter", label: "Bug Hunter", icon: "🐛", description: "Found a critical bug in a review" },
  { id: "code_mentor", label: "Code Mentor", icon: "🎓", description: "Scored 90+ on review quality" },
  { id: "speed_reader", label: "Speed Reader", icon: "⚡", description: "Reviewed 5 submissions in a day" },
  { id: "security_guard", label: "Security Guard", icon: "🛡️", description: "Security score reached 80" },
  { id: "refractor", label: "Refractor", icon: "🔮", description: "Completed 10 review cycles" },
];

function GrowthTimeline({ snapshots }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || snapshots.length < 2) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const container = containerRef.current;
    const W = container.clientWidth || 600;
    const H = 220;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", W)
      .attr("height", H);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(snapshots, (d) => new Date(d.created_at)))
      .range([0, w]);

    const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);

    // Grid
    g.append("g")
      .selectAll("line")
      .data([0, 25, 50, 75, 100])
      .enter().append("line")
      .attr("x1", 0).attr("x2", w)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "rgba(255,255,255,0.06)")
      .attr("stroke-dasharray", "3,4");

    // Axes
    g.append("g").attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%b %d")))
      .selectAll("text").style("fill", "rgba(255,255,255,0.35)").style("font-size", "11px");
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").attr("stroke", "rgba(255,255,255,0.1)");

    const dimensions = ["readability", "efficiency", "security"];
    dimensions.forEach((dim) => {
      const lineGen = d3.line()
        .x((d) => x(new Date(d.created_at)))
        .y((d) => y(d[dim]))
        .curve(d3.curveCatmullRom.alpha(0.5));

      const path = g.append("path")
        .datum(snapshots)
        .attr("fill", "none")
        .attr("stroke", COLORS[dim])
        .attr("stroke-width", 2.5)
        .attr("d", lineGen);

      if (!prefersReduced) {
        const totalLen = path.node().getTotalLength();
        path
          .attr("stroke-dasharray", totalLen)
          .attr("stroke-dashoffset", totalLen)
          .transition()
          .duration(1400)
          .delay(
            dim === "readability" ? 0 : dim === "efficiency" ? 200 : 400
          )
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);
      }

      // Dots
      g.selectAll(`.dot-${dim}`)
        .data(snapshots)
        .enter().append("circle")
        .attr("class", `dot-${dim}`)
        .attr("cx", (d) => x(new Date(d.created_at)))
        .attr("cy", (d) => y(d[dim]))
        .attr("r", 3.5)
        .attr("fill", COLORS[dim])
        .attr("stroke", "#05070f")
        .attr("stroke-width", 1.5);
    });
  }, [snapshots]);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", overflow: "visible" }} />
    </div>
  );
}

function Badge({ badge, earned }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "16px 12px",
        borderRadius: 12,
        background: earned ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${earned ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)"}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          fontSize: 28,
          filter: earned ? "none" : "grayscale(100%) brightness(0.3)",
          animation: earned ? "badge-pulse 3s ease-in-out infinite" : "none",
        }}
      >
        {badge.icon}
      </span>
      <p style={{ fontSize: 12, fontWeight: 600, color: earned ? "#fff" : "rgba(255,255,255,0.3)", textAlign: "center" }}>
        {badge.label}
      </p>
      <p style={{ fontSize: 11, color: earned ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.4 }}>
        {badge.description}
      </p>
      {!earned && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2.5s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
}

export default function StudentProfile() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get(`/api/ai/users/${user.id}/snapshots/`).then((res) => {
      const data = res.data.results || res.data;
      setSnapshots(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id]);

  // Mock badge earned state — in production derive from user stats
  const earnedBadges = snapshots.length > 0
    ? ["first_review", user?.readability_score >= 80 && "code_mentor", user?.security_score >= 80 && "security_guard"].filter(Boolean)
    : [];

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading…</div>;

  return (
    <div style={{ padding: "40px 24px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Profile header */}
      <AnimatedSection style={{ marginBottom: 40 }}>
        <GlassCard style={{ padding: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 800,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 4 }}>
                {user?.username}
              </h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{user?.email}</p>
              {user?.bio && <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>{user.bio}</p>}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
              {[
                { label: "Readability", value: user?.readability_score || 0, color: "#6366f1" },
                { label: "Efficiency", value: user?.efficiency_score || 0, color: "#10b981" },
                { label: "Security", value: user?.security_score || 0, color: "#f59e0b" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-1px" }}>{Math.round(value)}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </AnimatedSection>

      {/* Growth timeline */}
      <AnimatedSection style={{ marginBottom: 40 }}>
        <GlassCard style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Skill growth timeline</h2>
            <div style={{ display: "flex", gap: 16 }}>
              {Object.entries(COLORS).map(([dim, color]) => (
                <div key={dim} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 3, borderRadius: 2, background: color }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "capitalize" }}>{dim}</span>
                </div>
              ))}
            </div>
          </div>
          {snapshots.length >= 2 ? (
            <GrowthTimeline snapshots={snapshots} />
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
              Complete review cycles to see your growth chart
            </div>
          )}
        </GlassCard>
      </AnimatedSection>

      {/* Badges */}
      <AnimatedSection>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 20 }}>Badges</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {BADGES.map((badge) => (
            <Badge key={badge.id} badge={badge} earned={earnedBadges.includes(badge.id)} />
          ))}
        </div>
      </AnimatedSection>

      <style>{`
        @keyframes badge-pulse {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(99,102,241,0.4)); }
          50% { filter: drop-shadow(0 0 12px rgba(99,102,241,0.8)); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
