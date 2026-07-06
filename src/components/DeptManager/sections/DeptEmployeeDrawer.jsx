import { useEffect, useMemo, useState } from "react";
import { getDeptEmployees } from "../../../api/deptApi";

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function DeptEmployeeDrawer({ open, onClose }) {
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [loaded,    setLoaded]    = useState(false);
  const [desigFilter, setDesigFilter] = useState("ALL"); // ✅ new

  useEffect(() => {
    if (open && !loaded) {
      setLoading(true);
      getDeptEmployees()
        .then(data => { setEmployees(Array.isArray(data) ? data : []); setLoaded(true); })
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
      e.designation?.toLowerCase().includes(search.toLowerCase()) ||
      e.emailId?.toLowerCase().includes(search.toLowerCase()))
  );

  // ✅ quick stats — total, unique designations, with-email count
  const withEmail = employees.filter(e => e.emailId).length;

  return (
    <>
      <div className={`dm-emp-overlay ${open ? "open" : ""}`} onClick={onClose}/>
      <div className={`dm-emp-drawer ${open ? "open" : ""}`}>
        <div className="dm-emp-drawer__header">
          <div>
            <div className="dm-emp-drawer__title">Department Employees</div>
            <div style={{ fontSize:12, color:"var(--dm-muted)", marginTop:2 }}>
              {loaded ? `${employees.length} members` : "Your department"}
            </div>
          </div>
          <button className="dm-emp-drawer__close" onClick={onClose}>✕</button>
        </div>

        {/* ✅ Quick stats row */}
        {loaded && employees.length > 0 && (
          <div className="dm-emp-stats">
            <div className="dm-emp-stat">
              <div className="dm-emp-stat__val">{employees.length}</div>
              <div className="dm-emp-stat__label">Total</div>
            </div>
            <div className="dm-emp-stat">
              <div className="dm-emp-stat__val">{designations.length - 1}</div>
              <div className="dm-emp-stat__label">Roles</div>
            </div>
            <div className="dm-emp-stat">
              <div className="dm-emp-stat__val">{withEmail}</div>
              <div className="dm-emp-stat__label">With Email</div>
            </div>
          </div>
        )}

        {/* ✅ Designation filter chips */}
        {loaded && designations.length > 1 && (
          <div className="dm-emp-filters">
            {designations.map(d => (
              <button
                key={d}
                className={`dm-emp-filter-chip ${desigFilter === d ? "active" : ""}`}
                onClick={() => setDesigFilter(d)}
              >
                {d === "ALL" ? "All" : d}
              </button>
            ))}
          </div>
        )}

        <div className="dm-emp-search">
          <input
            placeholder="Search name, ID, designation…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="dm-emp-list">
          {loading && <div className="dm-loading" style={{ minHeight:200 }}><div className="dm-spinner"/><span>Loading…</span></div>}
          {error   && <div className="dm-error">⚠ {error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ textAlign:"center", color:"var(--dm-muted)", padding:"40px 0", fontSize:14 }}>No employees found</div>
          )}
          {!loading && filtered.map((emp, i) => (
            <div key={emp.Id ?? i} className="dm-emp-card" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
              <div className="dm-emp-avatar">{initials(emp.username)}</div>
              <div className="dm-emp-info">
                <div className="dm-emp-name">{emp.username}</div>
                <div className="dm-emp-id">#{emp.employeeId}</div>
                <div className="dm-emp-tags">
                  {emp.department  && <span className="dm-emp-tag">{emp.department}</span>}
                  {emp.designation && <span className="dm-emp-tag dm-emp-tag--desig">{emp.designation}</span>}
                </div>
                {emp.emailId && <div className="dm-emp-email">✉ {emp.emailId}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
