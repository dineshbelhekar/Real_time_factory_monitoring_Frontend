const BASE_URL = "https://amce.up.railway.app";

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

export const getLiveData       = () => apiFetch("/plant/getLiveData");
export const getMachineData    = () => apiFetch("/plant/machineData");
export const getDepartmentData = () => apiFetch("/plant/departmentData");
export const getPlantData      = () => apiFetch("/plant/plantData");
export const getAllEmployees    = () => apiFetch("/plant/getallemployee");
