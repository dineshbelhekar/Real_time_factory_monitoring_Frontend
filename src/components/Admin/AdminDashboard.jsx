import { useState, useEffect, useCallback } from "react";
import "./AdminDashboard.css";
import { getAllEmployees, addEmployee, updateEmployee, deleteEmployee } from "../../api/adminApi";

/* ─── constants ──────────────────────────────────────────────────────────── */
const DEPTS = ["Production", "Assembly", "Machining", "Quality Control (QC)", "Packaging", "Maintenance"];
const ROLES = ["ADMIN", "PLANTMANAGER", "DEPTMANAGER", "TECHNICIAN", "OPERATOR"];
const EMPTY_FORM = { username: "", employeeId: "", password: "", department: "", designation: "", emailId: "" };

function chipClass(designation) {
  const d = (designation || "").toUpperCase();
  if (d === "ADMIN")        return "ad-chip ad-chip--admin";
  if (d === "PLANTMANAGER") return "ad-chip ad-chip--plant";
  if (d === "DEPTMANAGER")  return "ad-chip ad-chip--deptmgr";
  if (d === "TECHNICIAN")   return "ad-chip ad-chip--tech";
  return "ad-chip ad-chip--operator";
}

// ✅ Decode logged-in username from JWT
function getUsernameFromToken() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return "Admin";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || payload.username || payload.name || "Admin";
  } catch {
    return "Admin";
  }
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const Ic = {
  Building: () => (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M12 2L3 7v15h18V7L12 2zm-1 18H7v-4h4v4zm6 0h-4v-4h4v4zM5 9.5l7-4 7 4V7l-7-4-7 4v2.5z"/>
    </svg>
  ),
  Users: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Edit: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  ),
  Search: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Eye: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
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

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={`ad-toast ad-toast--${type}`}>{msg}</div>;
}

/* ─── EmployeeModal (Add / Edit) ─────────────────────────────────────────── */
function EmployeeModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.employeeId && initial.employeeId !== "";
  const [form, setForm]     = useState({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.employeeId || !form.department || !form.designation) {
      setErr("Employee ID, Department and Designation are required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      if (isEdit) {
        await updateEmployee(form);
      } else {
        if (!form.username) { setErr("Username is required."); setSaving(false); return; }
        await addEmployee(form);
      }
      onSave(isEdit ? "Employee updated successfully." : "Employee added successfully.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ad-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ad-modal">
        <div className="ad-modal__head">
          <div className="ad-modal__title">{isEdit ? "Edit Employee" : "Add Employee"}</div>
          <button className="ad-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="ad-modal__body">
          {err && <div className="ad-field-error">{err}</div>}
          <div className="ad-field-row">
            <div className="ad-field">
              <label>Username {isEdit && <span className="ad-field-locked">locked</span>}</label>
              <input
                placeholder="e.g. Ritesh"
                value={form.username}
                onChange={e => set("username", e.target.value)}
                disabled={isEdit}
              />
            </div>
            <div className="ad-field">
              <label>Employee ID</label>
              <input
                placeholder="e.g. Machining-61-80"
                value={form.employeeId}
                onChange={e => set("employeeId", e.target.value)}
              />
            </div>
          </div>
          <div className="ad-field-row">
            <div className="ad-field">
              <label>Department</label>
              <select value={form.department} onChange={e => set("department", e.target.value)}>
                <option value="">Select…</option>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="ad-field">
              <label>Designation</label>
              <select value={form.designation} onChange={e => set("designation", e.target.value)}>
                <option value="">Select…</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="ad-field">
            <label>Email</label>
            <input type="email" placeholder="email@company.com" value={form.emailId} onChange={e => set("emailId", e.target.value)} />
          </div>
          {!isEdit && (
            <div className="ad-field">
              <label>Password</label>
              <input type="password" placeholder="Set initial password" value={form.password} onChange={e => set("password", e.target.value)} />
            </div>
          )}
        </div>
        <div className="ad-modal__foot">
          <button className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="ad-btn ad-btn--primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ViewModal ──────────────────────────────────────────────────────────── */
function ViewModal({ emp, onClose }) {
  const rows = [
    ["Employee ID", emp.employeeId],
    ["Username",    emp.username],
    ["Email",       emp.emailId],
    ["Department",  emp.department],
    ["Designation", emp.designation],
  ];
  return (
    <div className="ad-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ad-modal">
        <div className="ad-modal__head">
          <div className="ad-modal__title">Employee Details</div>
          <button className="ad-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="ad-modal__body">
          {rows.map(([k, v]) => (
            <div key={k} className="ad-view-row">
              <span className="ad-view-label">{k}</span>
              <span className="ad-view-val">{v || "—"}</span>
            </div>
          ))}
        </div>
        <div className="ad-modal__foot">
          <button className="ad-btn ad-btn--ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─── ConfirmDelete ──────────────────────────────────────────────────────── */
function ConfirmDelete({ emp, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    await onConfirm(emp.employeeId);
    setBusy(false);
  }
  return (
    <div className="ad-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ad-confirm">
        <div className="ad-confirm__icon">🗑️</div>
        <div className="ad-confirm__title">Delete Employee?</div>
        <div className="ad-confirm__sub">
          This will permanently remove <strong>{emp.username}</strong> ({emp.employeeId}) from the system.
        </div>
        <div className="ad-confirm__btns">
          <button className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="ad-btn ad-btn--danger" onClick={go} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── EmployeesSection ───────────────────────────────────────────────────── */
function EmployeesSection() {
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [modal, setModal]           = useState(null);
  const [toast, setToast]           = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      setToast({ msg: "Failed to load employees: " + e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(empId) {
    try {
      await deleteEmployee(empId);
      setModal(null);
      setToast({ msg: "Employee deleted.", type: "success" });
      load();
    } catch (e) {
      setToast({ msg: "Delete failed: " + e.message, type: "error" });
    }
  }

  function handleSaved(msg) {
    setModal(null);
    setToast({ msg, type: "success" });
    load();
  }

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || e.username?.toLowerCase().includes(q)
      || e.employeeId?.toLowerCase().includes(q)
      || e.emailId?.toLowerCase().includes(q);
    const matchDept = !deptFilter || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  const total  = employees.length;
  const admins = employees.filter(e => e.designation?.toUpperCase() === "ADMIN").length;
  const mgrs   = employees.filter(e => e.designation?.toUpperCase() === "DEPTMANAGER").length;
  const depts  = new Set(employees.map(e => e.department).filter(Boolean)).size;

  return (
    <>
      <div className="ad-stats">
        <div className="ad-stat ad-stat--accent" style={{ animationDelay: "0ms" }}>
          <div className="ad-stat__label">Total Employees</div>
          <div className="ad-stat__val">{total}</div>
          <div className="ad-stat__sub">across all departments</div>
        </div>
        <div className="ad-stat ad-stat--success" style={{ animationDelay: "60ms" }}>
          <div className="ad-stat__label">Dept Managers</div>
          <div className="ad-stat__val">{mgrs}</div>
          <div className="ad-stat__sub">active managers</div>
        </div>
        <div className="ad-stat ad-stat--warn" style={{ animationDelay: "120ms" }}>
          <div className="ad-stat__label">Admins</div>
          <div className="ad-stat__val">{admins}</div>
          <div className="ad-stat__sub">system administrators</div>
        </div>
        <div className="ad-stat" style={{ animationDelay: "180ms" }}>
          <div className="ad-stat__label">Departments</div>
          <div className="ad-stat__val">{depts}</div>
          <div className="ad-stat__sub">active departments</div>
        </div>
      </div>

      <div className="ad-table-wrap">
        <div className="ad-table-toolbar">
          <div className="ad-table-toolbar__title">All Employees</div>
          <div className="ad-table-toolbar__right">
            <select
              className={`ad-dept-filter ${deptFilter ? "has-value" : ""}`}
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
            >
              <option value="">All departments</option>
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="ad-search">
              <Ic.Search />
              <input placeholder="Search name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="ad-btn ad-btn--primary" onClick={() => setModal({ type: "add" })}>
              <Ic.Plus /> Add Employee
            </button>
          </div>
        </div>

        {loading ? (
          <div className="ad-loader">Loading employees…</div>
        ) : filtered.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty__icon">👥</div>
            <div className="ad-empty__text">No employees found</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <tr key={emp.employeeId} style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}>
                  <td><span className="ad-emp-id">{emp.employeeId}</span></td>
                  <td style={{ fontWeight: 500, color: "#fff" }}>{emp.username}</td>
                  <td style={{ color: "var(--ad-muted)" }}>{emp.emailId || "—"}</td>
                  <td><span className="ad-chip ad-chip--dept">{emp.department}</span></td>
                  <td><span className={chipClass(emp.designation)}>{emp.designation}</span></td>
                  <td>
                    <div className="ad-actions">
                      <button className="ad-btn ad-btn--ghost ad-btn--sm"  title="View"   onClick={() => setModal({ type: "view",   data: emp })}><Ic.Eye   /></button>
                      <button className="ad-btn ad-btn--ghost ad-btn--sm"  title="Edit"   onClick={() => setModal({ type: "edit",   data: emp })}><Ic.Edit  /></button>
                      <button className="ad-btn ad-btn--danger ad-btn--sm" title="Delete" onClick={() => setModal({ type: "delete", data: emp })}><Ic.Trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === "add"    && <EmployeeModal initial={EMPTY_FORM} onSave={handleSaved}     onClose={() => setModal(null)} />}
      {modal?.type === "edit"   && <EmployeeModal initial={modal.data} onSave={handleSaved}     onClose={() => setModal(null)} />}
      {modal?.type === "view"   && <ViewModal     emp={modal.data}                              onClose={() => setModal(null)} />}
      {modal?.type === "delete" && <ConfirmDelete  emp={modal.data}    onConfirm={handleDelete} onClose={() => setModal(null)} />}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}

/* ─── Root ───────────────────────────────────────────────────────────────── */
const NAV = [
  { id: "employees", label: "Employees", icon: <Ic.Users />, title: "Employee Management", sub: "Add, edit and remove company employees" },
];

export default function AdminDashboard({ onLogout }) {
  const [active, setActive] = useState("employees");
  const current  = NAV.find(n => n.id === active);
  const username = getUsernameFromToken();

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    onLogout?.();
  }

  return (
    <>
      <div className="ad-glow-field">
        <div className="ad-glow ad-glow--blue" />
        <div className="ad-glow ad-glow--emerald" />
        <div className="ad-glow ad-glow--faint" />
      </div>
      <div className="ad-scanlines" />

      <div className="ad-layout">
        <aside className="ad-sidebar">
          <div className="ad-brand">
            <div className="ad-brand__icon"><Ic.Building /></div>
            <div>
              <div className="ad-brand__name">ACME Corp</div>
              <div className="ad-brand__role">admin</div>
            </div>
          </div>

          <nav className="ad-nav">
            <div className="ad-nav__label">Management</div>
            {NAV.map(n => (
              <button key={n.id} className={`ad-nav__item ${active === n.id ? "active" : ""}`} onClick={() => setActive(n.id)}>
                <span className="ad-nav__icon">{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
          </nav>

          {/* ✅ Logged-in user */}
          <div className="ad-user-info">
            <div className="ad-user-info__icon"><Ic.User /></div>
            <div>
              <div className="ad-user-info__name">{username}</div>
              <div className="ad-user-info__label">Logged in</div>
            </div>
          </div>

          <button className="ad-logout" onClick={handleLogout}>
            <Ic.Logout /><span>Logout</span>
          </button>
        </aside>

        <div className="ad-main">
          <div className="ad-topbar">
            <div>
              <div className="ad-topbar__title">{current?.title}</div>
              <div className="ad-topbar__sub">{current?.sub}</div>
            </div>
            <div className="ad-topbar__right">
              {/* ✅ Username pill in topbar corner */}
              <div className="ad-topbar__user">
                <Ic.User />
                <span>{username}</span>
              </div>
              <div className="ad-badge"><span className="ad-badge__dot" />System Online</div>
            </div>
          </div>
          <div className="ad-content">
            {active === "employees" && <EmployeesSection />}
          </div>
        </div>
      </div>
    </>
  );
}
