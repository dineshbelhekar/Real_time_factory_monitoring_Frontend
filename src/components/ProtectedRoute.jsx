import { useEffect, useState } from "react";
import { fetchAndStoreRole } from "../api/authApi";

/**
 * Auth flow:
 * 1. Check localStorage for "authToken"
 *    → No token → call onDenied() immediately (no API call)
 * 2. Token found → call GET /role
 *    → Returns a role → store in localStorage as "userRole" → render children
 *    → Returns null   → clear storage + call onDenied()
 */
export default function ProtectedRoute({ children, onDenied }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    // Step 1: No token → go to login immediately
    if (!token) {
      setStatus("denied");
      onDenied();
      return;
    }

    // Step 2: Token exists → fetch role from backend
    fetchAndStoreRole().then((role) => {
      if (role) {
        setStatus("ok"); // role already saved inside fetchAndStoreRole
      } else {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        setStatus("denied");
        onDenied();
      }
    });
  }, []);

  if (status === "checking") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0D1B2A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        fontFamily: "'IBM Plex Sans', sans-serif",
        color: "#8899AA",
        fontSize: 14,
      }}>
        <span style={{
          width: 32, height: 32,
          border: "3px solid rgba(0,212,255,0.2)",
          borderTopColor: "#00D4FF",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
          display: "inline-block",
        }} />
        <span>Verifying session…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "denied") return null;

  return children;
}
