// AMap Weather/Geocoding client for React Native
// Uses axios (already in dependencies)
import axios from 'axios';

export const AMAP_KEY = 'df77469c39902532b069d6273e681c77';
export const WEATHER_API_URL = 'https://restapi.amap.com/v3/weather/weatherInfo';
export const GEOCODING_API_URL = 'https://restapi.amap.com/v3/geocode/geo';

export type AMapCurrentWeather = {
  province: string;
  city: string;
  adcode: string;
  weather: string; // 天气现象（晴，多云等）
  temperature: string; // 温度(摄氏度)
  winddirection: string; // 风向
  windpower: string; // 风力
  humidity: string; // 空气湿度
  reporttime: string; // 数据发布时间
};

export type NormalizedWeather = {
  location: { name: string; adcode: string; province?: string };
  current: {
    text: string;
    tempC: number | null;
    humidity?: number | null;
    windDir?: string | null;
    windPower?: string | null;
    reportTime?: string | null;
  };
};

export async function geocodeToAdcode(address: string): Promise<{ adcode: string; city: string; province?: string } | null> {
  if (!address || !address.trim()) return null;
  try {
    const { data } = await axios.get(GEOCODING_API_URL, {
      params: { key: AMAP_KEY, address: address.trim() },
    });
    if (data?.status === '1' && Array.isArray(data.geocodes) && data.geocodes.length > 0) {
      const g = data.geocodes[0];
      return { adcode: g.adcode, city: g.city || g.district || g.formatted_address || address, province: g.province };
    }
  } catch (e) {
    // swallow and return null
  }
  return null;
}

export async function fetchCurrentWeatherByAdcode(adcode: string): Promise<AMapCurrentWeather | null> {
  try {
    const { data } = await axios.get(WEATHER_API_URL, {
      params: { key: AMAP_KEY, city: adcode, extensions: 'base' },
    });
    if (data?.status === '1' && Array.isArray(data.lives) && data.lives.length > 0) {
      return data.lives[0] as AMapCurrentWeather;
    }
  } catch (e) {
    // swallow and return null
  }
  return null;
}

export async function fetchWeatherByAddress(address: string): Promise<NormalizedWeather | null> {
  const geo = await geocodeToAdcode(address);
  if (!geo) return null;
  const live = await fetchCurrentWeatherByAdcode(geo.adcode);
  if (!live) return null;
  return normalizeWeather(live);
}

export function normalizeWeather(live: AMapCurrentWeather): NormalizedWeather {
  return {
    location: { name: live.city || live.adcode, adcode: live.adcode, province: live.province },
    current: {
      text: live.weather,
      tempC: toNumberSafe(live.temperature),
      humidity: toNumberSafe(live.humidity),
      windDir: live.winddirection || null,
      windPower: live.windpower || null,
      reportTime: live.reporttime || null,
    },
  };
}

function toNumberSafe(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Very light intent detection & city extraction; sufficient for demo
const HOT_CITY_LIST = [
  '北京','上海','广州','深圳','杭州','南京','苏州','成都','重庆','武汉','西安','青岛','厦门','天津','济南','大连','沈阳','合肥','福州','宁波','珠海','佛山','长沙','昆明','南宁','郑州','哈尔滨','长春','太原','石家庄','南昌','贵阳','兰州','呼和浩特','乌鲁木齐','海口','三亚'
];

export function isWeatherIntent(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return t.includes('天气') || t.includes('weather');
}

export function extractCityCandidate(text: string): string | null {
  if (!text) return null;
  // 1) 尝试匹配以 市/区/县/州 结尾的词
  const reg = /([\u4e00-\u9fa5]{2,6})(市|区|县|州)/g;
  const m = reg.exec(text);
  if (m) return m[1];
  // 2) 热门城市词表匹配
  for (const c of HOT_CITY_LIST) {
    if (text.includes(c)) return c;
  }
  return null;
}

export async function fetchWeatherForPrompt(text: string): Promise<NormalizedWeather | null> {
  const city = extractCityCandidate(text) || '北京'; // 默认北京，保证演示可用
  return fetchWeatherByAddress(city);
}
