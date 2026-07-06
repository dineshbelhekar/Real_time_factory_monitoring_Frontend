import { useEffect, useState, useMemo } from "react";
import { getDeptMachineData } from "../../../api/deptApi";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

const BAR_COLORS = ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#F43F5E", "#A78BFA", "#22D3EE"];

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
  if (typeof result === "object") return Object.values(result);
  return [];
}

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

export default function DeptMachineData() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [search,  setSearch]  = useState("");
  const [sortKey, setSortKey] = useState("timeStamp");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    getDeptMachineData()
      .then(r => setData(normalize(r)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const visible = [...data]
    .filter(d => !search ||
      d.machineId?.toLowerCase().includes(search.toLowerCase()) ||
      d.department?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1; if (bv == null) return -1;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const totalProd  = data.reduce((s, d) => s + (d.unitProduction || 0), 0);
  const avgPower   = data.length ? data.reduce((s, d) => s + (d.powerUsage || 0), 0) / data.length : 0;
  const uniqueMachines = new Set(data.map(d => d.machineId)).size;

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

  if (loading) return <div className="dm-loading"><div className="dm-spinner"/><span>Loading machine data…</span></div>;
  if (error)   return <div className="dm-error">⚠ {error}</div>;

  return (
    <>
      {/* KPIs */}
      <div className="dm-kpi-row" style={{ marginBottom:20 }}>
        <div className="dm-kpi" style={{ animationDelay: "0ms" }}>
          <div className="dm-kpi__icon">🔧</div>
          <div className="dm-kpi__label">Total Records</div>
          <div className="dm-kpi__value">{data.length}</div>
          <div className="dm-kpi__sub">30-min snapshots</div>
        </div>
        <div className="dm-kpi" style={{ animationDelay: "60ms" }}>
          <div className="dm-kpi__icon">🏭</div>
          <div className="dm-kpi__label">Unique Machines</div>
          <div className="dm-kpi__value">{uniqueMachines}</div>
          <div className="dm-kpi__sub">in this dept</div>
        </div>
        <div className="dm-kpi" style={{ animationDelay: "120ms" }}>
          <div className="dm-kpi__icon">📦</div>
          <div className="dm-kpi__label">Total Production</div>
          <div className="dm-kpi__value">{totalProd.toLocaleString()}</div>
          <div className="dm-kpi__sub">units aggregated</div>
        </div>
        <div className="dm-kpi" style={{ animationDelay: "180ms" }}>
          <div className="dm-kpi__icon">⚡</div>
          <div className="dm-kpi__label">Avg Power</div>
          <div className="dm-kpi__value">{avgPower.toFixed(1)}</div>
          <div className="dm-kpi__sub">kW per machine</div>
        </div>
      </div>

      {/* ══════════ Charts ══════════ */}
      {data.length > 0 && (
        <div className="dm-chart-grid">
          <div className="dm-chart-panel">
            <div className="dm-chart-panel__head">
              <div>
                <div className="dm-chart-panel__title">Top Machines by Production</div>
                <div className="dm-chart-panel__sub">Highest cumulative output, top 10</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topMachines} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                <CartesianGrid stroke="rgba(139,92,246,0.08)" vertical={false} />
                <XAxis dataKey="machineId" stroke="var(--dm-muted)" fontSize={11} tickLine={false} axisLine={{ stroke:"rgba(139,92,246,0.15)" }} />
                <YAxis stroke="var(--dm-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill:"rgba(139,92,246,0.06)" }} />
                <Bar dataKey="unitProduction" name="Production" radius={[5,5,0,0]}>
                  {topMachines.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dm-chart-panel">
            <div className="dm-chart-panel__head">
              <div>
                <div className="dm-chart-panel__title">Power Trend</div>
                <div className="dm-chart-panel__sub">Last {powerTrend.length} intervals</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={powerTrend} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                <CartesianGrid stroke="rgba(139,92,246,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--dm-muted)" fontSize={10} tickLine={false} axisLine={{ stroke:"rgba(139,92,246,0.15)" }} />
                <YAxis stroke="var(--dm-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="powerUsage" name="Power (kW)" stroke="#06B6D4" strokeWidth={2} dot={false} activeDot={{ r:5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom:14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search machine ID or department…"
          style={{
            width:"100%", maxWidth:320, padding:"8px 14px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(148,144,170,0.2)",
            borderRadius:8, color:"var(--dm-off-white)", fontFamily:"inherit",
            fontSize:13, outline:"none",
          }}
        />
        <span style={{ marginLeft:12, fontSize:12, color:"var(--dm-muted)" }}>{visible.length} records</span>
      </div>

      {/* Table */}
      <div className="dm-table-wrap">
        <table className="dm-table">
          <thead>
            <tr>
              {[
                ["id","ID"], ["machineId","Machine"], ["department","Dept"],
                ["unitProduction","Production"], ["powerUsage","Power (kW)"], ["timeStamp","Timestamp"]
              ].map(([key,label]) => (
                <th key={key} onClick={() => toggleSort(key)}>{label}<SortIcon col={key}/></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={row.id ?? i}>
                <td style={{ color:"var(--dm-muted)", fontSize:12 }}>{row.id}</td>
                <td style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:600 }}>{row.machineId}</td>
                <td style={{ color:"var(--dm-accent)" }}>{row.department}</td>
                <td>{(row.unitProduction||0).toLocaleString()} u</td>
                <td style={{ color: (row.powerUsage||0) > 70 ? "var(--dm-emerald)" : (row.powerUsage||0) > 30 ? "var(--dm-amber)" : "var(--dm-rose)" }}>
                  {(row.powerUsage||0).toFixed(2)}
                </td>
                <td style={{ color:"var(--dm-muted)", fontSize:12 }}>{formatDT(row.timeStamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
