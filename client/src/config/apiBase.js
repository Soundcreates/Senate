const apiBaseUrl = import.meta.env.VITE_BACKEND_URL;

if (!apiBaseUrl) {
  throw new Error("Missing VITE_BACKEND_URL. Set it in client/.env.");
}

export const API_BASE_URL = apiBaseUrl.replace(/\/+$/, "");

