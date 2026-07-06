import "./Login.css";
import DotGrid    from "./DotGrid";
import InputField from "./InputField";
import {
  IconUser, IconBadge, IconLock, IconEye, IconEyeOff,
  IconAlertCircle, IconCheck, IconBuilding,
} from "./icons";
import { useLoginForm } from "../../hooks/useLoginForm";

// ✅ Accepts onLoginSuccess from App.jsx
export default function LoginPage({ onLoginSuccess }) {
  const {
    form, setField,
    showPassword, toggleShowPassword,
    loading, error, success,
    handleSubmit, handleKeyDown,
  } = useLoginForm(onLoginSuccess);   // pass callback into the hook

  return (
    <div className="login-page">
      <div className="login-bg">
        <DotGrid />
        <div className="login-bg__glow" />
        <div className="login-bg__glow--secondary" />
      </div>

      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand__icon"><IconBuilding /></div>
          <div>
            <div className="login-brand__name">ACME Corp</div>
            <div className="login-brand__sub">Employee Portal</div>
          </div>
        </div>

        <h1 className="login-heading">Welcome back</h1>
        <p className="login-subtitle">Sign in to access your workspace</p>

        {/* Error */}
        {error && (
          <div className="login-alert" role="alert">
            <IconAlertCircle />
            <span>{error}</span>
          </div>
        )}

        {!success ? (
          <>
            <InputField
              label="Username" id="username" type="text"
              placeholder="e.g. john.doe"
              value={form.username} onChange={setField("username")}
              onKeyDown={handleKeyDown} icon={<IconUser />}
              autoComplete="username"
            />
            <InputField
              label="Employee ID" id="employeeId" type="text"
              placeholder="e.g. EMP-00421"
              value={form.employeeId} onChange={setField("employeeId")}
              onKeyDown={handleKeyDown} icon={<IconBadge />}
              autoComplete="off"
            />
            <InputField
              label="Password" id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password} onChange={setField("password")}
              onKeyDown={handleKeyDown} icon={<IconLock />}
              autoComplete="current-password"
              toggleSlot={
                <button
                  className="login-field__toggle" type="button"
                  onClick={toggleShowPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              }
            />
            <button
              className="login-btn" type="button"
              onClick={handleSubmit} disabled={loading}
            >
              {loading
                ? <span className="login-spinner" aria-label="Signing in…" />
                : "Sign In"
              }
            </button>
          </>
        ) : (
          <div className="login-success" role="status">
            <div className="login-success__icon"><IconCheck /></div>
            <p className="login-success__text">Login successful!</p>
            <span className="login-success__sub">Opening dashboard…</span>
          </div>
        )}

        <p className="login-footer">
          Protected by enterprise SSO &nbsp;·&nbsp; © 2026 ACME Corp
        </p>
      </div>
    </div>
  );
}
