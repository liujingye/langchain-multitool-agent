import { tool } from 'langchain';
import { z } from 'zod';
import { config } from '../config.js';
import { fetchJson } from '../lib/http.js';

/**
 * 搜索提供方（策略模式）：配置了 TAVILY_API_KEY 时使用 Tavily 网页搜索，否则降级到 Wikipedia。
 * 统一返回 { provider, answer?, results: [{ title, url, snippet }] }
 */
const providers = {
  async tavily(query, maxResults) {
    const data = await fetchJson('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.search.tavilyApiKey}` },
      body: JSON.stringify({ query, max_results: maxResults, search_depth: 'basic', include_answer: true }),
    });
    return {
      provider: 'tavily',
      answer: data.answer,
      results: data.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
    };
  },

  async wikipedia(query, maxResults) {
    const lang = /[\u4e00-\u9fa5]/.test(query) ? 'zh' : 'en';
    const params = new URLSearchParams({
      action: 'query', list: 'search', srsearch: query, srlimit: String(maxResults), format: 'json', utf8: '1',
    });
    const data = await fetchJson(`https://${lang}.wikipedia.org/w/api.php?${params}`);
    return {
      provider: 'wikipedia',
      results: data.query.search.map((r) => ({
        title: r.title,
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
        snippet: r.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
      })),
    };
  },
};

export async function search({ query }) {
  const name = config.search.tavilyApiKey ? 'tavily' : 'wikipedia';
  try {
    return await providers[name](query, config.search.maxResults);
  } catch (err) {
    const hint = name === 'wikipedia' ? '（Wikipedia 可能无法访问，建议配置 TAVILY_API_KEY）' : '';
    throw new Error(`搜索失败[${name}]: ${err.message}${hint}`);
  }
}

export const searchTool = tool(async (input) => JSON.stringify(await search(input)), {
  name: 'web_search',
  description:
    '在互联网上搜索信息，返回标题、链接和摘要。用于回答新闻时事、人物、事件、产品、百科知识等需要外部或最新信息的问题。天气请用 get_weather，数学计算请用 calculator。',
  schema: z.object({
    query: z.string().describe('搜索关键词，应简洁明确，例如 "2024 巴黎奥运会 金牌榜"'),
  }),
});
