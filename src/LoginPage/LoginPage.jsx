import { useState, useEffect, useRef } from "react";

/* ── Inline styles as JS objects (no external CSS needed) ── */
const C = {
  navy:        "#0D1B2A",
  navyMid:     "#112236",
  steel:       "#1B4F72",
  accent:      "#00D4FF",
  accentDim:   "rgba(0,212,255,0.15)",
  offWhite:    "#F0F4F8",
  muted:       "#8899AA",
  error:       "#FF5C6A",
  success:     "#00E5A0",
  glassBg:     "rgba(17,34,54,0.72)",
  glassBorder: "rgba(0,212,255,0.18)",
};

/* ── SVG icons ── */
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconBadge = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <path d="M16 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
    <path d="M8 9h2m-2 3h2m-2 3h8"/>
  </svg>
);

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0, marginTop:1}}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <circle cx="12" cy="16.5" r=".5" fill="currentColor"/>
  </svg>
);

const IconCheck = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconBuilding = () => (
  <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
    <path d="M12 2L3 7v15h18V7L12 2zm-1 18H7v-4h4v4zm6 0h-4v-4h4v4zM5 9.5l7-4 7 4V7l-7-4-7 4v2.5z"/>
  </svg>
);

/* ── Dot-grid canvas background ── */
function DotGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let dots = [];
    let W, H;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      dots = [];
      const gap = 38;
      for (let x = 0; x < W; x += gap)
        for (let y = 0; y < H; y += gap)
          dots.push({ x, y, base: 0.18 + Math.random() * 0.25, phase: Math.random() * Math.PI * 2 });
    }

    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      t += 0.012;
      dots.forEach(d => {
        const pulse = d.base + 0.12 * Math.sin(t + d.phase);
        const dx = d.x / W - 0.5, dy = d.y / H - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const alpha = Math.max(0, pulse * (1 - dist * 0.7));
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.35 }}
    />
  );
}

/* ── Input field component ── */
function Field({ label, id, type = "text", placeholder, value, onChange, icon, rightSlot, autoComplete }) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 18 }}>
      <label htmlFor={id} style={{
        display: "block", fontSize: 12, fontWeight: 500,
        letterSpacing: "0.07em", textTransform: "uppercase",
        color: C.muted, marginBottom: 7,
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          spellCheck={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            padding: "12px 14px 12px 42px",
            paddingRight: rightSlot ? 42 : 14,
            background: focused ? "rgba(0,212,255,0.05)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${focused ? C.accent : "rgba(136,153,170,0.25)"}`,
            borderRadius: 10,
            color: C.offWhite,
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 14,
            outline: "none",
            boxShadow: focused ? "0 0 0 3px rgba(0,212,255,0.12)" : "none",
            transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
            boxSizing: "border-box",
          }}
        />
        {/* Left icon */}
        <span style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
          color: focused ? C.accent : C.muted,
          display: "flex", alignItems: "center",
          pointerEvents: "none", transition: "color 0.2s",
        }}>
          {icon}
        </span>
        {/* Right slot (password toggle) */}
        {rightSlot && (
          <span style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            display: "flex", alignItems: "center",
          }}>
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main Login component ── */
export default function LoginPage() {
  const [form, setForm] = useState({ username: "", employeeId: "", password: "" });
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);

  const set = (key) => (e) => {
    setError("");
    setForm(f => ({ ...f, [key]: e.target.value }));
  };

  const validate = () => {
    if (!form.username.trim())   { setError("Please enter your username.");    return false; }
    if (!form.employeeId.trim()) { setError("Please enter your Employee ID."); return false; }
    if (!form.password)          { setError("Please enter your password.");    return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8080/user/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          username:   form.username.trim(),
          employeeId: form.employeeId.trim(),
          password:   form.password,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.token) localStorage.setItem("authToken", data.token);
        setSuccess(true);
        setTimeout(() => {
          window.location.href = data.redirectUrl || "/dashboard";
        }, 1800);
      } else {
        let msg = "Invalid credentials. Please try again.";
        try { const err = await res.json(); if (err.message) msg = err.message; } catch (_) {}
        setError(msg);
      }
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  /* Inject Google Fonts once */
  useEffect(() => {
    if (!document.getElementById("gfonts-login")) {
      const link = document.createElement("link");
      link.id   = "gfonts-login";
      link.rel  = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: C.navy,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'IBM Plex Sans', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Animated background */}
      <div style={{ position:"fixed", inset:0, background:`linear-gradient(180deg, ${C.navy} 0%, #0a1520 100%)`, zIndex:0 }}>
        <DotGrid />
        <div style={{
          position:"absolute", width:600, height:600, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)",
          top:-160, left:-120, pointerEvents:"none",
        }}/>
        <div style={{
          position:"absolute", width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(27,79,114,0.2) 0%, transparent 70%)",
          bottom:-100, right:-80, pointerEvents:"none",
        }}/>
      </div>

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 420,
        background: C.glassBg,
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 20,
        padding: "44px 40px 40px",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 0 0 1px rgba(0,212,255,0.06), 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}>

        {/* Brand row */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:32 }}>
          <div style={{
            width:38, height:38, borderRadius:10, flexShrink:0,
            background:`linear-gradient(135deg, ${C.steel}, ${C.accent})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 0 16px rgba(0,212,255,0.3)",
          }}>
            <IconBuilding />
          </div>
          <div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:15, fontWeight:600, letterSpacing:"0.04em", color:C.offWhite }}>
              ACME Corp
            </div>
            <div style={{ fontSize:11, fontWeight:400, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginTop:1 }}>
              Employee Portal
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:700, color:C.offWhite, letterSpacing:"-0.02em", margin:0, marginBottom:6 }}>
          Welcome back
        </h1>
        <p style={{ fontSize:13.5, color:C.muted, marginBottom:32, fontWeight:300 }}>
          Sign in to access your workspace
        </p>

        {/* Error banner */}
        {error && (
          <div style={{
            display:"flex", alignItems:"flex-start", gap:10,
            background:"rgba(255,92,106,0.1)", border:"1px solid rgba(255,92,106,0.3)",
            borderRadius:10, padding:"11px 14px", marginBottom:18,
            fontSize:13, color:"#ff8a94",
          }}>
            <IconAlert />
            <span>{error}</span>
          </div>
        )}

        {!success ? (
          <>
            {/* Fields */}
            <Field
              label="Username" id="username" placeholder="e.g. john.doe"
              value={form.username} onChange={set("username")}
              icon={<IconUser />} autoComplete="username"
            />
            <Field
              label="Employee ID" id="employeeId" placeholder="e.g. EMP-00421"
              value={form.employeeId} onChange={set("employeeId")}
              icon={<IconBadge />} autoComplete="off"
            />
            <Field
              label="Password" id="password"
              type={showPw ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password} onChange={set("password")}
              icon={<IconLock />}
              autoComplete="current-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onKeyDown={handleKeyDown}
                  style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}
                >
                  {showPw ? <IconEyeOff /> : <IconEye />}
                </button>
              }
            />

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              onKeyDown={handleKeyDown}
              style={{
                width:"100%", padding:"14px", marginTop:8,
                border:"none", borderRadius:10,
                background:`linear-gradient(135deg, #0EA5C9, ${C.accent})`,
                color:"#0D1B2A",
                fontFamily:"'Space Grotesk',sans-serif", fontSize:14.5, fontWeight:700, letterSpacing:"0.03em",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                boxShadow:"0 4px 24px rgba(0,212,255,0.25)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                transition:"opacity 0.2s, box-shadow 0.2s",
              }}
            >
              {loading ? (
                <span style={{
                  width:18, height:18, border:"2.5px solid rgba(13,27,42,0.3)",
                  borderTopColor:"#0D1B2A", borderRadius:"50%",
                  display:"inline-block",
                  animation:"spin 0.7s linear infinite",
                }}/>
              ) : "Sign In"}
            </button>
          </>
        ) : (
          /* Success state */
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"12px 0 4px" }}>
            <div style={{
              width:52, height:52, borderRadius:"50%",
              background:"rgba(0,229,160,0.12)", border:"1.5px solid rgba(0,229,160,0.4)",
              display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14,
            }}>
              <IconCheck />
            </div>
            <p style={{ fontSize:14, color:C.success, fontWeight:500 }}>Login successful!</p>
            <small style={{ fontSize:12, color:C.muted, marginTop:4 }}>Redirecting to your dashboard…</small>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign:"center", marginTop:24, fontSize:12, color:"rgba(136,153,170,0.5)", letterSpacing:"0.02em" }}>
          Protected by enterprise SSO &nbsp;·&nbsp; © 2026 ACME Corp
        </p>
      </div>

      {/* Spinner keyframe injection */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
