import { useState } from "react";
import "./PlantManager.css";
import LiveData       from "./sections/LiveData";
import MachineData    from "./sections/MachineData";
import DepartmentData from "./sections/DepartmentData";
import PlantData      from "./sections/PlantData";
import EmployeeDrawer from "./sections/EmployeeDrawer";

/* ── Nav items ── */
const NAV = [
  { id:"live",   label:"Live Data",       icon:"📡", eyebrow:"Real-time",  title:"Live Machine Data",    sub:"Live feed from all 100 machines" },
  { id:"machine",label:"Machine Data",    icon:"🔧", eyebrow:"Aggregated", title:"Machine Data",         sub:"30-minute aggregated snapshots" },
  { id:"dept",   label:"Department Data", icon:"🏢", eyebrow:"By Dept",    title:"Department Overview",  sub:"Performance across 5 departments" },
  { id:"plant",  label:"Plant Data",      icon:"🏭", eyebrow:"Plant-wide", title:"Plant Summary",        sub:"Facility-wide metrics" },
];

// ✅ Decode logged-in username from JWT
function getUsernameFromToken() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return "Manager";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || payload.username || payload.name || "Manager";
  } catch {
    return "Manager";
  }
}

/* ── Icons ── */
const IconBuilding = () => (
  <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
    <path d="M12 2L3 7v15h18V7L12 2zm-1 18H7v-4h4v4zm6 0h-4v-4h4v4zM5 9.5l7-4 7 4V7l-7-4-7 4v2.5z"/>
  </svg>
);
const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconPeople = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconUser = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

export default function PlantManagerDashboard({ onLogout }) {
  const [active,      setActive]      = useState("live");
  const [empOpen,     setEmpOpen]     = useState(false);
  const [refreshKey,  setRefreshKey]  = useState(0);
  const [refreshing,  setRefreshing]  = useState(false);

  const current  = NAV.find(n => n.id === active);
  const username = getUsernameFromToken();

  function handleRefresh() {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setRefreshing(false), 1000);
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    onLogout();
  }

  return (
    <>
      <div className="pm-glow-field">
        <div className="pm-glow pm-glow--cyan" />
        <div className="pm-glow pm-glow--violet" />
        <div className="pm-glow pm-glow--faint" />
      </div>
      <div className="pm-scanlines" />

      <div className="pm-layout">

        {/* ── Sidebar ── */}
        <aside className="pm-sidebar">
          <div className="pm-sidebar__brand">
            <div className="pm-sidebar__logo"><IconBuilding /></div>
            <div>
              <div className="pm-sidebar__name">ACME Corp</div>
              <div className="pm-sidebar__role">Plant Manager</div>
            </div>
          </div>

          <nav className="pm-nav">
            {NAV.map(n => (
              <button
                key={n.id}
                className={`pm-nav__item ${active === n.id ? "active" : ""}`}
                onClick={() => setActive(n.id)}
              >
                <span className="pm-nav__icon" style={{ fontSize:16 }}>{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}

            <div className="pm-nav__divider" />

            {/* Employee panel — tucked at bottom of nav */}
            <button
              className={`pm-nav__item pm-nav__item--emp ${empOpen ? "active" : ""}`}
              onClick={() => setEmpOpen(true)}
            >
              <span className="pm-nav__icon"><IconPeople /></span>
              <span>Employees</span>
            </button>
          </nav>

          {/* ✅ Logged-in user card */}
          <div className="pm-user-info">
            <div className="pm-user-info__icon"><IconUser /></div>
            <div>
              <div className="pm-user-info__name">{username}</div>
              <div className="pm-user-info__label">Logged in</div>
            </div>
          </div>

          <button className="pm-sidebar__logout" onClick={handleLogout}>
            <IconLogout />
            <span>Logout</span>
          </button>
        </aside>

        {/* ── Main ── */}
        <div className="pm-main">

          {/* Top bar */}
          <div className="pm-topbar">
            <div>
              <div className="pm-topbar__title">{current?.title}</div>
              <div className="pm-topbar__sub">{current?.sub}</div>
            </div>
            <div className="pm-topbar__right">
              {/* ✅ Username pill in topbar corner */}
              <div className="pm-topbar__user">
                <IconUser />
                <span>{username}</span>
              </div>
              <div className="pm-status">
                <span className="pm-status__dot" />
                Online
              </div>
              <button
                className={`pm-refresh-btn ${refreshing ? "spinning" : ""}`}
                onClick={handleRefresh}
              >
                <IconRefresh /> Refresh
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="pm-content">
            <div className="pm-section-header">
              <div>
                <div className="pm-section-eyebrow">{current?.eyebrow}</div>
                <div className="pm-section-title">{current?.title}</div>
              </div>
            </div>

            {/* Sections — key forces remount on refresh */}
            {active === "live"    && <LiveData       key={`live-${refreshKey}`}    />}
            {active === "machine" && <MachineData    key={`machine-${refreshKey}`} />}
            {active === "dept"    && <DepartmentData key={`dept-${refreshKey}`}    />}
            {active === "plant"   && <PlantData      key={`plant-${refreshKey}`}   />}
          </div>
        </div>

        {/* Employee drawer */}
        <EmployeeDrawer open={empOpen} onClose={() => setEmpOpen(false)} />
      </div>
    </>
  );
}
