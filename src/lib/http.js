import { config } from '../config.js';

export async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': 'langchain-multitool-agent/1.0', ...init.headers },
    signal: AbortSignal.timeout(config.httpTimeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} - ${url}`);
  return res.json();
}
