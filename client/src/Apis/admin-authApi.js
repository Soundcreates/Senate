const BASE_API = "https://senate-qiog.onrender.com";

export const registerAdmin = async ({ email, password, name }) => {
  const response = await fetch(`${BASE_API}/api/admin-auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "admin_register_failed" };
  }

  const data = await response.json();
  return { ok: true, token: data.token, user: data.user };
};

export const loginAdmin = async ({ email, password }) => {
  const response = await fetch(`${BASE_API}/api/admin-auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "admin_login_failed" };
  }

  const data = await response.json();
  return { ok: true, token: data.token, user: data.user };
};

export const fetchAdminProfile = async (token) => {
  const response = await fetch(`${BASE_API}/api/admin-auth/me`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "admin_profile_failed" };
  }

  const data = await response.json();
  return { ok: true, user: data.user };
};

export const logoutAdmin = async (token) => {
  const response = await fetch(`${BASE_API}/api/admin-auth/logout`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "admin_logout_failed" };
  }

  return { ok: true };
};
