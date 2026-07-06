import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import "./OperatorDashboard.css";
import { loadWSDeps } from "../../utils/wsLoader";

const WS_URL   = "https://amce.up.railway.app/ws";
const WS_TOPIC = "/user/queue/messages";

/* ─── helpers ────────────────────────────────────────────────────────────── */
function normalize(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (typeof result === "object") return Object.values(result);
  return [];
}

function buildMap(arr) {
  const map = {};
  arr.forEach(m => { if (m.machineId) map[m.machineId] = m; });
  return map;
}

function detectChanges(prev, next) {
  const changed = new Set();
  Object.entries(next).forEach(([id, m]) => {
    const p = prev[id];
    if (!p || p.condition !== m.condition || p.unitProduction !== m.unitProduction ||
        p.current !== m.current || p.voltage !== m.voltage) changed.add(id);
  });
  return changed;
}

function getUsernameFromToken() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return "Operator";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || payload.username || payload.name || "Operator";
  } catch {
    return "Operator";
  }
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const Ic = {
  Monitor: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="18" height="18">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  Activity: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  User: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  Logout: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

/* ─── Root ───────────────────────────────────────────────────────────────── */
export default function OperatorDashboard({ onLogout }) {
  const [machines,   setMachines]   = useState({});
  const [changedIds, setChangedIds] = useState(new Set());
  const [wsStatus,   setWsStatus]   = useState("connecting");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [search,     setSearch]     = useState("");
  const [condFilter, setCondFilter] = useState("ALL");

  const prevDataRef      = useRef({});
  const stompRef         = useRef(null);
  const knownMachinesRef = useRef({});
  const username         = getUsernameFromToken();

  /* ── data updater ── */
  const applyData = useCallback((raw) => {
    const arr      = normalize(raw);
    const incoming = buildMap(arr);

    // ✅ Trust backend condition — do NOT override
    Object.entries(incoming).forEach(([id, m]) => {
      knownMachinesRef.current[id] = { ...m };
    });

    // machines absent from push → stopped
    Object.keys(knownMachinesRef.current).forEach(id => {
      if (!incoming[id]) knownMachinesRef.current[id] = { ...knownMachinesRef.current[id], condition: false };
    });

    const finalMap = { ...knownMachinesRef.current };
    const changed  = detectChanges(prevDataRef.current, finalMap);
    prevDataRef.current = finalMap;
    setMachines({ ...finalMap });
    setChangedIds(changed);
    setLastUpdate(new Date());
    setTimeout(() => setChangedIds(new Set()), 2000);
  }, []);

  /* ── WebSocket connect ── */
  useEffect(() => {
    let cancelled = false;
    const wsRetries = { current: 0 };

    async function connect() {
      try {
        await loadWSDeps();
        if (cancelled) return;

        const socket      = new window.SockJS(WS_URL);
        const stompClient = window.Stomp.over(socket);
        stompClient.debug = null;

        const token = localStorage.getItem("authToken");
        const connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        stompClient.connect(connectHeaders,
          function onConnected() {
            if (cancelled) { stompClient.disconnect(); return; }
            wsRetries.current = 0;
            setWsStatus("connected");

            stompClient.subscribe(WS_TOPIC, function onMessage(msg) {
              try { applyData(JSON.parse(msg.body)); }
              catch (e) { console.error("❌ Parse error:", e); }
            });
          },
          function onError() {
            if (cancelled) return;
            wsRetries.current += 1;
            setWsStatus("connecting");
            setTimeout(() => { if (!cancelled) connect(); }, 5000);
          }
        );

        stompRef.current = stompClient;
      } catch (err) {
        if (!cancelled) {
          setWsStatus("disconnected");
          setTimeout(() => { if (!cancelled) connect(); }, 5000);
        }
      }
    }

    connect();
    return () => {
      cancelled = true;
      try { stompRef.current?.disconnect(); } catch (_) {}
    };
  }, [applyData]);

  /* ── derived ── */
  const allMachines     = useMemo(() => Object.values(machines), [machines]);
  const running         = allMachines.filter(m => m.condition === true).length;
  const stoppedMachines = allMachines.filter(m => m.condition === false);
  const totalProd       = allMachines.reduce((s, m) => s + (m.unitProduction || 0), 0);
  const avgCurrent      = allMachines.length
    ? allMachines.reduce((s, m) => s + (m.current || 0), 0) / allMachines.length : 0;

  const visible = useMemo(() =>
    allMachines.filter(m =>
      (condFilter === "ALL" || (condFilter === "RUNNING" ? m.condition === true : m.condition === false)) &&
      (!search || m.machineId?.toLowerCase().includes(search.toLowerCase()))
    ), [allMachines, condFilter, search]);

  const wsLabel = wsStatus === "connected" ? "Live · WebSocket"
    : wsStatus === "connecting" ? "Connecting…" : "Disconnected";

  const sColor = wsStatus === "connected" ? "var(--op-green)"
    : wsStatus === "connecting" ? "var(--op-amber)" : "var(--op-red)";

  function handleLogout() {
    try { stompRef.current?.disconnect(); } catch (_) {}
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    onLogout?.();
  }

  return (
    <>
      <div className="op-glow-field">
        <div className="op-glow op-glow--amber" />
        <div className="op-glow op-glow--cyan" />
        <div className="op-glow op-glow--faint" />
      </div>
      <div className="op-scanlines" />

      <div className="op-layout">

      {/* ── Sidebar ── */}
      <aside className="op-sidebar">
        <div className="op-brand">
          <div className="op-brand__icon"><Ic.Monitor /></div>
          <div>
            <div className="op-brand__name">ACME Corp</div>
            <div className="op-brand__role">operator</div>
          </div>
        </div>

        <nav className="op-nav">
          <div className="op-nav__label">Workspace</div>
          <button className="op-nav__item active">
            <Ic.Activity />
            <span>My Machines</span>
          </button>
        </nav>

        {/* ✅ logged-in user */}
        <div className="op-user-info">
          <div className="op-user-info__icon"><Ic.User /></div>
          <div>
            <div className="op-user-info__name">{username}</div>
            <div className="op-user-info__label">Logged in</div>
          </div>
        </div>

        <button className="op-logout" onClick={handleLogout}>
          <Ic.Logout /><span>Logout</span>
        </button>
      </aside>

      {/* ── Main ── */}
      <div className="op-main">
        <div className="op-topbar">
          <div>
            <div className="op-topbar__title">My Machines</div>
            <div className="op-topbar__sub">Live feed of your assigned machines</div>
          </div>
          <div className="op-topbar__right">
            {/* ✅ username in topbar corner */}
            <div className="op-topbar__user">
              <Ic.User />
              <span>{username}</span>
            </div>
            <div className={`op-ws-badge op-ws-badge--${wsStatus}`}>
              <span className="op-ws-dot" />
              {wsLabel}
            </div>
          </div>
        </div>

        <div className="op-content">

          {/* status bar */}
          <div className="op-statusbar">
            <div className="op-statusbar__left">
              <span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background:sColor, animation: wsStatus==="connected" ? "op-blink 2s infinite" : "none" }}/>
              <span style={{ fontSize:13, color:sColor, fontWeight:500 }}>{wsLabel}</span>
            </div>
            <div className="op-statusbar__right">
              {changedIds.size > 0 && (
                <span className="op-updated-badge">{changedIds.size} updated</span>
              )}
              {lastUpdate && (
                <span className="op-last-update">Last: {lastUpdate.toLocaleTimeString()}</span>
              )}
            </div>
          </div>

          {/* loading */}
          {allMachines.length === 0 && (
            <div className="op-loading">
              <div className="op-spinner"/>
              <span>Connecting to live feed…</span>
            </div>
          )}

          {allMachines.length > 0 && (
            <div className="op-main__content">
              {/* KPIs */}
              <div className="op-kpi-row">
                <div className="op-kpi op-kpi--green" style={{ animationDelay: "0ms" }}>
                  <div className="op-kpi__icon-badge" style={{ background: "rgba(74,222,128,.12)" }}>🟢</div>
                  <div className="op-kpi__label">Running</div>
                  <div className="op-kpi__value" style={{ color:"var(--op-green)" }}>{running}</div>
                  <div className="op-kpi__sub">of {allMachines.length} machines</div>
                </div>
                <div className="op-kpi op-kpi--red" style={{ animationDelay: "60ms" }}>
                  <div className="op-kpi__icon-badge" style={{ background: "rgba(251,69,112,.12)" }}>🔴</div>
                  <div className="op-kpi__label">Stopped</div>
                  <div className="op-kpi__value" style={{ color: stoppedMachines.length > 0 ? "var(--op-red)" : "var(--op-muted)" }}>
                    {stoppedMachines.length}
                  </div>
                  <div className="op-kpi__sub">machines offline</div>
                </div>
                <div className="op-kpi op-kpi--white" style={{ animationDelay: "120ms" }}>
                  <div className="op-kpi__icon-badge" style={{ background: "rgba(45,212,217,.12)" }}>📦</div>
                  <div className="op-kpi__label">Total Production</div>
                  <div className="op-kpi__value" style={{ color:"var(--op-text)" }}>{totalProd.toLocaleString()}</div>
                  <div className="op-kpi__sub">units this session</div>
                </div>
                <div className="op-kpi op-kpi--white" style={{ animationDelay: "180ms" }}>
                  <div className="op-kpi__icon-badge" style={{ background: "rgba(255,179,64,.12)" }}>⚡</div>
                  <div className="op-kpi__label">Avg Current</div>
                  <div className="op-kpi__value" style={{ color:"var(--op-text)" }}>{avgCurrent.toFixed(1)}</div>
                  <div className="op-kpi__sub">A per machine</div>
                </div>
              </div>

              {/* stopped alert */}
              {stoppedMachines.length > 0 && (
                <div className="op-stopped-alert">
                  <div className="op-stopped-alert__title">
                    <span>⚠</span>
                    {stoppedMachines.length} machine{stoppedMachines.length > 1 ? "s" : ""} not working
                  </div>
                  <div className="op-stopped-alert__tags">
                    {stoppedMachines.map(m => (
                      <span key={m.machineId} className="op-stopped-alert__tag">
                        <span style={{ width:6, height:6, borderRadius:"50%", background:"#ef4444", display:"inline-block" }}/>
                        Machine #{m.machineId}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* filters */}
              <div className="op-filters">
                <input
                  className="op-search"
                  placeholder="Search machine ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {["ALL", "RUNNING", "STOPPED"].map(c => (
                  <button key={c} className="op-filter-btn" onClick={() => setCondFilter(c)} style={{
                    borderColor: condFilter===c ? (c==="RUNNING" ? "#34d399" : c==="STOPPED" ? "#ef4444" : "#6c63ff") : "#1e2540",
                    background:  condFilter===c ? (c==="RUNNING" ? "rgba(52,211,153,0.1)" : c==="STOPPED" ? "rgba(239,68,68,0.1)" : "rgba(108,99,255,0.1)") : "transparent",
                    color:       condFilter===c ? (c==="RUNNING" ? "#34d399" : c==="STOPPED" ? "#ef4444" : "#6c63ff") : "#5a6380",
                  }}>
                    {c === "ALL" ? "All" : c}
                  </button>
                ))}
                <span className="op-count">{visible.length} machines</span>
              </div>

              {/* machine grid */}
              <div className="op-grid">
                {visible.map((m, i) => {
                  const isOn = m.condition === true;
                  return (
                    <div
                      className={`op-card ${isOn ? "op-card--running" : ""}`}
                      key={m.machineId}
                      style={{
                        borderColor: isOn ? "rgba(45,212,217,.18)" : "rgba(251,69,112,.28)",
                        background:  !isOn ? "rgba(251,69,112,.025)" : "var(--op-card)",
                        animationDelay: `${Math.min(i * 25, 400)}ms`,
                      }}
                    >
                      <div className="op-card__header">
                        <span className="op-card__id">#{m.machineId}</span>
                        <span className={`op-dot ${isOn ? "op-dot--green" : "op-dot--red"}`}/>
                      </div>
                      <div className="op-card__dept">{m.department ?? "—"}</div>
                      <div className="op-card__stat">
                        <span className="op-card__stat-label">Production</span>
                        <span className="op-card__stat-val">{m.unitProduction ?? 0} u</span>
                      </div>
                      <div className="op-card__stat">
                        <span className="op-card__stat-label">Current</span>
                        <span className="op-card__stat-val">{m.current != null ? m.current.toFixed(1) : "—"} A</span>
                      </div>
                      <div className="op-card__stat">
                        <span className="op-card__stat-label">Voltage</span>
                        <span className="op-card__stat-val">{m.voltage != null ? m.voltage.toFixed(1) : "—"} V</span>
                      </div>
                      <div className="op-bar-wrap">
                        <div
                          className={`op-bar ${isOn ? "op-bar--running" : "op-bar--stopped"}`}
                          style={{ width: `${Math.min(((m.current||0)/25)*100,100)}%` }}
                        />
                      </div>
                      <div className="op-card__status" style={{ color: isOn ? "var(--op-green)" : "var(--op-red)" }}>
                        <span>●</span>{isOn ? "RUNNING" : "STOPPED"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
