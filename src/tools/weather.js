import { tool } from 'langchain';
import { z } from 'zod';
import { fetchJson } from '../lib/http.js';

// Open-Meteo 免费接口，无需 API Key：https://open-meteo.com/
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const WMO_CODES = {
  0: '晴', 1: '大部晴朗', 2: '多云', 3: '阴',
  45: '雾', 48: '冻雾',
  51: '小毛毛雨', 53: '毛毛雨', 55: '大毛毛雨', 56: '冻毛毛雨', 57: '强冻毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '强冻雨',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒',
  80: '小阵雨', 81: '阵雨', 82: '强阵雨', 85: '小阵雪', 86: '强阵雪',
  95: '雷暴', 96: '雷暴伴小冰雹', 99: '雷暴伴大冰雹',
};
const describe = (code) => WMO_CODES[code] ?? `未知(${code})`;

async function geocode(city) {
  const params = new URLSearchParams({ name: city, count: '1', language: 'zh', format: 'json' });
  const data = await fetchJson(`${GEO_URL}?${params}`);
  const place = data.results?.[0];
  if (!place) throw new Error(`找不到城市「${city}」，请尝试使用更规范的城市名或英文名`);
  return place;
}

export async function getWeather({ city, days = 1 }) {
  const place = await geocode(city);
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: String(days),
  });
  const data = await fetchJson(`${FORECAST_URL}?${params}`);
  const { current, daily } = data;

  return {
    location: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
    current: {
      time: current.time,
      weather: describe(current.weather_code),
      temperature: `${current.temperature_2m}°C`,
      feelsLike: `${current.apparent_temperature}°C`,
      humidity: `${current.relative_humidity_2m}%`,
      windSpeed: `${current.wind_speed_10m} km/h`,
    },
    forecast: daily.time.map((date, i) => ({
      date,
      weather: describe(daily.weather_code[i]),
      tempRange: `${daily.temperature_2m_min[i]}~${daily.temperature_2m_max[i]}°C`,
      precipitationProbability: `${daily.precipitation_probability_max[i] ?? '-'}%`,
    })),
  };
}

export const weatherTool = tool(async (input) => JSON.stringify(await getWeather(input)), {
  name: 'get_weather',
  description: '查询指定城市的实时天气和未来几天的天气预报（温度、体感、湿度、风速、降水概率）。用户询问天气、气温、是否下雨、穿衣建议等时使用。',
  schema: z.object({
    city: z.string().describe('城市名称，中英文均可，例如 "北京"、"Shanghai"、"Tokyo"'),
    days: z.number().int().min(1).max(7).default(1).describe('预报天数，1-7，默认 1（仅今天）'),
  }),
});
