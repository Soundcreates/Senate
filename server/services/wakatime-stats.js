const {
    resolveWakaTimeAccessToken,
    refreshWakaTimeAccessTokenByCurrentToken,
} = require("./oauthTokenService");

const buildWakaTimeUrl = (startDate, endDate) =>
    `https://wakatime.com/api/v1/users/current/summaries?start=${startDate}&end=${endDate}`;

const requestWakaTimeStats = async (accessToken, startDate, endDate) => {
    const url = buildWakaTimeUrl(startDate, endDate);
    return fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
        },
    });
};

async function fetchTimeStats(accessToken, startDate, endDate) {
    try {
        console.log("Fetching timestats");

        let activeToken = resolveWakaTimeAccessToken(accessToken);
        let response = await requestWakaTimeStats(activeToken, startDate, endDate);

        if (response.status === 401) {
            try {
                const refreshedToken = await refreshWakaTimeAccessTokenByCurrentToken(activeToken);
                if (refreshedToken) {
                    activeToken = refreshedToken;
                    response = await requestWakaTimeStats(activeToken, startDate, endDate);
                }
            } catch (refreshError) {
                console.warn("[WakaTime] Access token refresh failed:", refreshError.message);
            }
        }

        const data = await response.json();
        if (!response.ok) {
            const error = new Error("wakatime_api_failed");
            error.status = response.status;
            error.details = data;
            throw error;
        }

        return data;
    } catch (error) {
        console.error("Error fetching timestats:", error);
        throw error;
    }
}

module.exports = { fetchTimeStats };