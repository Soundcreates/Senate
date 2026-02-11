const BASE_API = "https://senate-qiog.onrender.com"

export const startWakatimeOAuth = (redirectTo) => {
  console.log("OAuth for WakaTime started");
  const url = new URL(`${BASE_API}/api/oauth/wakatime`);
  if (redirectTo) {
    url.searchParams.set("redirectTo", redirectTo);
  }
  window.location.assign(url.toString());
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