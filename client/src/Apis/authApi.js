const BASE_API = "http://localhost:3000";

export const registerDeveloper = async ({ email, password, name }) => {
  const response = await fetch(`${BASE_API}/api/auth/developer/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "developer_register_failed" };
  }

  const data = await response.json();
  return { ok: true, user: data.user };
};

export const loginDeveloper = async ({ email, password }) => {
  const response = await fetch(`${BASE_API}/api/auth/developer/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "developer_login_failed" };
  }

  const data = await response.json();
  return { ok: true, user: data.user };
};
