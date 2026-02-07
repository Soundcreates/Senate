const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const RAG_ENDPOINT = "https://antdev.app.n8n.cloud/webhook/39138e4f-df12-434d-8be7-19e06c40121d";

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
      
      // Check for specific n8n errors
      let userMessage = `RAG endpoint returned ${response.status}`;
      if (errorDetails.includes('Unused Respond to Webhook node')) {
        userMessage = 'n8n workflow configuration error: Unused Respond to Webhook node. Please check your n8n workflow setup.';
      } else if (response.status === 404) {
        userMessage = 'RAG webhook not active. Please activate the n8n workflow.';
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

    // Extract the actual data from n8n response
    // n8n might return: { data: [...] } or just [...] or { people: [...] }
    let extractedData = recommendations;
    
    // If n8n wraps the response in a 'data' field, unwrap it
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
    
    const response = await fetch(RAG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: "health check",
        context: { type: "ping" }
      }),
      timeout: 10000
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return res.status(200).json({
      status: response.ok ? "healthy" : "unhealthy",
      responseCode: response.status,
      responseTime: `${responseTime}ms`,
      endpoint: RAG_ENDPOINT,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("[Recommendation] Health check error:", error);
    return res.status(503).json({
      status: "unhealthy",
      error: error.message,
      endpoint: RAG_ENDPOINT,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  getRecommendations,
  checkRAGHealth
};
