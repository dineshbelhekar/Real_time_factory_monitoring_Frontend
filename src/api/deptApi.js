const BASE_URL = "http://localhost:8080/department";

function authHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

export const getDeptEmployees  = () => apiFetch("/getallemployee");
export const getDeptLiveData   = () => apiFetch("/getLiveData");
export const getDeptData       = () => apiFetch("/departmentData");
export const getDeptMachineData = () => apiFetch("/machineData");
