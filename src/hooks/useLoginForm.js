import { useState } from "react";
import { loginUser } from "../api/authApi";

export function useLoginForm(onLoginSuccess) {
  const [form, setForm] = useState({
    username:   "",
    employeeId: "",
    password:   "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);

  const setField = (key) => (e) => {
    setError("");
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
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
      // ✅ authApi now handles saving the token to localStorage directly
      await loginUser({
        username:   form.username.trim(),
        employeeId: form.employeeId.trim(),
        password:   form.password,
      });

      setSuccess(true);

      // Brief success flash, then switch to dashboard
      setTimeout(() => {
        onLoginSuccess();
      }, 1000);

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return {
    form,
    setField,
    showPassword,
    toggleShowPassword: () => setShowPassword((v) => !v),
    loading,
    error,
    success,
    handleSubmit,
    handleKeyDown,
  };
}
