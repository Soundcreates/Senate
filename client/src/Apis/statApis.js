const BASE_API = "https://senate-qiog.onrender.com"

export const fetchWakatimeStats = async ({ date, start, end } = {}) => {
	const url = new URL(`${BASE_API}/api/stats/wakatime-stats`);
	if (date) url.searchParams.set("date", date);
	if (start) url.searchParams.set("start", start);
	if (end) url.searchParams.set("end", end);

	const response = await fetch(url.toString(), {
		method: "GET",
		credentials: "include",
		headers: { Accept: "application/json" },
	});

	if (!response.ok) {
		const data = await response.json().catch(() => ({}));
		return { ok: false, error: data.error || "wakatime_stats_failed" };
	}

	const data = await response.json();
	return { ok: true, data };
};
