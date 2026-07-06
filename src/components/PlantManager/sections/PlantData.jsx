import { useEffect, useState, useMemo } from "react";
import { getPlantData } from "../../../api/plantApi";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

function formatDT(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString([], {
      weekday:"short", month:"short", day:"numeric",
      hour:"2-digit", minute:"2-digit",
    });
  } catch { return ts; }
}

function formatChartTime(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }); }
  catch { return ts; }
}

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="pm-tooltip">
      <div className="pm-tooltip__label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : p.value}
        </div>
      ))}
    </div>
  );
}

export default function PlantData() {
  const [data,      setData]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [rawSample, setRawSample] = useState(null);

  useEffect(() => {
    getPlantData()
      .then(result => {
        console.log("✅ PlantData raw response:", result);
        console.log("✅ First item keys:", result?.[0] ? Object.keys(result[0]) : "empty");
        if (result?.[0]) setRawSample(result[0]);
        // Handle both single object AND array response from backend
        if (Array.isArray(result)) {
          setData(result);
        } else if (result && typeof result === "object") {
          setData([result]); // wrap single object in array
        } else {
          setData([]);
        }
      })
      .catch(e => {
        console.error("❌ PlantData error:", e);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="pm-loading"><div className="pm-spinner" /><span>Loading plant data…</span></div>;
  if (error)   return <div className="pm-error">⚠ {error}</div>;

  if (!data.length) return (
    <div className="pm-loading">
      <div style={{ fontSize: 32 }}>📭</div>
      <span>No plant data received from API.</span>
      {rawSample && (
        <div style={{ marginTop: 12, background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 10, padding: 16, maxWidth: 500, width: "100%" }}>
          <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Raw API response (first item)</div>
          <pre style={{ fontSize: 12, color: "var(--off-white)", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {JSON.stringify(rawSample, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );

  // Normalize field names flexibly
  const normalized = data.map(d => ({
    id:              pick(d, "id", "Id", "ID"),
    totalPower:      Number(pick(d, "totalPower", "total_power", "power", "totalpower", "TotalPower") ?? 0),
    totalProduction: Number(pick(d, "totalProduction", "total_production", "production", "totalproduction", "TotalProduction") ?? 0),
    timeStamp:       pick(d, "timeStamp", "timestamp", "time_stamp", "createdAt", "recordedAt", "dateTime"),
  }));

  const latest   = normalized[normalized.length - 1] || {};
  const totalPow = normalized.reduce((s, d) => s + d.totalPower, 0);
  const totalPrd = normalized.reduce((s, d) => s + d.totalProduction, 0);
  const avgPow   = normalized.length ? totalPow / normalized.length : 0;
  const maxPow   = Math.max(...normalized.map(d => d.totalPower), 0);

  // ✅ Charts want chronological order
  const chartData = [...normalized]
    .sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp))
    .map(d => ({
      time:            formatChartTime(d.timeStamp),
      totalPower:      d.totalPower,
      totalProduction: d.totalProduction,
    }));

  return (
    <>
      {/* Raw field debug — shows ONLY if fields look wrong */}
      {rawSample && pick(rawSample, "totalPower", "total_power", "power") === undefined && (
        <div style={{ marginBottom: 16, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--amber)", marginBottom: 6, fontWeight: 600 }}>⚠ Field name mismatch — raw first item from API:</div>
          <pre style={{ fontSize: 12, color: "var(--off-white)", overflowX: "auto", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(rawSample, null, 2)}
          </pre>
        </div>
      )}

      {/* KPI row */}
      <div className="pm-kpi-row" style={{ marginBottom:28 }}>
        <div className="pm-kpi" style={{ animationDelay: "0ms" }}>
          <div className="pm-kpi__icon">📋</div>
          <div className="pm-kpi__label">Records</div>
          <div className="pm-kpi__value">{normalized.length}</div>
          <div className="pm-kpi__sub">plant snapshots</div>
        </div>
        <div className="pm-kpi" style={{ animationDelay: "60ms" }}>
          <div className="pm-kpi__icon">⚡</div>
          <div className="pm-kpi__label">Cumulative Power</div>
          <div className="pm-kpi__value">{totalPow.toFixed(1)}</div>
          <div className="pm-kpi__sub">kW total logged</div>
        </div>
        <div className="pm-kpi" style={{ animationDelay: "120ms" }}>
          <div className="pm-kpi__icon">📦</div>
          <div className="pm-kpi__label">Total Production</div>
          <div className="pm-kpi__value">{totalPrd.toLocaleString()}</div>
          <div className="pm-kpi__sub">units across all records</div>
        </div>
        <div className="pm-kpi" style={{ animationDelay: "180ms" }}>
          <div className="pm-kpi__icon">📊</div>
          <div className="pm-kpi__label">Avg Power</div>
          <div className="pm-kpi__value">{avgPow.toFixed(1)}</div>
          <div className="pm-kpi__sub">kW per snapshot</div>
        </div>
      </div>

      {/* ══════════ Charts ══════════ */}
      {chartData.length > 0 && (
        <div className="pm-chart-grid">
          <div className="pm-chart-panel">
            <div className="pm-chart-panel__head">
              <div>
                <div className="pm-chart-panel__title">Production Trend</div>
                <div className="pm-chart-panel__sub">Units produced across recorded snapshots</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                <defs>
                  <linearGradient id="pmProdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35}/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(0,212,255,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={{ stroke:"rgba(0,212,255,0.15)" }} />
                <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="totalProduction" name="Production" stroke="#10B981" strokeWidth={2} fill="url(#pmProdGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-chart-panel">
            <div className="pm-chart-panel__head">
              <div>
                <div className="pm-chart-panel__title">Power Trend</div>
                <div className="pm-chart-panel__sub">kW per snapshot</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                <CartesianGrid stroke="rgba(0,212,255,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={{ stroke:"rgba(0,212,255,0.15)" }} />
                <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="totalPower" name="Power (kW)" stroke="#00D4FF" strokeWidth={2} dot={false} activeDot={{ r:5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Latest snapshot */}
      {latest.id !== undefined && (
        <div className="pm-plant-card" style={{
          padding:"20px 24px", marginBottom:28,
          display:"flex", flexWrap:"wrap", gap:24, alignItems:"center",
        }}>
          <div>
            <div style={{ fontSize:11, color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Latest Snapshot</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:13, color:"var(--muted)" }}>{formatDT(latest.timeStamp)}</div>
          </div>
          <div>
            <div style={{ fontSize:11, color:"var(--muted)", marginBottom:2 }}>Power</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700, color:"var(--accent)" }}>
              {latest.totalPower.toFixed(1)} <span style={{ fontSize:13, color:"var(--muted)" }}>kW</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, color:"var(--muted)", marginBottom:2 }}>Production</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700, color:"var(--emerald)" }}>
              {latest.totalProduction.toLocaleString()} <span style={{ fontSize:13, color:"var(--muted)" }}>units</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, color:"var(--muted)", marginBottom:2 }}>Peak Power</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700, color:"var(--amber)" }}>
              {maxPow.toFixed(1)} <span style={{ fontSize:13, color:"var(--muted)" }}>kW</span>
            </div>
          </div>
        </div>
      )}

      {/* Records table */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:13, color:"var(--muted)", marginBottom:12 }}>All Plant Records</div>
        <div className="pm-table-wrap">
          <table className="pm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Total Power (kW)</th>
                <th>Total Production</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {[...normalized].reverse().map((row, i) => (
                <tr key={row.id ?? i} style={{ animationDelay: `${Math.min(i * 15, 300)}ms` }}>
                  <td style={{ color:"var(--muted)", fontSize:12 }}>{row.id ?? i+1}</td>
                  <td>
                    <span style={{ color: row.totalPower === maxPow ? "var(--amber)" : "var(--accent)", fontWeight:500 }}>
                      {row.totalPower.toFixed(2)}
                    </span>
                  </td>
                  <td style={{ color:"var(--emerald)" }}>{row.totalProduction.toLocaleString()}</td>
                  <td style={{ color:"var(--muted)", fontSize:12 }}>{formatDT(row.timeStamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
