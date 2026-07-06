import { useEffect, useState } from "react";
import { getDepartmentData } from "../../../api/plantApi";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const DEPT_PALETTE = [
  { bg:"rgba(0,212,255,0.08)",   border:"rgba(0,212,255,0.2)",   color:"var(--accent)",   hex:"#00D4FF", icon:"⚙️" },
  { bg:"rgba(16,185,129,0.08)",  border:"rgba(16,185,129,0.2)",  color:"var(--emerald)",  hex:"#10B981", icon:"🏭" },
  { bg:"rgba(139,92,246,0.08)",  border:"rgba(139,92,246,0.2)",  color:"var(--violet)",   hex:"#8B5CF6", icon:"🔬" },
  { bg:"rgba(245,158,11,0.08)",  border:"rgba(245,158,11,0.2)",  color:"var(--amber)",    hex:"#F59E0B", icon:"⚡" },
  { bg:"rgba(244,63,94,0.08)",   border:"rgba(244,63,94,0.2)",   color:"var(--rose)",     hex:"#F43F5E", icon:"🔧" },
];

function formatDT(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
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

export default function DepartmentData() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getDepartmentData()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const maxPower = Math.max(...data.map(d => d.totalPower || 0), 1);
  const maxProd  = Math.max(...data.map(d => d.totalProduction || 0), 1);
  const totalPow = data.reduce((s, d) => s + (d.totalPower || 0), 0);
  const totalPrd = data.reduce((s, d) => s + (d.totalProduction || 0), 0);

  // ✅ chart-ready data with per-dept colors
  const chartData = data.map((d, i) => ({
    department:      d.department,
    totalPower:      d.totalPower || 0,
    totalProduction: d.totalProduction || 0,
    fill: DEPT_PALETTE[i % DEPT_PALETTE.length].hex,
  }));

  if (loading) return <div className="pm-loading"><div className="pm-spinner" /><span>Loading department data…</span></div>;
  if (error)   return <div className="pm-error">⚠ {error}</div>;

  return (
    <>
      {/* Plant-wide summary */}
      <div className="pm-kpi-row" style={{ marginBottom:28 }}>
        <div className="pm-kpi" style={{ animationDelay: "0ms" }}>
          <div className="pm-kpi__icon">🏭</div>
          <div className="pm-kpi__label">Departments</div>
          <div className="pm-kpi__value">{data.length}</div>
          <div className="pm-kpi__sub">active departments</div>
        </div>
        <div className="pm-kpi" style={{ animationDelay: "60ms" }}>
          <div className="pm-kpi__icon">⚡</div>
          <div className="pm-kpi__label">Total Power</div>
          <div className="pm-kpi__value">{totalPow.toFixed(1)}</div>
          <div className="pm-kpi__sub">kW plant-wide</div>
        </div>
        <div className="pm-kpi" style={{ animationDelay: "120ms" }}>
          <div className="pm-kpi__icon">📦</div>
          <div className="pm-kpi__label">Total Production</div>
          <div className="pm-kpi__value">{totalPrd.toLocaleString()}</div>
          <div className="pm-kpi__sub">units combined</div>
        </div>
        <div className="pm-kpi" style={{ animationDelay: "180ms" }}>
          <div className="pm-kpi__icon">📊</div>
          <div className="pm-kpi__label">Avg Power / Dept</div>
          <div className="pm-kpi__value">{data.length ? (totalPow / data.length).toFixed(1) : 0}</div>
          <div className="pm-kpi__sub">kW per department</div>
        </div>
      </div>

      {/* ══════════ Charts ══════════ */}
      {chartData.length > 0 && (
        <div className="pm-chart-grid">
          <div className="pm-chart-panel">
            <div className="pm-chart-panel__head">
              <div>
                <div className="pm-chart-panel__title">Production by Department</div>
                <div className="pm-chart-panel__sub">Units produced, per department</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                <CartesianGrid stroke="rgba(0,212,255,0.08)" vertical={false} />
                <XAxis dataKey="department" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={{ stroke:"rgba(0,212,255,0.15)" }} />
                <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill:"rgba(0,212,255,0.06)" }} />
                <Bar dataKey="totalProduction" name="Production" radius={[6,6,0,0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-chart-panel">
            <div className="pm-chart-panel__head">
              <div>
                <div className="pm-chart-panel__title">Power Share</div>
                <div className="pm-chart-panel__sub">Distribution across departments</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} dataKey="totalPower" nameKey="department" innerRadius={55} outerRadius={78} paddingAngle={3}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pm-legend-row">
              {chartData.map((d, i) => (
                <div key={i} className="pm-legend-item">
                  <span className="pm-legend-dot" style={{ background: d.fill }} />
                  {d.department}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Department cards */}
      <div className="pm-dept-grid">
        {data.map((dept, i) => {
          const palette = DEPT_PALETTE[i % DEPT_PALETTE.length];
          const powerPct = ((dept.totalPower || 0) / maxPower) * 100;
          const prodPct  = ((dept.totalProduction || 0) / maxProd) * 100;
          return (
            <div key={dept.department || i} className="pm-dept-card"
              style={{
                borderColor: palette.border,
                animationDelay: `${i * 0.08}s`,
              }}>
              <div className="pm-dept-card__name">
                <span style={{
                  width:32, height:32, borderRadius:8, display:"flex",
                  alignItems:"center", justifyContent:"center", fontSize:16,
                  background: palette.bg, flexShrink:0,
                }}>
                  {palette.icon}
                </span>
                <span style={{ color: palette.color }}>{dept.department}</span>
              </div>

              <div className="pm-dept-card__stats">
                <div className="pm-dept-card__stat">
                  <div className="pm-dept-card__stat-label">Total Power</div>
                  <div className="pm-dept-card__stat-val" style={{ color: palette.color }}>
                    {(dept.totalPower || 0).toFixed(1)}
                    <span style={{ fontSize:12, color:"var(--muted)", fontWeight:400, marginLeft:4 }}>kW</span>
                  </div>
                </div>
                <div className="pm-dept-card__stat">
                  <div className="pm-dept-card__stat-label">Production</div>
                  <div className="pm-dept-card__stat-val" style={{ color: palette.color }}>
                    {(dept.totalProduction || 0).toLocaleString()}
                    <span style={{ fontSize:12, color:"var(--muted)", fontWeight:400, marginLeft:4 }}>u</span>
                  </div>
                </div>
              </div>

              {/* Power bar */}
              <div style={{ marginBottom:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--muted)", marginBottom:4 }}>
                  <span>Power share</span>
                  <span>{powerPct.toFixed(1)}%</span>
                </div>
                <div className="pm-bar-wrap" style={{ height:6 }}>
                  <div className="pm-bar" style={{ width:`${powerPct}%`, background: palette.color }} />
                </div>
              </div>

              {/* Production bar */}
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--muted)", marginBottom:4 }}>
                  <span>Production share</span>
                  <span>{prodPct.toFixed(1)}%</span>
                </div>
                <div className="pm-bar-wrap" style={{ height:6 }}>
                  <div className="pm-bar" style={{ width:`${prodPct}%`, background: palette.color, opacity:0.6 }} />
                </div>
              </div>

              <div className="pm-dept-card__time">Updated {formatDT(dept.timeStamp)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
