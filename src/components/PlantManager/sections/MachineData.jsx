import { useEffect, useState, useMemo } from "react";
import { getMachineData } from "../../../api/plantApi";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

const DEPT_BADGE = { A:"--a", B:"--b", C:"--c", D:"--d", E:"--e" };
const BAR_COLORS = ["#00D4FF", "#10B981", "#8B5CF6", "#F59E0B", "#F43F5E", "#22d3ee", "#a78bfa"];

function formatDT(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString([], {
    month:"short", day:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}

function formatChartTime(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }); }
  catch { return ts; }
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

export default function MachineData() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [search,  setSearch]  = useState("");
  const [sortKey, setSortKey] = useState("machineId");
  const [sortDir, setSortDir] = useState("asc");
  const [deptFilter, setDeptFilter] = useState("ALL");

  useEffect(() => {
    getMachineData()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const depts = ["ALL", ...Array.from(new Set(data.map(d => d.department))).sort()];

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const visible = data
    .filter(d =>
      (deptFilter === "ALL" || d.department === deptFilter) &&
      (d.machineId?.toLowerCase().includes(search.toLowerCase()) ||
       d.department?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1; if (bv == null) return -1;
      return sortDir === "asc"
        ? (av > bv ? 1 : -1)
        : (av < bv ? 1 : -1);
    });

  // ✅ Top 10 machines by cumulative production
  const topMachines = useMemo(() => {
    const map = {};
    data.forEach(d => { map[d.machineId] = (map[d.machineId] || 0) + (d.unitProduction || 0); });
    return Object.entries(map)
      .map(([machineId, unitProduction]) => ({ machineId, unitProduction }))
      .sort((a, b) => b.unitProduction - a.unitProduction)
      .slice(0, 10);
  }, [data]);

  // ✅ Power trend chronologically, last 24 points
  const powerTrend = useMemo(() =>
    [...data]
      .sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp))
      .slice(-24)
      .map(d => ({ time: formatChartTime(d.timeStamp), powerUsage: d.powerUsage || 0 })),
    [data]
  );

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft:4, opacity: sortKey===col ? 1 : 0.3, fontSize:10 }}>
      {sortKey===col ? (sortDir==="asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  if (loading) return <div className="pm-loading"><div className="pm-spinner" /><span>Loading machine data…</span></div>;
  if (error)   return <div className="pm-error">⚠ {error}</div>;

  return (
    <>
      {/* KPI row */}
      <div className="pm-kpi-row" style={{ marginBottom:20 }}>
        <div className="pm-kpi" style={{ animationDelay: "0ms" }}>
          <div className="pm-kpi__icon">🔧</div>
          <div className="pm-kpi__label">Total Records</div>
          <div className="pm-kpi__value">{data.length}</div>
          <div className="pm-kpi__sub">30-min snapshots</div>
        </div>
        <div className="pm-kpi" style={{ animationDelay: "60ms" }}>
          <div className="pm-kpi__icon">⚡</div>
          <div className="pm-kpi__label">Avg Power</div>
          <div className="pm-kpi__value">{data.length ? (data.reduce((s,d)=>s+(d.powerUsage||0),0)/data.length).toFixed(1) : 0}</div>
          <div className="pm-kpi__sub">kW per machine</div>
        </div>
        <div className="pm-kpi" style={{ animationDelay: "120ms" }}>
          <div className="pm-kpi__icon">📦</div>
          <div className="pm-kpi__label">Total Units</div>
          <div className="pm-kpi__value">{data.reduce((s,d)=>s+(d.unitProduction||0),0).toLocaleString()}</div>
          <div className="pm-kpi__sub">aggregated production</div>
        </div>
        <div className="pm-kpi" style={{ animationDelay: "180ms" }}>
          <div className="pm-kpi__icon">🏭</div>
          <div className="pm-kpi__label">Unique Machines</div>
          <div className="pm-kpi__value">{new Set(data.map(d=>d.machineId)).size}</div>
          <div className="pm-kpi__sub">in dataset</div>
        </div>
      </div>

      {/* ══════════ Charts ══════════ */}
      {data.length > 0 && (
        <div className="pm-chart-grid">
          <div className="pm-chart-panel">
            <div className="pm-chart-panel__head">
              <div>
                <div className="pm-chart-panel__title">Top Machines by Production</div>
                <div className="pm-chart-panel__sub">Highest cumulative output, top 10</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topMachines} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                <CartesianGrid stroke="rgba(0,212,255,0.08)" vertical={false} />
                <XAxis dataKey="machineId" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={{ stroke:"rgba(0,212,255,0.15)" }} />
                <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill:"rgba(0,212,255,0.06)" }} />
                <Bar dataKey="unitProduction" name="Production" radius={[5,5,0,0]}>
                  {topMachines.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-chart-panel">
            <div className="pm-chart-panel__head">
              <div>
                <div className="pm-chart-panel__title">Power Trend</div>
                <div className="pm-chart-panel__sub">Last {powerTrend.length} intervals</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={powerTrend} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                <CartesianGrid stroke="rgba(0,212,255,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={{ stroke:"rgba(0,212,255,0.15)" }} />
                <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="powerUsage" name="Power (kW)" stroke="#00D4FF" strokeWidth={2} dot={false} activeDot={{ r:5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search machine ID or department…"
          style={{
            flex:"1 1 200px", padding:"8px 14px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(136,153,170,0.2)",
            borderRadius:8, color:"var(--off-white)", fontFamily:"inherit", fontSize:13, outline:"none",
          }}
        />
        {depts.map(d => (
          <button key={d} onClick={() => setDeptFilter(d)}
            style={{
              padding:"6px 14px", borderRadius:20, border:"1px solid",
              fontSize:12, cursor:"pointer", fontFamily:"inherit",
              borderColor: deptFilter===d ? "var(--accent)" : "var(--border)",
              background:  deptFilter===d ? "rgba(0,212,255,0.1)" : "transparent",
              color:       deptFilter===d ? "var(--accent)" : "var(--muted)",
            }}>
            {d === "ALL" ? "All" : `Dept ${d}`}
          </button>
        ))}
        <span style={{ fontSize:12, color:"var(--muted)" }}>{visible.length} rows</span>
      </div>

      {/* Table */}
      <div className="pm-table-wrap">
        <table className="pm-table">
          <thead>
            <tr>
              {[
                ["id","ID"], ["machineId","Machine"], ["department","Dept"],
                ["unitProduction","Production"], ["powerUsage","Power (kW)"], ["timeStamp","Timestamp"],
              ].map(([key, label]) => (
                <th key={key} onClick={() => toggleSort(key)} style={{ cursor:"pointer", userSelect:"none" }}>
                  {label}<SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => {
              const badge = DEPT_BADGE[row.department] || "--a";
              return (
                <tr key={row.id || i} style={{ animationDelay: `${Math.min(i * 15, 300)}ms` }}>
                  <td style={{ color:"var(--muted)", fontSize:12 }}>{row.id}</td>
                  <td style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:600 }}>{row.machineId}</td>
                  <td>
                    <span className={`pm-table__badge pm-table__badge${badge}`}>
                      {row.department}
                    </span>
                  </td>
                  <td>{(row.unitProduction||0).toLocaleString()} u</td>
                  <td>
                    <span style={{ color: row.powerUsage>70 ? "var(--emerald)" : row.powerUsage>30 ? "var(--amber)" : "var(--rose)" }}>
                      {row.powerUsage?.toFixed(2)}
                    </span>
                  </td>
                  <td style={{ color:"var(--muted)", fontSize:12 }}>{formatDT(row.timeStamp)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
