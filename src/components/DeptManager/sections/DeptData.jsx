import { useEffect, useState } from "react";
import { getDeptData } from "../../../api/deptApi";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

function formatDT(ts) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }); }
  catch { return ts; }
}

function formatChartTime(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }); }
  catch { return ts; }
}

function normalize(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (typeof result === "object") return [result];
  return [];
}

/* ── recharts custom tooltip, styled to match dm theme ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dm-tooltip">
      <div className="dm-tooltip__label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : p.value}
        </div>
      ))}
    </div>
  );
}

export default function DeptData() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [sortKey, setSortKey] = useState("timeStamp");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    getDeptData()
      .then(r => setData(normalize(r)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av == null) return 1; if (bv == null) return -1;
    return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const totalPow  = data.reduce((s, d) => s + (d.totalPower || 0), 0);
  const totalProd = data.reduce((s, d) => s + (d.totalProduction || 0), 0);
  const avgPow    = data.length ? totalPow / data.length : 0;
  const latest    = [...data].sort((a,b) => new Date(b.timeStamp) - new Date(a.timeStamp))[0] || {};

  // ✅ Charts want chronological (ascending) order regardless of table sort
  const chartData = [...data]
    .sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp))
    .map(d => ({
      time:            formatChartTime(d.timeStamp),
      totalProduction: d.totalProduction || 0,
      totalPower:      d.totalPower || 0,
    }));

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft:4, opacity: sortKey===col ? 1 : 0.3, fontSize:10 }}>
      {sortKey===col ? (sortDir==="asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  if (loading) return <div className="dm-loading"><div className="dm-spinner"/><span>Loading department data…</span></div>;
  if (error)   return <div className="dm-error">⚠ {error}</div>;

  return (
    <>
      {/* KPIs */}
      <div className="dm-kpi-row">
        <div className="dm-kpi" style={{ animationDelay: "0ms" }}>
          <div className="dm-kpi__icon">📋</div>
          <div className="dm-kpi__label">Records</div>
          <div className="dm-kpi__value">{data.length}</div>
          <div className="dm-kpi__sub">dept snapshots</div>
        </div>
        <div className="dm-kpi" style={{ animationDelay: "60ms" }}>
          <div className="dm-kpi__icon">⚡</div>
          <div className="dm-kpi__label">Total Power</div>
          <div className="dm-kpi__value">{totalPow.toFixed(1)}</div>
          <div className="dm-kpi__sub">kW cumulative</div>
        </div>
        <div className="dm-kpi" style={{ animationDelay: "120ms" }}>
          <div className="dm-kpi__icon">📦</div>
          <div className="dm-kpi__label">Total Production</div>
          <div className="dm-kpi__value">{totalProd.toLocaleString()}</div>
          <div className="dm-kpi__sub">units combined</div>
        </div>
        <div className="dm-kpi" style={{ animationDelay: "180ms" }}>
          <div className="dm-kpi__icon">📊</div>
          <div className="dm-kpi__label">Avg Power</div>
          <div className="dm-kpi__value">{avgPow.toFixed(1)}</div>
          <div className="dm-kpi__sub">kW per snapshot</div>
        </div>
      </div>

      {/* ══════════ Charts ══════════ */}
      {chartData.length > 0 && (
        <div className="dm-chart-grid">
          <div className="dm-chart-panel">
            <div className="dm-chart-panel__head">
              <div>
                <div className="dm-chart-panel__title">Production Trend</div>
                <div className="dm-chart-panel__sub">Units produced across recorded snapshots</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                <defs>
                  <linearGradient id="dmProdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--dm-accent)" stopOpacity={0.35}/>
                    <stop offset="100%" stopColor="var(--dm-accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(139,92,246,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--dm-muted)" fontSize={11} tickLine={false} axisLine={{ stroke:"rgba(139,92,246,0.15)" }} />
                <YAxis stroke="var(--dm-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="totalProduction" name="Production" stroke="#8B5CF6" strokeWidth={2} fill="url(#dmProdGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="dm-chart-panel">
            <div className="dm-chart-panel__head">
              <div>
                <div className="dm-chart-panel__title">Power Usage</div>
                <div className="dm-chart-panel__sub">kW per snapshot</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                <CartesianGrid stroke="rgba(139,92,246,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--dm-muted)" fontSize={10} tickLine={false} axisLine={{ stroke:"rgba(139,92,246,0.15)" }} />
                <YAxis stroke="var(--dm-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill:"rgba(139,92,246,0.06)" }} />
                <Bar dataKey="totalPower" name="Power (kW)" fill="#06B6D4" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Latest snapshot */}
      {latest.id && (
        <div
          className="dm-dept-card"
          style={{
            background:"rgba(139,92,246,0.05)", border:"1px solid rgba(139,92,246,0.2)",
            padding:"18px 24px", marginBottom:24,
            display:"flex", flexWrap:"wrap", gap:24, alignItems:"center",
          }}
        >
          <div>
            <div style={{ fontSize:11, color:"var(--dm-accent)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Latest Snapshot</div>
            <div style={{ fontSize:13, color:"var(--dm-muted)" }}>{formatDT(latest.timeStamp)}</div>
          </div>
          <div>
            <div style={{ fontSize:11, color:"var(--dm-muted)", marginBottom:2 }}>Department</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700, color:"var(--dm-accent)" }}>{latest.department}</div>
          </div>
          <div>
            <div style={{ fontSize:11, color:"var(--dm-muted)", marginBottom:2 }}>Power</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700, color:"var(--dm-cyan)" }}>
              {(latest.totalPower||0).toFixed(1)} <span style={{ fontSize:12, color:"var(--dm-muted)" }}>kW</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, color:"var(--dm-muted)", marginBottom:2 }}>Production</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700, color:"var(--dm-emerald)" }}>
              {(latest.totalProduction||0).toLocaleString()} <span style={{ fontSize:12, color:"var(--dm-muted)" }}>units</span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="dm-table-wrap">
        <table className="dm-table">
          <thead>
            <tr>
              {[["id","ID"],["department","Department"],["totalPower","Power (kW)"],["totalProduction","Production"],["timeStamp","Timestamp"]].map(([key,label]) => (
                <th key={key} onClick={() => toggleSort(key)}>{label}<SortIcon col={key}/></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.id ?? i}>
                <td style={{ color:"var(--dm-muted)", fontSize:12 }}>{row.id}</td>
                <td style={{ color:"var(--dm-accent)", fontWeight:500 }}>{row.department}</td>
                <td style={{ color:"var(--dm-cyan)" }}>{(row.totalPower||0).toFixed(2)}</td>
                <td style={{ color:"var(--dm-emerald)" }}>{(row.totalProduction||0).toLocaleString()}</td>
                <td style={{ color:"var(--dm-muted)", fontSize:12 }}>{formatDT(row.timeStamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
