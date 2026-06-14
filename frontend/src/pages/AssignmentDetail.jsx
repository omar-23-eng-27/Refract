import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import { gsap } from "gsap";
import api from "../api/axios";
import GlassCard from "../components/ui/GlassCard";
import AnimatedSection from "../components/ui/AnimatedSection";

const LANG_MONACO = {
  python: "python",
  javascript: "javascript",
  java: "java",
  cpp: "cpp",
  c: "c",
  typescript: "typescript",
};

function ResultLine({ line, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
        lineHeight: 1.6,
        padding: "1px 0",
      }}
    >
      {line}
    </motion.div>
  );
}

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [code, setCode] = useState("");
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [editorFocused, setEditorFocused] = useState(false);
  const [runPhase, setRunPhase] = useState("idle"); // idle | compress | running | results
  const editorContainerRef = useRef(null);
  const runBtnRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get(`/api/assignments/${id}/`),
      api.get(`/api/assignments/${id}/submissions/`),
    ]).then(([asgRes, subRes]) => {
      setAssignment(asgRes.data);
      const subs = subRes.data.results || subRes.data;
      if (subs.length > 0) {
        const latest = subs[0];
        setSubmission(latest);
        setCode(latest.code);
        if (latest.execution_result) setRunResult(latest.execution_result);
      } else {
        setCode(asgRes.data.starter_code || "");
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // Tilt on focus, flatten on unfocus
  useEffect(() => {
    if (!editorContainerRef.current) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    gsap.to(editorContainerRef.current, {
      rotateX: editorFocused ? 0 : 2,
      rotateY: editorFocused ? 0 : -1,
      scale: editorFocused ? 1 : 0.998,
      duration: 0.6,
      ease: "power2.out",
    });
  }, [editorFocused]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = { assignment: parseInt(id), code };
      const { data } = await api.post(`/api/assignments/${id}/submissions/`, payload);
      setSubmission(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRun = async () => {
    if (!submission) { await handleSubmit(); return; }
    setRunPhase("compress");
    setRunning(true);

    // Animate compress → shoot sequence
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced && runBtnRef.current) {
      gsap.to(runBtnRef.current, { scale: 0.85, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.inOut" });
    }

    setTimeout(() => setRunPhase("running"), 400);

    try {
      await api.post(`/api/assignments/submissions/${submission.id}/run/`);
      // Poll for result
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const { data } = await api.get(`/api/assignments/submissions/${submission.id}/`);
          if (data.status !== "running" && data.status !== "pending") {
            clearInterval(poll);
            setRunResult(data.execution_result);
            setSubmission(data);
            setRunPhase("results");
            setRunning(false);
          }
          if (attempts > 30) { clearInterval(poll); setRunning(false); setRunPhase("idle"); }
        } catch { clearInterval(poll); setRunning(false); setRunPhase("idle"); }
      }, 1000);
    } catch (err) {
      console.error(err);
      setRunning(false);
      setRunPhase("idle");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (!assignment) return null;

  const outputLines = runResult
    ? [...(runResult.stdout || "").split("\n"), ...(runResult.stderr ? [`[stderr] ${runResult.stderr}`] : [])].filter(Boolean)
    : [];

  return (
    <div style={{ padding: "40px 24px", maxWidth: 1280, margin: "0 auto" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: 32 }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0 }}
        >
          ← Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              color: "#6366f1",
              background: "rgba(99,102,241,0.12)",
              padding: "3px 10px",
              borderRadius: 6,
            }}
          >
            {assignment.language}
          </span>
          {submission && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              Version {submission.version}
            </span>
          )}
        </div>
        <h1 style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 8 }}>
          {assignment.title}
        </h1>
        {assignment.due_date && (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            Due {new Date(assignment.due_date).toLocaleDateString()}
          </p>
        )}
      </motion.div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px,420px) 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Problem statement */}
        <AnimatedSection>
          <GlassCard style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#6366f1", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Problem
            </h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {assignment.problem_statement}
            </p>
          </GlassCard>

          {submission && (
            <GlassCard
              style={{ padding: 20, marginTop: 16, cursor: "pointer" }}
              onClick={() => navigate(`/review/${submission.id}`)}
            >
              <p style={{ fontSize: 14, color: "#6366f1", fontWeight: 500 }}>View reviews →</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                {submission.review_count || 0} peer review{submission.review_count !== 1 ? "s" : ""} received
              </p>
            </GlassCard>
          )}
        </AnimatedSection>

        {/* Code editor */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 30, rotateX: 3 }}
            animate={{ opacity: 1, y: 0, rotateX: 2 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
            style={{ perspective: "800px", perspectiveOrigin: "center top" }}
          >
            <div
              ref={editorContainerRef}
              style={{
                transformOrigin: "center top",
                willChange: "transform",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 4px 20px rgba(99,102,241,0.15)",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <GlassCard style={{ borderRadius: 16, overflow: "hidden" }}>
                {/* Editor toolbar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    gap: 6,
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f43f5e" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginLeft: 8, fontFamily: "JetBrains Mono, monospace" }}>
                    {`main.${assignment.language === "python" ? "py" : assignment.language === "javascript" ? "js" : assignment.language}`}
                  </span>
                </div>
                <Editor
                  height="460px"
                  language={LANG_MONACO[assignment.language] || "plaintext"}
                  value={code}
                  onChange={(v) => setCode(v || "")}
                  theme="vs-dark"
                  onMount={(editor) => {
                    editor.onDidFocusEditorWidget(() => setEditorFocused(true));
                    editor.onDidBlurEditorWidget(() => setEditorFocused(false));
                  }}
                  options={{
                    fontSize: 14,
                    fontFamily: "JetBrains Mono, monospace",
                    minimap: { enabled: false },
                    padding: { top: 16, bottom: 16 },
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    renderLineHighlight: "gutter",
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    tabSize: 4,
                  }}
                />
              </GlassCard>
            </div>
          </motion.div>

          {/* Action bar */}
          <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.75)",
                fontSize: 14,
                fontWeight: 500,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {submitting ? "Saving…" : "Save"}
            </button>
            <button
              ref={runBtnRef}
              onClick={handleRun}
              disabled={running}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                background: running
                  ? "rgba(16,185,129,0.2)"
                  : "linear-gradient(135deg, #10b981, #059669)",
                border: "none",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: running ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {runPhase === "compress" && "▶ Compressing…"}
              {runPhase === "running" && (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                  Running…
                </>
              )}
              {(runPhase === "idle" || runPhase === "results") && "▶ Run Tests"}
            </button>
          </div>

          {/* Output terminal */}
          <AnimatePresence>
            {(runPhase === "results" || runResult) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ marginTop: 16 }}
              >
                <GlassCard style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Output
                    </span>
                    {runResult && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: runResult.exit_code === 0 ? "#10b981" : "#f43f5e",
                          background: runResult.exit_code === 0 ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {runResult.timed_out ? "TIMEOUT" : runResult.exit_code === 0 ? "EXIT 0" : `EXIT ${runResult.exit_code}`}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: 8,
                      padding: "12px 16px",
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    {outputLines.length === 0 && (
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
                        No output
                      </span>
                    )}
                    {outputLines.map((line, i) => (
                      <ResultLine key={i} line={line} index={i} />
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
