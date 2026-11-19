import { ChatOpenAI } from '@langchain/openai';
import { config } from './config.js';

// 兼容所有 OpenAI 协议的模型服务（OpenAI / DeepSeek / 通义千问 / Moonshot 等），只需修改 baseURL 和模型名
export function createModel() {
  const { apiKey, baseURL, model, temperature } = config.llm;
  if (!apiKey) throw new Error('缺少 OPENAI_API_KEY，请复制 .env.example 为 .env 并填写');
  return new ChatOpenAI({ model, apiKey, temperature, configuration: { baseURL } });
}
