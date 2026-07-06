const BASE_URL = "https://amce.up.railway.app";

/**
 * POST /user/login
 * Backend returns a raw JWT string (plain text), not JSON.
 */
export async function loginUser(credentials) {
  let response;
  try {
    response = await fetch(`${BASE_URL}/user/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(credentials),
    });
  } catch {
    throw new Error("Unable to reach the server. Check your connection and try again.");
  }

  if (response.ok) {
    const token = await response.text();
    if (token) {
      localStorage.setItem("authToken", token.trim());
    }
    return { success: true };
  }

  let serverMessage = "Invalid credentials. Please try again.";
  try {
    const err = await response.json();
    if (err.message) serverMessage = err.message;
  } catch {
    try {
      const text = await response.text();
      if (text) serverMessage = text;
    } catch { /* ignore */ }
  }

  throw new Error(serverMessage);
}

/**
 * GET /role
 * Sends stored JWT as Bearer token.
 * Backend returns a plain text role string e.g. "ADMIN" or "OPERATOR".
 * Role is saved to localStorage as "userRole".
 * Returns the role string if valid, null if not.
 */
export async function fetchAndStoreRole() {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  try {
    const response = await fetch(`${BASE_URL}/general/role`, {
      method:  "GET",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const role = await response.text();
      if (role) {
        localStorage.setItem("userRole", role.trim());
        return role.trim();
      }
    }

    // Token rejected / expired
    return null;
  } catch {
    return null;
  }
}
