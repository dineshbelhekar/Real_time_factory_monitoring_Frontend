import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { getDeptLiveData } from "../../../api/deptApi";
import { loadWSDeps } from "../../../utils/wsLoader"; // ✅ shared loader — no double loading

const WS_URL      = "http://localhost:8080/ws";
const WS_TOPIC    = "/user/queue/messages";
const FALLBACK_MS = 30000;

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



export default function DeptLiveData() {
  const [machines,   setMachines]   = useState({});
  const [changedIds, setChangedIds] = useState(new Set());
  const [wsStatus,   setWsStatus]   = useState("connecting");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [search,     setSearch]     = useState("");
  const [condFilter, setCondFilter] = useState("ALL");

  const prevDataRef      = useRef({});
  const stompRef         = useRef(null);
  const pollTimerRef     = useRef(null);
  const wsRetries        = useRef(0);
  const knownMachinesRef = useRef({}); // ✅ isolated per component instance

  // ── Data updater ─────────────────────────────────────────────────
  const applyData = useCallback((raw) => {
    const arr      = normalize(raw);
    const incoming = buildMap(arr); // machines in this push, with their REAL condition

    // ✅ Trust whatever condition the backend sent — do NOT override
    Object.entries(incoming).forEach(([id, m]) => {
      knownMachinesRef.current[id] = { ...m };
    });

    // Machines NOT present in this push at all (dropped from feed entirely)
    // → mark as stopped, since we have no fresher data for them
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

  // ── REST fallback ────────────────────────────────────────────────
  const fetchViaRest = useCallback(async () => {
    try { applyData(await getDeptLiveData()); }
    catch (e) { console.error("❌ REST error:", e); }
  }, [applyData]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    setWsStatus("failed");
    fetchViaRest();
    pollTimerRef.current = setInterval(fetchViaRest, FALLBACK_MS);
  }, [fetchViaRest]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  // ── WebSocket ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        await loadWSDeps();
        if (cancelled) return;

        const socket      = new window.SockJS(WS_URL);
        const stompClient = window.Stomp.over(socket);
        stompClient.debug = null;

        // ✅ Pass JWT in STOMP headers — prevents browser login popup
        const token = localStorage.getItem("authToken");
        const connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        stompClient.connect(connectHeaders,
          function onConnected() {
            if (cancelled) { stompClient.disconnect(); return; }
            wsRetries.current = 0;
            setWsStatus("connected");
            stopPolling();

            stompClient.subscribe(WS_TOPIC, function onMessage(msg) {
              try { applyData(JSON.parse(msg.body)); }
              catch (e) { console.error("❌ Parse error:", e); }
            });
          },
          function onError() {
            if (cancelled) return;
            wsRetries.current += 1;
            setWsStatus("connecting");
            if (wsRetries.current >= 3) startPolling();
            else setTimeout(() => { if (!cancelled) connect(); }, 5000);
          }
        );

        stompRef.current = stompClient;
      } catch (err) {
        if (!cancelled) startPolling();
      }
    }

    connect();
    return () => {
      cancelled = true;
      try { stompRef.current?.disconnect(); } catch (_) {}
      stopPolling();
    };
  }, [applyData, startPolling, stopPolling]);

  // ── Derived ──────────────────────────────────────────────────────
  const allMachines     = useMemo(() => Object.values(machines), [machines]);
  const running         = allMachines.filter(m => m.condition === true).length;
  const stoppedMachines = allMachines.filter(m => m.condition === false);
  const totalProd       = allMachines.reduce((s, m) => s + (m.unitProduction || 0), 0);
  const avgCurrent      = allMachines.length
    ? allMachines.reduce((s, m) => s + (m.current || 0), 0) / allMachines.length : 0;

  const visible = useMemo(() =>
    allMachines.filter(m =>
      (condFilter === "ALL" || (condFilter === "RUNNING" ? m.condition : !m.condition)) &&
      (!search || m.machineId?.toLowerCase().includes(search.toLowerCase()))
    ), [allMachines, condFilter, search]);

  const statusMeta = {
    connected:  { color:"var(--dm-emerald)", label:"Live · WebSocket",                          pulse:true  },
    connecting: { color:"var(--dm-amber)",   label:"Connecting…",                               pulse:false },
    failed:     { color:"var(--dm-rose)",    label:`REST fallback · every ${FALLBACK_MS/1000}s`, pulse:false },
  };
  const { color:sColor, label:sLabel, pulse:sPulse } = statusMeta[wsStatus] || statusMeta.connecting;

  return (
    <>
      {/* Status bar */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background:"rgba(255,255,255,0.02)", border:"1px solid var(--dm-border)",
        borderRadius:10, padding:"10px 16px", marginBottom:20, flexWrap:"wrap", gap:10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background:sColor, animation: sPulse ? "dm-blink 2s infinite" : "none" }}/>
          <span style={{ fontSize:13, color:sColor, fontWeight:500 }}>{sLabel}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {changedIds.size > 0 && (
            <span style={{ fontSize:12, padding:"2px 10px", borderRadius:20, background:"rgba(139,92,246,0.1)", color:"var(--dm-accent)", border:"1px solid rgba(139,92,246,0.2)" }}>
              {changedIds.size} updated
            </span>
          )}
          {lastUpdate && <span style={{ fontSize:12, color:"var(--dm-muted)" }}>Last: {lastUpdate.toLocaleTimeString()}</span>}
          <button onClick={fetchViaRest} style={{
            fontSize:12, padding:"4px 12px", borderRadius:8, cursor:"pointer",
            background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.2)",
            color:"var(--dm-accent)", fontFamily:"inherit",
          }}>↻ Refresh</button>
        </div>
      </div>

      {allMachines.length === 0 && (
        <div className="dm-loading">
          <div className="dm-spinner"/>
          <span>{wsStatus === "failed" ? "Fetching via REST…" : "Connecting to live feed…"}</span>
        </div>
      )}

      {allMachines.length > 0 && (
        <>
          {/* KPIs */}
          <div className="dm-kpi-row">
            <div className="dm-kpi" style={{ animationDelay: "0ms" }}>
              <div className="dm-kpi__icon">🟢</div>
              <div className="dm-kpi__label">Running</div>
              <div className="dm-kpi__value" style={{ color:"var(--dm-emerald)" }}>{running}</div>
              <div className="dm-kpi__sub">of {allMachines.length} machines</div>
            </div>
            <div className="dm-kpi" style={{ animationDelay: "60ms", borderColor: stoppedMachines.length > 0 ? "rgba(244,63,94,0.3)" : "var(--dm-border)" }}>
              <div className="dm-kpi__icon">🔴</div>
              <div className="dm-kpi__label">Not Working</div>
              <div className="dm-kpi__value" style={{ color: stoppedMachines.length > 0 ? "var(--dm-rose)" : "var(--dm-muted)" }}>
                {stoppedMachines.length}
              </div>
              <div className="dm-kpi__sub">machines offline</div>
            </div>
            <div className="dm-kpi" style={{ animationDelay: "120ms" }}>
              <div className="dm-kpi__icon">📦</div>
              <div className="dm-kpi__label">Total Production</div>
              <div className="dm-kpi__value">{totalProd.toLocaleString()}</div>
              <div className="dm-kpi__sub">units this session</div>
            </div>
            <div className="dm-kpi" style={{ animationDelay: "180ms" }}>
              <div className="dm-kpi__icon">⚡</div>
              <div className="dm-kpi__label">Avg Current</div>
              <div className="dm-kpi__value">{avgCurrent.toFixed(1)}</div>
              <div className="dm-kpi__sub">A per machine</div>
            </div>
          </div>

          {/* Stopped machines alert */}
          {stoppedMachines.length > 0 && (
            <div className="dm-stopped-alert">
              <div className="dm-stopped-alert__title">
                <span>⚠</span>
                {stoppedMachines.length} machine{stoppedMachines.length > 1 ? "s" : ""} not working
              </div>
              <div className="dm-stopped-alert__tags">
                {stoppedMachines.map(m => (
                  <span key={m.machineId} className="dm-stopped-alert__tag">
                    <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--dm-rose)", display:"inline-block" }}/>
                    {m.machineId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search machine ID…"
              style={{
                flex:"1 1 160px", maxWidth:220, padding:"6px 12px",
                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(148,144,170,0.2)",
                borderRadius:8, color:"var(--dm-off-white)", fontFamily:"inherit", fontSize:12, outline:"none",
              }}
            />
            {["ALL","RUNNING","STOPPED"].map(c => (
              <button key={c} onClick={() => setCondFilter(c)} style={{
                padding:"5px 12px", borderRadius:20, border:"1px solid", fontSize:12,
                cursor:"pointer", fontFamily:"inherit",
                borderColor: condFilter===c ? (c==="RUNNING" ? "var(--dm-emerald)" : c==="STOPPED" ? "var(--dm-rose)" : "var(--dm-accent)") : "var(--dm-border)",
                background:  condFilter===c ? (c==="RUNNING" ? "rgba(16,185,129,0.1)" : c==="STOPPED" ? "rgba(244,63,94,0.1)" : "rgba(139,92,246,0.1)") : "transparent",
                color:       condFilter===c ? (c==="RUNNING" ? "var(--dm-emerald)" : c==="STOPPED" ? "var(--dm-rose)" : "var(--dm-accent)") : "var(--dm-muted)",
              }}>
                {c === "ALL" ? "All Status" : c}
              </button>
            ))}
            <span style={{ fontSize:12, color:"var(--dm-muted)" }}>{visible.length} machines</span>
          </div>

          {/* Machine grid */}
          <div className="dm-machine-grid">
            {visible.map((m, i) => {
              const isOn = m.condition === true;
              return (
                <div
                  className="dm-machine-card"
                  key={m.machineId}
                  style={{
                    borderColor: isOn ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.3)",
                    background:  !isOn ? "rgba(244,63,94,0.03)" : "var(--dm-navy-card)",
                    // ✅ staggered entrance, matching Dept/Machine Data panels
                    animationDelay: `${Math.min(i * 25, 400)}ms`,
                  }}
                >
                  <div className="dm-machine-card__header">
                    <span className="dm-machine-card__id">{m.machineId}</span>
                    <span className={`dm-dot ${isOn ? "dm-dot--green" : "dm-dot--red"}`}/>
                  </div>
                  <div className="dm-machine-card__dept">{m.department ?? "—"}</div>
                  <div className="dm-machine-card__stat">
                    <span className="dm-machine-card__stat-label">Production</span>
                    <span className="dm-machine-card__stat-val">{m.unitProduction ?? 0} u</span>
                  </div>
                  <div className="dm-machine-card__stat">
                    <span className="dm-machine-card__stat-label">Current</span>
                    <span className="dm-machine-card__stat-val">{m.current != null ? m.current.toFixed(1) : "—"} A</span>
                  </div>
                  <div className="dm-machine-card__stat">
                    <span className="dm-machine-card__stat-label">Voltage</span>
                    <span className="dm-machine-card__stat-val">{m.voltage != null ? m.voltage.toFixed(1) : "—"} V</span>
                  </div>
                  <div className="dm-bar-wrap" style={{ marginTop:6 }}>
                    <div className={`dm-bar ${isOn ? "dm-bar--flow" : ""}`} style={{ width:`${Math.min(((m.current||0)/25)*100,100)}%`, background: isOn ? "var(--dm-emerald)" : "var(--dm-rose)" }}/>
                  </div>
                  <div style={{ fontSize:10, marginTop:5, fontWeight:500, color: isOn ? "var(--dm-emerald)" : "var(--dm-rose)" }}>
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
