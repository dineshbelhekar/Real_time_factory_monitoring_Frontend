import { useEffect, useMemo, useState } from "react";
import { getAllEmployees } from "../../../api/plantApi";

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const DEPT_COLORS = {
  A: "var(--accent)",
  B: "var(--emerald)",
  C: "var(--violet)",
  D: "var(--amber)",
  E: "var(--rose)",
};

export default function EmployeeDrawer({ open, onClose }) {
  const [employees, setEmployees]     = useState([]);
  const [loading,   setLoading]       = useState(false);
  const [error,     setError]         = useState("");
  const [search,    setSearch]        = useState("");
  const [loaded,    setLoaded]        = useState(false);
  const [desigFilter, setDesigFilter] = useState("ALL"); // ✅ new

  // Load only when drawer opens for first time
  useEffect(() => {
    if (open && !loaded) {
      setLoading(true);
      getAllEmployees()
        .then(data => { setEmployees(data); setLoaded(true); })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [open]);

  // ✅ unique designations present, for filter chips
  const designations = useMemo(() => {
    const set = new Set(employees.map(e => e.designation).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [employees]);

  const filtered = employees.filter(e =>
    (desigFilter === "ALL" || e.designation === desigFilter) &&
    (!search ||
      e.username?.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase()) ||
      e.designation?.toLowerCase().includes(search.toLowerCase()) ||
      e.emailId?.toLowerCase().includes(search.toLowerCase()))
  );

  // ✅ quick stats
  const withEmail = employees.filter(e => e.emailId).length;

  return (
    <>
      {/* Backdrop */}
      <div className={`pm-emp-overlay ${open ? "open" : ""}`} onClick={onClose} />

      {/* Drawer */}
      <div className={`pm-emp-drawer ${open ? "open" : ""}`}>
        <div className="pm-emp-drawer__header">
          <div>
            <div className="pm-emp-drawer__title">All Employees</div>
            <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
              {loaded ? `${employees.length} employees` : "Plant directory"}
            </div>
          </div>
          <button className="pm-emp-drawer__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ✅ Quick stats row */}
        {loaded && employees.length > 0 && (
          <div className="pm-emp-stats">
            <div className="pm-emp-stat">
              <div className="pm-emp-stat__val">{employees.length}</div>
              <div className="pm-emp-stat__label">Total</div>
            </div>
            <div className="pm-emp-stat">
              <div className="pm-emp-stat__val">{designations.length - 1}</div>
              <div className="pm-emp-stat__label">Roles</div>
            </div>
            <div className="pm-emp-stat">
              <div className="pm-emp-stat__val">{withEmail}</div>
              <div className="pm-emp-stat__label">With Email</div>
            </div>
          </div>
        )}

        {/* ✅ Designation filter chips */}
        {loaded && designations.length > 1 && (
          <div className="pm-emp-filters">
            {designations.map(d => (
              <button
                key={d}
                className={`pm-emp-filter-chip ${desigFilter === d ? "active" : ""}`}
                onClick={() => setDesigFilter(d)}
              >
                {d === "ALL" ? "All" : d}
              </button>
            ))}
          </div>
        )}

        <div className="pm-emp-drawer__search">
          <input
            className="pm-emp-search-input"
            placeholder="Search by name, ID, department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="pm-emp-drawer__list">
          {loading && (
            <div className="pm-loading" style={{ minHeight:200 }}>
              <div className="pm-spinner" />
              <span>Loading employees…</span>
            </div>
          )}

          {error && <div className="pm-error">⚠ {error}</div>}

          {!loading && !error && filtered.length === 0 && (
            <div style={{ textAlign:"center", color:"var(--muted)", padding:"40px 0", fontSize:14 }}>
              No employees found
            </div>
          )}

          {!loading && filtered.map((emp, i) => (
            <div key={emp.Id || i} className="pm-emp-card" style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}>
              <div className="pm-emp-avatar"
                style={{ background: `linear-gradient(135deg, var(--steel), ${DEPT_COLORS[emp.department] || "var(--accent)"})` }}>
                {initials(emp.username)}
              </div>
              <div className="pm-emp-info">
                <div className="pm-emp-name">{emp.username}</div>
                <div className="pm-emp-id">#{emp.employeeId}</div>
                <div className="pm-emp-tags">
                  {emp.department && (
                    <span className="pm-emp-tag pm-emp-tag--dept">
                      Dept {emp.department}
                    </span>
                  )}
                  {emp.designation && (
                    <span className="pm-emp-tag">{emp.designation}</span>
                  )}
                </div>
                {emp.emailId && (
                  <div className="pm-emp-email">✉ {emp.emailId}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
