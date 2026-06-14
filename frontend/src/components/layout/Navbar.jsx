import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";

const NAV_LINKS_STUDENT = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/assignments", label: "Assignments" },
  { to: "/profile", label: "Profile" },
];

const NAV_LINKS_INSTRUCTOR = [
  { to: "/instructor", label: "Dashboard" },
  { to: "/assignments", label: "Assignments" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const links = user?.role === "instructor" ? NAV_LINKS_INSTRUCTOR : NAV_LINKS_STUDENT;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 60,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        background: "rgba(5,7,15,0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Link
        to="/dashboard"
        style={{
          fontWeight: 700,
          fontSize: 18,
          color: "#fff",
          textDecoration: "none",
          letterSpacing: "-0.5px",
          marginRight: 32,
          background: "linear-gradient(135deg, #6366f1, #10b981)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Refract
      </Link>

      <div style={{ display: "flex", gap: 8, flex: 1 }}>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              color: location.pathname.startsWith(link.to)
                ? "#fff"
                : "rgba(255,255,255,0.55)",
              background: location.pathname.startsWith(link.to)
                ? "rgba(99,102,241,0.15)"
                : "transparent",
              transition: "all 0.2s",
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
          {user?.username}
        </span>
        <button
          onClick={handleLogout}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Logout
        </button>
      </div>
    </motion.nav>
  );
}
