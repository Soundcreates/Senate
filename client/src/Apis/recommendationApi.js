const BASE_API = "https://senate-qiog.onrender.com"

/**
 * Get recommendations from the RAG endpoint
 * @param {string} query - The user's query for recommendations
 * @param {Object} context - Additional context for the recommendation
 * @param {string} userId - Optional user ID
 * @returns {Promise<Object>} Response with recommendations
 */
export const getRecommendations = async (query, context = {}, userId = null) => {
  try {
    // Create AbortController for 90 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const response = await fetch(`${BASE_API}/api/recommendations`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        query,
        context,
        userId
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('[RecommendationAPI] Error response:', errorData);
      return { 
        ok: false, 
        error: errorData.error || "Failed to fetch recommendations",
        message: errorData.message,
        useFallback: true
      };
    }

    const data = await response.json();
    
    console.log('[RecommendationAPI] Full response:', data);
    
    // Check if backend returned an error flag
    if (data.success === false || data.useFallback) {
      console.warn('[RecommendationAPI] Backend returned error:', data.message);
      return {
        ok: false,
        error: data.error || "RAG_ERROR",
        message: data.message || "RAG service unavailable",
        useFallback: true
      };
    }
    
    console.log('[RecommendationAPI] Data structure:', data.data);
    
    return { 
      ok: true, 
      data: data.data,
      timestamp: data.timestamp 
    };
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return { 
      ok: false, 
      error: "Network error",
      message: error.message 
    };
  }
};

/**
 * Check the health status of the RAG endpoint
 * @returns {Promise<Object>} Health status response
 */
export const checkRAGHealth = async () => {
  try {
    const response = await fetch(`${BASE_API}/api/recommendations/health`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Accept": "application/json"
      }
    });

    const data = await response.json();
    return { 
      ok: response.ok, 
      status: data.status,
      responseTime: data.responseTime,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error("Error checking RAG health:", error);
    return { 
      ok: false, 
      status: "error",
      error: error.message 
    };
  }
};
