import { useState, useEffect, useRef, useCallback } from "react";
import "./MaintenanceDashboard.css";
import { acceptAlert, completeAlert } from "../../api/maintenanceApi";
import { loadWSDeps } from "../../utils/wsLoader";

const WS_URL   = "https://amce.up.railway.app/ws";
const WS_TOPIC = "/user/queue/messages";

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const Ic = {
  Wrench: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="18" height="18">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  Activity: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  History: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Logout: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  User: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
};

/* ─── helpers ────────────────────────────────────────────────────────────── */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDateTime(dt) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

// ✅ Decode username from JWT stored in localStorage
function getUsernameFromToken() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return "User";
    const payload = JSON.parse(atob(token.split(".")[1]));
    // JWT subject is usually stored as "sub" — adjust if your backend uses a different claim
    return payload.sub || payload.username || payload.name || "User";
  } catch {
    return "User";
  }
}

/* ─── ActiveJob — timer calculated from acceptedAt timestamp, survives tab switches ── */
function ActiveJob({ job, onComplete, style }) {
  // ✅ Calculate elapsed from acceptedAt on every tick — not counting from 0
  const [elapsed, setElapsed]       = useState(() => Math.floor((Date.now() - job.acceptedAt) / 1000));
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      // Always derive from the original acceptedAt — switching tabs can't reset this
      setElapsed(Math.floor((Date.now() - job.acceptedAt) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [job.acceptedAt]);

  async function handleComplete() {
    setCompleting(true);
    await onComplete(job.machineId);
    setCompleting(false);
  }

  const timerClass = elapsed > 1800
    ? "mn-timer mn-timer--over"
    : elapsed > 600
    ? "mn-timer mn-timer--warn"
    : "mn-timer";

  return (
    <div className="mn-job" style={style}>
      <div className="mn-job__left">
        <div className="mn-job__machine">Machine #{job.machineId}</div>
        <div className="mn-job__dept">{job.department}</div>
      </div>
      <div className="mn-job__right">
        <div className={timerClass}>{formatTime(elapsed)}</div>
        <button
          className="mn-btn-complete"
          onClick={handleComplete}
          disabled={completing}
        >
          <Ic.Check />
          {completing ? "Submitting…" : "Maintenance Completed"}
        </button>
      </div>
    </div>
  );
}

/* ─── AlertPopup ─────────────────────────────────────────────────────────── */
function AlertPopup({ alert, onAccept, onDismiss }) {
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    await onAccept(alert);
    setLoading(false);
  }

  return (
    <div className="mn-alert-overlay">
      <div className="mn-alert-box">
        <div className="mn-alert-box__banner">
          <div className="mn-alert-box__icon">🚨</div>
          <div>
            <div className="mn-alert-box__banner-title">Machine Failure Detected</div>
            <div className="mn-alert-box__banner-sub">Immediate maintenance required</div>
          </div>
        </div>
        <div className="mn-alert-box__body">
          <div className="mn-alert-row">
            <span className="mn-alert-label">Machine ID</span>
            <span className="mn-alert-val">{alert.machineId}</span>
          </div>
          <div className="mn-alert-row">
            <span className="mn-alert-label">Department</span>
            <span className="mn-alert-val">{alert.department}</span>
          </div>
          <div className="mn-alert-row">
            <span className="mn-alert-label">Failed At</span>
            <span className="mn-alert-val">{formatDateTime(alert.FailTime)}</span>
          </div>
          <div className="mn-alert-row">
            <span className="mn-alert-label">Message</span>
            <span className="mn-alert-msg">{alert.message}</span>
          </div>
        </div>
        <div className="mn-alert-box__foot">
          <button className="mn-btn mn-btn--dismiss" onClick={onDismiss}>Dismiss</button>
          <button className="mn-btn mn-btn--accept" onClick={handleAccept} disabled={loading}>
            {loading ? "Accepting…" : "✓ Accept Job"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ResponseToast ──────────────────────────────────────────────────────── */
function ResponseToast({ status, message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  const ok = String(status).startsWith("2") || status === "OK" || status === 200;
  return (
    <div className={`mn-response mn-response--${ok ? "ok" : "err"}`}>
      <div className="mn-response__status">{ok ? "✓ Success" : "✗ Error"} — {status}</div>
      <div className="mn-response__msg">{message}</div>
    </div>
  );
}

/* ─── NAV ────────────────────────────────────────────────────────────────── */
const NAV = [
  { id: "active",  label: "Active Jobs", icon: <Ic.Activity /> },
  { id: "history", label: "Job History", icon: <Ic.History  /> },
];

/* ─── Root ───────────────────────────────────────────────────────────────── */
export default function MaintenanceDashboard({ onLogout }) {
  const [active,       setActive]       = useState("active");
  const [wsStatus,     setWsStatus]     = useState("connecting");
  const [pendingAlert, setPendingAlert] = useState(null);
  const [activeJobs,   setActiveJobs]   = useState([]);
  const [history,      setHistory]      = useState([]);
  const [response,     setResponse]     = useState(null);
  const stompRef = useRef(null);

  // ✅ Read username once from JWT on mount
  const username = getUsernameFromToken();

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
              try {
                const data = JSON.parse(msg.body);
                setPendingAlert(data);
              } catch (e) {
                console.error("❌ Parse error:", e);
              }
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
  }, []);

  /* ── Accept alert ── */
  async function handleAccept(alert) {
    try {
      const res = await acceptAlert(alert.machineId);
      setResponse({ status: res?.status ?? "OK", message: res?.message ?? "Job accepted." });
      // ✅ Store acceptedAt as a timestamp — timer derives from this, not from counter
      setActiveJobs(prev => [...prev, { ...alert, acceptedAt: Date.now() }]);
      setPendingAlert(null);
    } catch (e) {
      setResponse({ status: "Error", message: e.message });
      setPendingAlert(null);
    }
  }

  /* ── Complete job ── */
  const handleComplete = useCallback(async (machineId) => {
    try {
      const res = await completeAlert(machineId);
      setResponse({ status: res?.status ?? "OK", message: res?.message ?? "Job marked complete." });
      setActiveJobs(prev => {
        const job = prev.find(j => j.machineId === machineId);
        if (job) {
          setHistory(h => [{ ...job, completedAt: new Date().toISOString() }, ...h]);
        }
        return prev.filter(j => j.machineId !== machineId);
      });
    } catch (e) {
      setResponse({ status: "Error", message: e.message });
    }
  }, []);

  const totalToday = activeJobs.length + history.length;
  const wsLabel    = wsStatus === "connected" ? "Live" : wsStatus === "connecting" ? "Connecting…" : "Disconnected";

  function handleLogout() {
    try { stompRef.current?.disconnect(); } catch (_) {}
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    onLogout?.();
  }

  return (
    <>
      <div className="mn-glow-field">
        <div className="mn-glow mn-glow--crimson" />
        <div className="mn-glow mn-glow--violet" />
        <div className="mn-glow mn-glow--faint" />
      </div>
      <div className="mn-scanlines" />

      <div className="mn-layout">

      {/* ── Sidebar ── */}
      <aside className="mn-sidebar">
        <div className="mn-brand">
          <div className="mn-brand__icon"><Ic.Wrench /></div>
          <div>
            <div className="mn-brand__name">ACME Corp</div>
            <div className="mn-brand__role">maintenance</div>
          </div>
        </div>

        <nav className="mn-nav">
          <div className="mn-nav__label">Workspace</div>
          {NAV.map(n => (
            <button
              key={n.id}
              className={`mn-nav__item ${active === n.id ? "active" : ""}`}
              onClick={() => setActive(n.id)}
            >
              <span className="mn-nav__dot" />
              <span className="mn-nav__icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.id === "active" && activeJobs.length > 0 && (
                <span style={{ marginLeft:"auto", background:"var(--mn-crimson)", color:"#fff", fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:8, fontFamily:"JetBrains Mono" }}>
                  {activeJobs.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ✅ Logged-in user shown above logout */}
        <div className="mn-user-info">
          <div className="mn-user-info__icon"><Ic.User /></div>
          <div>
            <div className="mn-user-info__name">{username}</div>
            <div className="mn-user-info__label">Logged in</div>
          </div>
        </div>

        <button className="mn-logout" onClick={handleLogout}>
          <Ic.Logout /><span>Logout</span>
        </button>
      </aside>

      {/* ── Main ── */}
      <div className="mn-main">
        <div className="mn-topbar">
          <div className="mn-topbar__left">
            <div className="mn-topbar__title">
              {active === "active" ? "Active Jobs" : "Job History"}
            </div>
            <div className="mn-topbar__sub">
              {active === "active" ? "Real-time machine failure response" : "Completed maintenance log"}
            </div>
          </div>
          <div className="mn-topbar__right">
            {/* ✅ Username in topbar corner too */}
            <div className="mn-topbar__user">
              <Ic.User />
              <span>{username}</span>
            </div>
            <div className={`mn-ws-badge mn-ws-badge--${wsStatus}`}>
              <span className="mn-ws-dot" />
              {wsLabel}
            </div>
          </div>
        </div>

        <div className="mn-content">

          {/* stats */}
          <div className="mn-stats">
            <div className="mn-stat mn-stat--orange">
              <div className="mn-stat__label">Active Jobs</div>
              <div className="mn-stat__val">{activeJobs.length}</div>
              <div className="mn-stat__sub">in progress right now</div>
            </div>
            <div className="mn-stat mn-stat--green">
              <div className="mn-stat__label">Completed Today</div>
              <div className="mn-stat__val">{history.length}</div>
              <div className="mn-stat__sub">jobs resolved</div>
            </div>
            <div className="mn-stat mn-stat--red">
              <div className="mn-stat__label">Total Alerts</div>
              <div className="mn-stat__val">{totalToday}</div>
              <div className="mn-stat__sub">received this session</div>
            </div>
          </div>

          {/* active jobs */}
          {active === "active" && (
            <div className="mn-panel">
              <div className="mn-panel__head">
                <div className="mn-panel__title">Jobs In Progress</div>
                <div className="mn-panel__count">{activeJobs.length} active</div>
              </div>
              {activeJobs.length === 0 ? (
                <div className="mn-empty">
                  <div className="mn-empty__icon">🔧</div>
                  <div className="mn-empty__text">No active jobs</div>
                  <div className="mn-empty__sub">Waiting for machine alerts…</div>
                </div>
              ) : (
                <div className="mn-jobs">
                  {activeJobs.map((job, i) => (
                    <ActiveJob
                      key={job.machineId}
                      job={job}
                      onComplete={handleComplete}
                      style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* history */}
          {active === "history" && (
            <div className="mn-panel">
              <div className="mn-panel__head">
                <div className="mn-panel__title">Completed Jobs</div>
                <div className="mn-panel__count">{history.length} total</div>
              </div>
              {history.length === 0 ? (
                <div className="mn-empty">
                  <div className="mn-empty__icon">📋</div>
                  <div className="mn-empty__text">No completed jobs yet</div>
                  <div className="mn-empty__sub">Completed jobs will appear here</div>
                </div>
              ) : (
                <div style={{ padding:"0 20px" }}>
                  <div className="mn-log">
                    {history.map((job, i) => (
                      <div key={i} className="mn-log__item">
                        <div className="mn-log__dot" />
                        <div>
                          <div className="mn-log__machine">Machine #{job.machineId}</div>
                          <div className="mn-log__detail">{job.department} — {job.message}</div>
                        </div>
                        <div className="mn-log__time">{formatDateTime(job.completedAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {pendingAlert && (
          <AlertPopup
            alert={pendingAlert}
            onAccept={handleAccept}
            onDismiss={() => setPendingAlert(null)}
          />
        )}

        {response && (
          <ResponseToast
            status={response.status}
            message={response.message}
            onDone={() => setResponse(null)}
          />
        )}
      </div>
    </div>
    </>
  );
}
