
async function fetchTimeStats(accessToken, startDate, endDate) {
    const url = `https://wakatime.com/api/v1/users/current/summaries?start=${startDate}&end=${endDate}`;

    try{
        console.log("Fetching timestats");
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching timestats:", error);
        throw error;
    }
}

module.exports = { fetchTimeStats };