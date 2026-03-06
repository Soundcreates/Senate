const BASE_API = "https://senate-qiog.onrender.com"

export const fetchAdminDashboard = async (token) => {
  const response = await fetch(`${BASE_API}/api/admin-dashboard/overview`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "admin_dashboard_failed" };
  }

  const data = await response.json();
  return { ok: true, data: data.data };
};
