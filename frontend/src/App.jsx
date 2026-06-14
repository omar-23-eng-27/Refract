import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AssignmentDetail from "./pages/AssignmentDetail";
import CodeReview from "./pages/CodeReview";
import AIArbitration from "./pages/AIArbitration";
import InstructorDashboard from "./pages/InstructorDashboard";
import StudentProfile from "./pages/StudentProfile";

function ProtectedRoute({ children, requireInstructor = false }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#05070f",
          color: "rgba(255,255,255,0.4)",
          fontSize: 14,
        }}
      >
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (requireInstructor && user.role !== "instructor") return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assignments/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <AssignmentDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assignments"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/review/:submissionId"
        element={
          <ProtectedRoute>
            <Layout>
              <CodeReview />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/arbitration/:submissionId"
        element={
          <ProtectedRoute>
            <Layout>
              <AIArbitration />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor"
        element={
          <ProtectedRoute requireInstructor>
            <Layout>
              <InstructorDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <StudentProfile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
