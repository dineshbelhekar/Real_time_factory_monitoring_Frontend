import { useState } from "react";
import LoginPage             from "./components/Login/LoginPage";
import ProtectedRoute        from "./components/ProtectedRoute";
import PlantManagerDashboard from "./components/PlantManager/PlantManagerDashboard";
import DeptManagerDashboard  from "./components/DeptManager/DeptManagerDashboard";
import AdminDashboard        from "./components/admin/AdminDashboard";
import MaintenanceDashboard  from "./components/maintenance/MaintenanceDashboard";
import OperatorDashboard from "./components/Operator/OperatorDashboard";

function RoleDashboard({ onLogout }) {
  const role = localStorage.getItem("userRole");

  if (role === "PLANTMANAGER") return <PlantManagerDashboard onLogout={onLogout} />;
  if (role === "ADMIN")        return <AdminDashboard        onLogout={onLogout} />;
  if (role === "DEPTMANAGER")  return <DeptManagerDashboard  onLogout={onLogout} />;
  if (role === "TECHNICIAN")   return <MaintenanceDashboard onLogout={onLogout} />;
  if (role === "OPERATOR")     return <OperatorDashboard onLogout={onLogout} />;


  // Unknown role fallback
  return (
    <div style={{
      minHeight:"100vh", background:"#0D1B2A",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'IBM Plex Sans',sans-serif", gap:12,
    }}>
      <div style={{ fontSize:32 }}>🚧</div>
      <div style={{ color:"#F0F4F8", fontSize:18, fontWeight:600 }}>No dashboard configured for role:</div>
      <div style={{ color:"#8B5CF6", fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700 }}>
        "{role || "none"}"
      </div>
      <button onClick={onLogout} style={{
        marginTop:16, padding:"10px 24px", borderRadius:10,
        background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.3)",
        color:"#8B5CF6", cursor:"pointer", fontFamily:"inherit", fontSize:14,
      }}>Logout</button>
    </div>
  );
}

export default function App() {
  const hasToken = Boolean(localStorage.getItem("authToken"));
  const [page, setPage] = useState(hasToken ? "dashboard" : "login");

  if (page === "login") return <LoginPage onLoginSuccess={() => setPage("dashboard")} />;

  return (
    <ProtectedRoute onDenied={() => setPage("login")}>
      <RoleDashboard onLogout={() => setPage("login")} />
    </ProtectedRoute>
  );
}
