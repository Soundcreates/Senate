const BASE_API = "http://localhost:3000";

export const startWakatimeOAuth = () => {
  console.log("OAuth for WakaTime started");
  window.location.assign(`${BASE_API}/api/oauth/wakatime`);
};

export const fetchWakatimeSession = async () => {
  const response = await fetch(`${BASE_API}/api/oauth/session`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return { ok: false };
  }

  const data = await response.json();
  return { ok: true, user: data.user };
};