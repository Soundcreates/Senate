import { API_BASE_URL } from "@/config/apiBase";
const BASE_API = API_BASE_URL;

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
  return { ok: true, user: data.user, registerToken: data.registerToken };
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

export const fetchRegisterStatus = async (registerToken) => {
  const response = await fetch(`${BASE_API}/api/auth/register-status?registerToken=${encodeURIComponent(registerToken)}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "fetch_register_status_failed" };
  }

  const data = await response.json();
  return { ok: true, user: data.user };
};

export const completeRegistrationApi = async (registerToken) => {
  const response = await fetch(`${BASE_API}/api/auth/complete-registration`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-register-token": registerToken,
    },
    body: JSON.stringify({ registerToken }),
  });

  if (!response.ok) {
    return { ok: false };
  }

  return { ok: true };
};
