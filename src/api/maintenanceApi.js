const BASE_URL = "http://localhost:8080";

function authHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch(path, method = "GET", body = null) {
  const options = { method, headers: authHeaders() };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, options);
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Failed to fetch ${path}: ${res.status}`);
  return text; // ← plain string, no JSON.parse
}

export const acceptAlert   = (machineId) => apiFetch("/general/maintenance_alert/accept",    "POST", { machineID: machineId });
export const completeAlert = (machineId) => apiFetch("/general/maintenance_alert/completed", "POST", { machineID: machineId });