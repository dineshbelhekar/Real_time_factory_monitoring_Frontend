const BASE_URL = "https://amce.up.railway.app/admin/employee";

function authHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch(path, method = "GET", body = null) {
  const options = {
    method,
    headers: authHeaders(),
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const getAllEmployees  = ()           => apiFetch("/getall");
export const getEmployeeById = (employeeId) => apiFetch(`/getbyid/${employeeId}`);
export const addEmployee     = (data)       => apiFetch("/add",               "POST",   data);
export const updateEmployee  = (data)       => apiFetch("/update",            "PUT",    data);
export const deleteEmployee  = (employeeId) => apiFetch(`/delete/${employeeId}`, "DELETE");