import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import { gsap } from "gsap";
import api from "../api/axios";
import GlassCard from "../components/ui/GlassCard";
import AnimatedSection from "../components/ui/AnimatedSection";

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";

const SEVERITY_COLORS = {
  low: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  high: { color: "#f43f5e", bg: "rgba(244,63,94,0.15)" },
  critical: { color: "#f43f5e", bg: "rgba(244,63,94,0.2)" },
};

function FindingCard({ item, type, index, revealed }) {
  const sev = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.low;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={revealed ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
    >
      <GlassCard style={{ padding: 16, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              background: sev.bg,
              color: sev.color,
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            {item.severity}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            {type === "bug" ? "Bug" : type === "smell" ? "Code smell" : "Security"}
          </span>
          {(item.line_start || item.line_end) && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>
              L{item.line_start}–{item.line_end}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
          {item.description || item.vulnerability_type}
        </p>
        {(item.fix_suggestion || item.suggestion) && (
          <p style={{ fontSize: 12, color: "rgba(99,102,241,0.8)", marginTop: 6, fontStyle: "italic" }}>
            💡 {item.fix_suggestion || item.suggestion}
          </p>
        )}
      </GlassCard>
    </motion.div>
  );
}

function LockShattersReveal({ onReveal }) {
  const lockRef = useRef(null);
  const [shattered, setShattered] = useState(false);

  const handleUnlock = () => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setShattered(true); onReveal(); return; }
    if (lockRef.current) {
      gsap.to(lockRef.current, {
        scale: 1.3,
        rotation: 15,
        duration: 0.15,
        yoyo: true,
        repeat: 3,
        ease: "power2.inOut",
        onComplete: () => {
          gsap.to(lockRef.current, {
            scale: 0,
            opacity: 0,
            duration: 0.3,
            ease: "back.in(3)",
            onComplete: () => { setShattered(true); onReveal(); },
          });
        },
      });
    }
  };

  if (shattered) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", gap: 16 }}>
      <div ref={lockRef} style={{ fontSize: 48 }}>🔒</div>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
        AI analysis is hidden until you submit a review
      </p>
      <button
        onClick={handleUnlock}
        style={{
          padding: "10px 24px",
          borderRadius: 10,
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          border: "none",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "Inter, sans-serif",
        }}
      >
        Reveal AI findings
      </button>
    </div>
  );
}

export default function CodeReview() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [review, setReview] = useState(null);
  const [comments, setComments] = useState([]);
  const [overallComment, setOverallComment] = useState("");
  const [commentDraft, setCommentDraft] = useState({ content: "", startOffset: 0, endOffset: 0 });
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiRevealed, setAiRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const wsRef = useRef(null);
  const editorRef = useRef(null);
  const commentFormRef = useRef(null);

  // Load submission + existing review
  useEffect(() => {
    Promise.all([
      api.get(`/api/assignments/submissions/${submissionId}/`),
      api.get(`/api/reviews/submissions/${submissionId}/reviews/`),
    ]).then(([subRes, revRes]) => {
      setSubmission(subRes.data);
      const revs = revRes.data.results || revRes.data;
      if (revs.length > 0) {
        const r = revs[0];
        setReview(r);
        setOverallComment(r.overall_comment || "");
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [submissionId]);

  // Load line comments if we have a review
  useEffect(() => {
    if (!review) return;
    api.get(`/api/reviews/${review.id}/comments/`).then((res) => {
      const data = res.data.results || res.data;
      setComments(data);
    });
  }, [review?.id]);

  // WebSocket setup
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const ws = new WebSocket(`${WS_BASE}/ws/review/${submissionId}/?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "line_comment.created") {
        setComments((prev) => {
          if (prev.find((c) => c.id === msg.data.id)) return prev;
          return [...prev, msg.data];
        });
      }
      if (msg.type === "line_comment.deleted") {
        setComments((prev) => prev.filter((c) => c.id !== msg.comment_id));
      }
    };

    return () => ws.close();
  }, [submissionId]);

  // Create or ensure review exists
  const ensureReview = useCallback(async () => {
    if (review) return review;
    const { data } = await api.post(`/api/reviews/submissions/${submissionId}/reviews/`, {
      overall_comment: "",
    });
    setReview(data);
    return data;
  }, [review, submissionId]);

  const handleAddComment = async () => {
    const r = await ensureReview();
    const payload = {
      review: r.id,
      file_path: "main",
      start_offset: commentDraft.startOffset,
      end_offset: commentDraft.endOffset,
      content: commentDraft.content,
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "line_comment.create",
        data: { ...payload, review_id: r.id },
      }));
    } else {
      const { data } = await api.post(`/api/reviews/${r.id}/comments/`, payload);
      setComments((prev) => [...prev, data]);
    }

    setCommentDraft({ content: "", startOffset: 0, endOffset: 0 });
    setShowCommentForm(false);
  };

  const handleEditorSelection = (editor) => {
    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) return;
    const model = editor.getModel();
    if (!model) return;
    const startOffset = model.getOffsetAt(selection.getStartPosition());
    const endOffset = model.getOffsetAt(selection.getEndPosition());
    setCommentDraft((d) => ({ ...d, startOffset, endOffset }));

    // Spring-expand comment form
    setShowCommentForm(true);
    if (commentFormRef.current) {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReduced) {
        gsap.fromTo(commentFormRef.current, { scaleY: 0, opacity: 0 }, {
          scaleY: 1, opacity: 1, duration: 0.35, ease: "back.out(1.4)", transformOrigin: "top"
        });
      }
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const r = await ensureReview();
      await api.patch(`/api/reviews/${r.id}/`, { overall_comment: overallComment, is_complete: false });
      await api.post(`/api/reviews/${r.id}/complete/`);
      navigate(`/arbitration/${submissionId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const handleRevealAI = async () => {
    if (!aiAnalysis) {
      try {
        const { data } = await api.get(`/api/ai/submissions/${submissionId}/analysis/`);
        setAiAnalysis(data);
      } catch {
        setAiAnalysis({ bugs: [], code_smells: [], security_flags: [] });
      }
    }
    setAiRevealed(true);
  };

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading…</div>;
  }
  if (!submission) return null;

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} style={{ marginBottom: 28 }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 12 }}>← Back</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
          Code Review
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
          Submission #{submissionId} — {comments.length} inline comment{comments.length !== 1 ? "s" : ""}
        </p>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
        {/* Left: Code pane (appears closer via scale/shadow) */}
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 2px 10px rgba(99,102,241,0.1)",
          }}
        >
          <GlassCard style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f43f5e" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: 8, fontFamily: "JetBrains Mono" }}>
                {submission.assignment_title}
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>
                Select text to comment
              </span>
            </div>
            <Editor
              height="520px"
              language="plaintext"
              value={submission.code}
              theme="vs-dark"
              onMount={(editor) => {
                editorRef.current = editor;
                editor.onDidChangeCursorSelection(() => handleEditorSelection(editor));
              }}
              options={{
                readOnly: true,
                fontSize: 13,
                fontFamily: "JetBrains Mono, monospace",
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                renderLineHighlight: "all",
                lineNumbers: "on",
              }}
            />
          </GlassCard>

          {/* Comment form — spring-expands on selection */}
          <AnimatePresence>
            {showCommentForm && (
              <motion.div
                ref={commentFormRef}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                exit={{ scaleY: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                style={{ transformOrigin: "top", marginTop: 12 }}
              >
                <GlassCard style={{ padding: 16 }}>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                    Offset {commentDraft.startOffset}–{commentDraft.endOffset}
                  </p>
                  <textarea
                    value={commentDraft.content}
                    onChange={(e) => setCommentDraft((d) => ({ ...d, content: e.target.value }))}
                    placeholder="Your inline comment…"
                    rows={3}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 13,
                      padding: "10px 12px",
                      resize: "vertical",
                      fontFamily: "Inter, sans-serif",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      onClick={handleAddComment}
                      style={{
                        padding: "7px 16px",
                        borderRadius: 8,
                        background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                        border: "none",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Add comment
                    </button>
                    <button
                      onClick={() => setShowCommentForm(false)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Overall comment */}
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Overall comment
            </h3>
            <textarea
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              rows={5}
              placeholder="Share your overall thoughts on this submission…"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                padding: "10px 12px",
                resize: "vertical",
                fontFamily: "Inter, sans-serif",
                outline: "none",
                lineHeight: 1.6,
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleComplete}
              disabled={completing}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "10px",
                borderRadius: 10,
                background: completing ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
                border: "none",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: completing ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {completing ? "Submitting…" : "Submit & see arbitration →"}
            </button>
          </GlassCard>

          {/* Inline comments list */}
          {comments.length > 0 && (
            <GlassCard style={{ padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Inline comments ({comments.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                {comments.map((c) => (
                  <div key={c.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
                      Offset {c.start_offset}–{c.end_offset}
                    </p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{c.content}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* AI Findings — locked until review submitted */}
          <GlassCard style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                AI Findings
              </h3>
            </div>
            {!aiRevealed ? (
              <LockShattersReveal onReveal={handleRevealAI} />
            ) : (
              <div style={{ padding: "16px 20px", maxHeight: 400, overflowY: "auto" }}>
                {aiAnalysis?.bugs?.map((b, i) => <FindingCard key={`bug-${i}`} item={b} type="bug" index={i} revealed={aiRevealed} />)}
                {aiAnalysis?.security_flags?.map((s, i) => <FindingCard key={`sec-${i}`} item={s} type="security" index={i + (aiAnalysis.bugs?.length || 0)} revealed={aiRevealed} />)}
                {aiAnalysis?.code_smells?.map((s, i) => <FindingCard key={`smell-${i}`} item={s} type="smell" index={i + (aiAnalysis.bugs?.length || 0) + (aiAnalysis.security_flags?.length || 0)} revealed={aiRevealed} />)}
                {(!aiAnalysis || (aiAnalysis.bugs?.length === 0 && aiAnalysis.code_smells?.length === 0 && aiAnalysis.security_flags?.length === 0)) && (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "20px 0" }}>No findings yet. Analysis may still be running.</p>
                )}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
