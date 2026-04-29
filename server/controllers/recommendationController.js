const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const getRagEndpoints = () => {
  const pythonUrl = process.env.PYTHON_URL;
  if (!pythonUrl) throw new Error("PYTHON_URL is not set.");
  const base = pythonUrl.replace(/\/+$/, "");
  return {
    ragEndpoint: `${base}/get-recommendations`,
    ragHealthEndpoint: `${base}/health`,
  };
};

/**
 * Get recommendations from the RAG endpoint
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing user data
 * @param {string} req.body.query - User query for recommendations
 * @param {Object} req.body.context - Additional context for recommendations
 * @param {Object} res - Express response object
 */
async function getRecommendations(req, res) {
  try {
    const { ragEndpoint: RAG_ENDPOINT, ragHealthEndpoint: RAG_HEALTH_ENDPOINT } =
      getRagEndpoints();
    const { query, context, userId } = req.body;

    if (!query) {
      return res.status(400).json({ 
        error: "Query is required",
        message: "Please provide a query for recommendations" 
      });
    }

    console.log(`[Recommendation] Fetching recommendations for query: "${query}"`);

    // Prepare the payload for the RAG endpoint
    const payload = {
      query,
      context: context || {},
      userId: userId || null,
      timestamp: new Date().toISOString()
    };

    // Call the RAG endpoint
    const response = await fetch(RAG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      timeout: 90000 // 90 second timeout for RAG model processing
    });

    console.log(`[Recommendation] RAG endpoint responded with status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails = errorText;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.message || errorJson.hint || errorText;
      } catch (e) {
        // If not JSON, use raw text
      }
      
      console.error(`[Recommendation] ❌ RAG endpoint error: ${response.status}`);
      console.error(`[Recommendation] Error details:`, errorDetails);
      console.error(`[Recommendation] Request payload:`, JSON.stringify(payload, null, 2));
      
      // Check for common upstream errors
      let userMessage = `RAG endpoint returned ${response.status}`;
      if (errorDetails.includes('Unused Respond to Webhook node')) {
        userMessage = 'RAG workflow configuration error: Unused Respond to Webhook node.';
      } else if (response.status === 404) {
        userMessage = 'RAG endpoint not found. Check your FastAPI service URL and route configuration.';
      }
      
      // Return 200 with error flag so frontend can fallback gracefully
      return res.status(200).json({
        success: false,
        error: "RAG_UNAVAILABLE",
        message: userMessage,
        details: errorDetails,
        useFallback: true
      });
    }

    const recommendations = await response.json();
    
    console.log(`[Recommendation] Successfully fetched recommendations`);
    console.log(`[Recommendation] RAG Response type:`, typeof recommendations);
    console.log(`[Recommendation] RAG Response keys:`, Object.keys(recommendations || {}));
    console.log(`[Recommendation] RAG Response:`, JSON.stringify(recommendations, null, 2));

    // Extract the actual data from upstream response
    // Upstream might return: { data: [...] } or just [...] or { people: [...] }
    let extractedData = recommendations;
    
    // If upstream wraps the response in a 'data' field, unwrap it
    if (recommendations && recommendations.data && typeof recommendations.data === 'object') {
      extractedData = recommendations.data;
      console.log(`[Recommendation] Extracted nested data:`, JSON.stringify(extractedData, null, 2));
    }

    return res.status(200).json({
      success: true,
      data: extractedData,
      query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("[Recommendation] Error:", error);
    
    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        error: "Request timeout",
        message: "The recommendation service took too long to respond"
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      message: error.message || "Failed to process recommendation request"
    });
  }
}

/**
 * Health check for the RAG endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function checkRAGHealth(req, res) {
  try {
    const startTime = Date.now();
    
    const response = await fetch(RAG_HEALTH_ENDPOINT, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return res.status(200).json({
      status: response.ok ? "healthy" : "unhealthy",
      responseCode: response.status,
      responseTime: `${responseTime}ms`,
      endpoint: RAG_HEALTH_ENDPOINT,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("[Recommendation] Health check error:", error);
    return res.status(503).json({
      status: "unhealthy",
      error: error.message,
      endpoint: RAG_HEALTH_ENDPOINT,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  getRecommendations,
  checkRAGHealth
};
