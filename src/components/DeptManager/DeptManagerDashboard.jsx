import { useState } from "react";
import "./DeptManager.css";
import DeptLiveData      from "./sections/DeptLiveData";
import DeptData          from "./sections/DeptData";
import DeptMachineData   from "./sections/DeptMachineData";
import DeptEmployeeDrawer from "./sections/DeptEmployeeDrawer";

const NAV = [
  { id:"live",    label:"Live Data",     icon:"📡", eyebrow:"Real-time",  title:"Live Machine Data",   sub:"Live feed from your department machines" },
  { id:"dept",    label:"Dept Data",     icon:"🏢", eyebrow:"Summary",    title:"Department Data",     sub:"Department performance snapshots" },
  { id:"machine", label:"Machine Data",  icon:"🔧", eyebrow:"Aggregated", title:"Machine Data",        sub:"30-minute aggregated machine records" },
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

export default function DeptManagerDashboard({ onLogout }) {
  const [active,     setActive]     = useState("live");
  const [empOpen,    setEmpOpen]    = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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
      <div className="dm-glow-field">
        <div className="dm-glow dm-glow--violet" />
        <div className="dm-glow dm-glow--cyan" />
        <div className="dm-glow dm-glow--faint" />
      </div>
      <div className="dm-scanlines" />

      <div className="dm-layout">

      {/* Sidebar */}
      <aside className="dm-sidebar">
        <div className="dm-sidebar__brand">
          <div className="dm-sidebar__logo"><IconBuilding /></div>
          <div>
            <div className="dm-sidebar__name">ACME Corp</div>
            <div className="dm-sidebar__role">Dept Manager</div>
          </div>
        </div>

        <nav className="dm-nav">
          {NAV.map(n => (
            <button key={n.id}
              className={`dm-nav__item ${active === n.id ? "active" : ""}`}
              onClick={() => setActive(n.id)}>
              <span className="dm-nav__icon" style={{ fontSize:16 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
          <div className="dm-nav__divider"/>
          <button
            className={`dm-nav__item dm-nav__item--emp ${empOpen ? "active" : ""}`}
            onClick={() => setEmpOpen(true)}>
            <span className="dm-nav__icon"><IconPeople /></span>
            <span>My Team</span>
          </button>
        </nav>

        {/* ✅ Logged-in user card */}
        <div className="dm-user-info">
          <div className="dm-user-info__icon"><IconUser /></div>
          <div>
            <div className="dm-user-info__name">{username}</div>
            <div className="dm-user-info__label">Logged in</div>
          </div>
        </div>

        <button className="dm-sidebar__logout" onClick={handleLogout}>
          <IconLogout />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main */}
      <div className="dm-main">
        <div className="dm-topbar">
          <div>
            <div className="dm-topbar__title">{current?.title}</div>
            <div className="dm-topbar__sub">{current?.sub}</div>
          </div>
          <div className="dm-topbar__right">
            {/* ✅ Username pill in topbar corner */}
            <div className="dm-topbar__user">
              <IconUser />
              <span>{username}</span>
            </div>
            <div className="dm-status">
              <span className="dm-status__dot"/>
              Online
            </div>
            <button className={`dm-refresh-btn ${refreshing ? "spinning" : ""}`} onClick={handleRefresh}>
              <IconRefresh /> Refresh
            </button>
          </div>
        </div>

        <div className="dm-content">
          <div className="dm-section-header">
            <div>
              <div className="dm-section-eyebrow">{current?.eyebrow}</div>
              <div className="dm-section-title">{current?.title}</div>
            </div>
          </div>

          {active === "live"    && <DeptLiveData    key={`live-${refreshKey}`}    />}
          {active === "dept"    && <DeptData        key={`dept-${refreshKey}`}    />}
          {active === "machine" && <DeptMachineData key={`machine-${refreshKey}`} />}
        </div>
      </div>

      <DeptEmployeeDrawer open={empOpen} onClose={() => setEmpOpen(false)} />
      </div>
    </>
  );
}
