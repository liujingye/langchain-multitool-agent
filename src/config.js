export const config = {
  llm: {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    model: process.env.MODEL_NAME || 'gpt-4o-mini',
    temperature: Number(process.env.MODEL_TEMPERATURE ?? 0),
  },
  search: {
    tavilyApiKey: process.env.TAVILY_API_KEY,
    maxResults: 5,
  },
  agent: {
    toolRunLimit: 8,
    modelRunLimit: 10,
  },
  httpTimeoutMs: 10_000,
};
