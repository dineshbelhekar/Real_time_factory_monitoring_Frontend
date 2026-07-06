import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { getLiveData } from "../../../api/plantApi";
import { loadWSDeps } from "../../../utils/wsLoader"; // ✅ shared loader — no double loading

const WS_URL      = "https://amcecorp.up.railway.app/ws";
const WS_TOPIC    = "/user/queue/messages";
const FALLBACK_MS = 30000;

const DEPT_COLORS = {
  A: "var(--accent)",
  B: "var(--emerald)",
  C: "var(--violet)",
  D: "var(--amber)",
  E: "var(--rose)",
};

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
    if (!p ||
      p.condition      !== m.condition      ||
      p.unitProduction !== m.unitProduction ||
      p.current        !== m.current        ||
      p.voltage        !== m.voltage) {
      changed.add(id);
    }
  });
  return changed;
}

export default function LiveData() {
  const [machines,   setMachines]   = useState({});
  const [changedIds, setChangedIds] = useState(new Set());
  const [wsStatus,   setWsStatus]   = useState("connecting");
  const [dataSource, setDataSource] = useState("ws");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filter,     setFilter]     = useState("ALL");
  const [condFilter, setCondFilter] = useState("ALL");
  const [search,     setSearch]     = useState("");

  const prevDataRef      = useRef({});
  const stompRef         = useRef(null);
  const pollTimerRef     = useRef(null);
  const wsRetries        = useRef(0);
  const knownMachinesRef = useRef({}); // ✅ isolated per component instance

  // ── Shared data updater ──────────────────────────────────────────
  const applyData = useCallback((raw) => {
    const arr      = normalize(raw);
    const incoming = buildMap(arr); // machines in this push, with their REAL condition

    // ✅ Trust whatever condition the backend sent — do NOT override
    Object.entries(incoming).forEach(([id, m]) => {
      knownMachinesRef.current[id] = { ...m };
    });

    // Any machine NOT in this push at all → mark as stopped
    Object.keys(knownMachinesRef.current).forEach(id => {
      if (!incoming[id]) {
        knownMachinesRef.current[id] = { ...knownMachinesRef.current[id], condition: false };
      }
    });

    const finalMap = { ...knownMachinesRef.current };
    const changed  = detectChanges(prevDataRef.current, finalMap);
    prevDataRef.current = finalMap;
    setMachines({ ...finalMap });
    setChangedIds(changed);
    setLastUpdate(new Date());
    setTimeout(() => setChangedIds(new Set()), 2000);
  }, []);

  // ── REST fallback ────────────────────────────────────────────────
  const fetchViaRest = useCallback(async () => {
    try {
      const raw = await getLiveData();
      applyData(raw);
    } catch (e) {
      console.error("❌ REST fallback error:", e);
    }
  }, [applyData]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    console.warn("⚠ Falling back to REST polling every 30s");
    setDataSource("rest");
    fetchViaRest();
    pollTimerRef.current = setInterval(fetchViaRest, FALLBACK_MS);
  }, [fetchViaRest]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ── WebSocket using window.SockJS + window.Stomp (CDN, same as your test) ──
  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        // Load SockJS + stompjs from CDN into window
        await loadWSDeps();

        if (cancelled) return;

        // ✅ window.SockJS and window.Stomp — exactly like your working subscriber.html
        const socket      = new window.SockJS(WS_URL);
        const stompClient = window.Stomp.over(socket);

        // Disable console debug noise
        stompClient.debug = null;

        // ✅ Pass JWT in STOMP headers — prevents browser login popup
        const token = localStorage.getItem("authToken");
        const connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        stompClient.connect(
          connectHeaders,
          function onConnected() {
            if (cancelled) { stompClient.disconnect(); return; }

            console.log("✅ WebSocket connected");
            wsRetries.current = 0;
            setWsStatus("connected");
            setDataSource("ws");
            stopPolling();

            // ✅ Same subscribe pattern as your subscriber.html
            stompClient.subscribe(WS_TOPIC, function onMessage(message) {
              try {
                const raw = JSON.parse(message.body);
                applyData(raw);
              } catch (e) {
                console.error("❌ Message parse error:", e);
              }
            });
          },
          function onError(error) {
            if (cancelled) return;
            console.error("❌ STOMP error:", error);
            wsRetries.current += 1;
            setWsStatus("connecting");

            if (wsRetries.current >= 3) {
              console.warn("⚠ 3 WS failures — switching to REST");
              setWsStatus("failed");
              startPolling();
            } else {
              // Retry after 5s
              setTimeout(() => { if (!cancelled) connect(); }, 5000);
            }
          }
        );

        stompRef.current = stompClient;

      } catch (err) {
        console.warn("⚠ WS setup failed — using REST:", err.message);
        if (!cancelled) {
          setWsStatus("failed");
          startPolling();
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      try { stompRef.current?.disconnect(); } catch (_) {}
      stopPolling();
    };
  }, [applyData, startPolling, stopPolling]);

  // ── Derived data ─────────────────────────────────────────────────
  const allMachines = useMemo(() => Object.values(machines), [machines]);

  const depts = useMemo(() =>
    ["ALL", ...Array.from(new Set(allMachines.map(d => d.department).filter(Boolean))).sort()],
    [allMachines]
  );

  const visible = useMemo(() =>
    allMachines.filter(m =>
      (filter     === "ALL" || m.department === filter) &&
      (condFilter === "ALL" ||
        (condFilter === "RUNNING" ? m.condition === true : m.condition === false)) &&
      (!search || m.machineId?.toLowerCase().includes(search.toLowerCase()))
    ),
    [allMachines, filter, condFilter, search]
  );

  const running         = allMachines.filter(m => m.condition === true).length;
  const stopped         = allMachines.filter(m => m.condition === false).length;
  const stoppedMachines = allMachines.filter(m => m.condition === false);
  const totalProd       = allMachines.reduce((s, m) => s + (m.unitProduction || 0), 0);
  const avgCurrent      = allMachines.length
    ? allMachines.reduce((s, m) => s + (m.current || 0), 0) / allMachines.length : 0;

  const statusMeta = {
    connected:  { color:"var(--emerald)", label:"Live · WebSocket",                           pulse:true  },
    connecting: { color:"var(--amber)",   label:"Connecting via WebSocket…",                   pulse:false },
    failed:     { color:"var(--rose)",    label:`REST fallback · every ${FALLBACK_MS/1000}s`,  pulse:false },
  };
  const { color:sColor, label:sLabel, pulse:sPulse } = statusMeta[wsStatus] || statusMeta.connecting;

  return (
    <>
      {/* ── Status bar ── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background:"rgba(255,255,255,0.02)", border:"1px solid var(--border)",
        borderRadius:10, padding:"10px 16px", marginBottom:20, flexWrap:"wrap", gap:10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{
            width:8, height:8, borderRadius:"50%", display:"inline-block",
            background:sColor, animation: sPulse ? "blink 2s infinite" : "none",
          }}/>
          <span style={{ fontSize:13, color:sColor, fontWeight:500 }}>{sLabel}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {changedIds.size > 0 && (
            <span style={{
              fontSize:12, padding:"2px 10px", borderRadius:20,
              background:"rgba(0,212,255,0.1)", color:"var(--accent)",
              border:"1px solid rgba(0,212,255,0.2)",
            }}>
              {changedIds.size} updated
            </span>
          )}
          {lastUpdate && (
            <span style={{ fontSize:12, color:"var(--muted)" }}>
              Last: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchViaRest} style={{
            fontSize:12, padding:"4px 12px", borderRadius:8, cursor:"pointer",
            background:"rgba(0,212,255,0.06)", border:"1px solid rgba(0,212,255,0.2)",
            color:"var(--accent)", fontFamily:"inherit",
          }}>↻ Refresh</button>
        </div>
      </div>

      {/* ── Loading ── */}
      {allMachines.length === 0 && (
        <div className="pm-loading">
          <div className="pm-spinner" />
          <span>{wsStatus === "failed" ? "Fetching via REST…" : "Connecting to live feed…"}</span>
        </div>
      )}

      {allMachines.length > 0 && (
        <>
          {/* ── KPI row ── */}
          <div className="pm-kpi-row">
            <div className="pm-kpi" style={{ animationDelay: "0ms" }}>
              <div className="pm-kpi__icon">🟢</div>
              <div className="pm-kpi__label">Running</div>
              <div className="pm-kpi__value" style={{ color:"var(--emerald)" }}>{running}</div>
              <div className="pm-kpi__sub">of {allMachines.length} machines</div>
            </div>
            <div className="pm-kpi" style={{ animationDelay: "60ms", borderColor: stopped > 0 ? "rgba(244,63,94,0.3)" : "var(--border)" }}>
              <div className="pm-kpi__icon">🔴</div>
              <div className="pm-kpi__label">Not Working</div>
              <div className="pm-kpi__value"
                style={{ color: stopped > 0 ? "var(--rose)" : "var(--muted)" }}>
                {stopped}
              </div>
              <div className="pm-kpi__sub">machines offline</div>
            </div>
            <div className="pm-kpi" style={{ animationDelay: "120ms" }}>
              <div className="pm-kpi__icon">📦</div>
              <div className="pm-kpi__label">Total Production</div>
              <div className="pm-kpi__value">{totalProd.toLocaleString()}</div>
              <div className="pm-kpi__sub">units produced</div>
            </div>
            <div className="pm-kpi" style={{ animationDelay: "180ms" }}>
              <div className="pm-kpi__icon">⚡</div>
              <div className="pm-kpi__label">Avg Current</div>
              <div className="pm-kpi__value">{avgCurrent.toFixed(1)}</div>
              <div className="pm-kpi__sub">A per machine</div>
            </div>
          </div>

          {/* ── Non-working machines alert ── */}
          {stoppedMachines.length > 0 && (
            <div style={{
              background:"rgba(244,63,94,0.07)", border:"1px solid rgba(244,63,94,0.25)",
              borderRadius:12, padding:"14px 18px", marginBottom:20,
            }}>
              <div style={{
                fontSize:13, fontWeight:600, color:"var(--rose)",
                marginBottom:10, display:"flex", alignItems:"center", gap:8,
              }}>
                <span style={{ fontSize:16 }}>⚠</span>
                {stoppedMachines.length} machine{stoppedMachines.length > 1 ? "s" : ""} not working
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {stoppedMachines.map(m => (
                  <span key={m.machineId} style={{
                    padding:"3px 12px", borderRadius:20, fontSize:12, fontWeight:500,
                    background:"rgba(244,63,94,0.1)", color:"var(--rose)",
                    border:"1px solid rgba(244,63,94,0.2)",
                    display:"flex", alignItems:"center", gap:5,
                  }}>
                    <span style={{
                      width:6, height:6, borderRadius:"50%",
                      background:"var(--rose)", display:"inline-block",
                    }}/>
                    {m.machineId}
                    <span style={{ fontSize:10, color:"rgba(244,63,94,0.6)", marginLeft:2 }}>
                      {m.department}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Filters ── */}
          <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search machine ID…"
              style={{
                flex:"1 1 160px", maxWidth:220, padding:"6px 12px",
                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(136,153,170,0.2)",
                borderRadius:8, color:"var(--off-white)", fontFamily:"inherit",
                fontSize:12, outline:"none",
              }}
            />
            {depts.map(d => (
              <button key={d} onClick={() => setFilter(d)} style={{
                padding:"5px 12px", borderRadius:20, border:"1px solid",
                fontSize:12, cursor:"pointer", fontFamily:"inherit",
                borderColor: filter===d ? "var(--accent)" : "var(--border)",
                background:  filter===d ? "rgba(0,212,255,0.1)" : "transparent",
                color:       filter===d ? "var(--accent)" : "var(--muted)",
              }}>
                {d === "ALL" ? "All Depts" : d}
              </button>
            ))}
            {["ALL","RUNNING","STOPPED"].map(c => (
              <button key={c} onClick={() => setCondFilter(c)} style={{
                padding:"5px 12px", borderRadius:20, border:"1px solid",
                fontSize:12, cursor:"pointer", fontFamily:"inherit",
                borderColor: condFilter===c
                  ? (c==="RUNNING" ? "var(--emerald)" : c==="STOPPED" ? "var(--rose)" : "var(--accent)")
                  : "var(--border)",
                background: condFilter===c
                  ? (c==="RUNNING" ? "rgba(16,185,129,0.1)" : c==="STOPPED" ? "rgba(244,63,94,0.1)" : "rgba(0,212,255,0.1)")
                  : "transparent",
                color: condFilter===c
                  ? (c==="RUNNING" ? "var(--emerald)" : c==="STOPPED" ? "var(--rose)" : "var(--accent)")
                  : "var(--muted)",
              }}>
                {c === "ALL" ? "All Status" : c}
              </button>
            ))}
            <span style={{ fontSize:12, color:"var(--muted)" }}>{visible.length} machines</span>
          </div>

          {/* ── Machine grid ── */}
          <div className="pm-machine-grid">
            {visible.map((m, i) => {
              const isOn = m.condition === true;
              return (
                <div className="pm-machine-card" key={m.machineId}
                  style={{
                    borderColor: isOn ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.3)",
                    background: !isOn ? "rgba(244,63,94,0.03)" : "var(--navy-card)",
                    // ✅ staggered entrance
                    animationDelay: `${Math.min(i * 15, 400)}ms`,
                  }}>
                  <div className="pm-machine-card__header">
                    <span className="pm-machine-card__id">{m.machineId}</span>
                    <span className={`pm-dot ${isOn ? "pm-dot--green" : "pm-dot--red"}`} />
                  </div>
                  <div className="pm-machine-card__dept"
                    style={{ color: DEPT_COLORS[m.department] || "var(--muted)" }}>
                    {m.department ?? "—"}
                  </div>
                  <div className="pm-machine-card__stat">
                    <span className="pm-machine-card__stat-label">Production</span>
                    <span className="pm-machine-card__stat-val">{m.unitProduction ?? 0} u</span>
                  </div>
                  <div className="pm-machine-card__stat">
                    <span className="pm-machine-card__stat-label">Current</span>
                    <span className="pm-machine-card__stat-val">
                      {m.current != null ? m.current.toFixed(1) : "—"} A
                    </span>
                  </div>
                  <div className="pm-machine-card__stat">
                    <span className="pm-machine-card__stat-label">Voltage</span>
                    <span className="pm-machine-card__stat-val">
                      {m.voltage != null ? m.voltage.toFixed(1) : "—"} V
                    </span>
                  </div>
                  <div className="pm-bar-wrap">
                    <div className={`pm-bar ${isOn ? "pm-bar--flow" : ""}`} style={{
                      width:`${Math.min(((m.current||0)/25)*100, 100)}%`,
                      background: isOn ? "var(--emerald)" : "var(--rose)",
                    }}/>
                  </div>
                  <div style={{
                    fontSize:10, marginTop:5, fontWeight:500,
                    color: isOn ? "var(--emerald)" : "var(--rose)",
                  }}>
                    {isOn ? "● RUNNING" : "● STOPPED"}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
