const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const splitIntoTasks = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    console.log(apiKey?"Api key exists":"Api key missing");
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'API configuration error' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a project management assistant. Break down the following project request into a clear, actionable list of tasks. Return ONLY a JSON array of task objects with this exact format:
[
  {
    "id": 1,
    "title": "Task title",
    "description": "Brief description",
    "priority": "High|Medium|Low",
    "estimatedHours": number
  }
]

Project request: "${prompt}"

Important: Return ONLY the JSON array, no additional text or markdown formatting.`
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to process request with AI service' 
      });
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      let responseText = data.candidates[0].content.parts[0].text.trim();
      
      // Remove markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const parsedTasks = JSON.parse(responseText);
      
      return res.status(200).json({ tasks: parsedTasks });
    }
    
    return res.status(500).json({ error: 'Invalid response format from AI service' });
    
  } catch (error) {
    console.error('Error in splitIntoTasks:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing your request' 
    });
  }
};

const generateTitle = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables");
      return res.status(500).json({ error: "API configuration error" });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate a professional, concise project title (max 5 words) for this request: "${prompt}". Return ONLY the title text. No quotes.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      return res.status(response.status).json({ error: "Failed to process request with AI service" });
    }

    const data = await response.json();
    const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!title) {
      return res.status(500).json({ error: "Invalid response format from AI service" });
    }

    return res.status(200).json({ title });
  } catch (error) {
    console.error("Error in generateTitle:", error);
    return res.status(500).json({ error: "An error occurred while processing your request" });
  }
};

module.exports = {
  splitIntoTasks,
  generateTitle,
};
