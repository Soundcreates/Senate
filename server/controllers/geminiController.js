let openaiClient;

const getOpenAIClient = async () => {
  if (!openaiClient) {
    const { default: OpenAI } = await import("openai");
    openaiClient = new OpenAI({
      baseURL: process.env.FEATHERLESS_BASE_URL || "https://api.featherless.ai/v1",
      apiKey: process.env.FEATHERLESS_API_KEY,
    });
  }
  return openaiClient;
};

const getFeatherlessModel = () => process.env.FEATHERLESS_MODEL || "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B";

const splitIntoTasks = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.FEATHERLESS_API_KEY) {
      console.error("FEATHERLESS_API_KEY is not set in environment variables");
      return res.status(500).json({ error: "API configuration error" });
    }

    const client = await getOpenAIClient();
    const model = getFeatherlessModel();
    const systemPrompt = "You are a project management assistant.";
    const userPrompt = `Break down the following project request into a clear, actionable list of tasks. Return ONLY a JSON array of task objects with this exact format:
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

Important: Return ONLY the JSON array, no additional text or markdown formatting.`;

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawText = completion.choices?.[0]?.message?.content?.trim();
    if (!rawText) {
      return res.status(500).json({ error: "Invalid response format from AI service" });
    }

    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Invalid response format from AI service" });
    }

    const parsedTasks = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ tasks: parsedTasks });
    
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

    if (!process.env.FEATHERLESS_API_KEY) {
      console.error("FEATHERLESS_API_KEY is not set in environment variables");
      return res.status(500).json({ error: "API configuration error" });
    }

    const client = await getOpenAIClient();
    const model = getFeatherlessModel();
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 120,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: `Generate a professional, concise project title (max 5 words) for this request: "${prompt}". Return ONLY the title text. No quotes.`,
        },
      ],
    });

    const title = completion.choices?.[0]?.message?.content?.trim();
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
