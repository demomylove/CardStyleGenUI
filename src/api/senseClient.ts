import axios from 'axios';

const BASE_URL_LEGACY = 'http://10.210.0.58:21683';
const OMPHALOS_URL = `${BASE_URL_LEGACY}/intention_v2/omphalos`; // Omphalos seems common or legacy-only? keeping as is for now

// Environment Configuration
type EnvType = 'DEV' | 'PROD' | 'LEGACY';
const CURRENT_ENV: EnvType = 'DEV'; // Change this to 'DEV', 'PROD', or 'LEGACY'

const HOST_DEV = "https://innovation-dev.senseauto.com:31684";
const HOST_PROD = "https://innovation.senseauto.com:80";
const HOST_LEGACY = BASE_URL_LEGACY;

const getHost = () => {
    switch (CURRENT_ENV) {
        case 'PROD': return HOST_PROD;
        case 'LEGACY': return HOST_LEGACY;
        case 'DEV': default: return HOST_DEV;
    }
};
const HOST = getHost();

// Weather
const WEATHER_URL = CURRENT_ENV === 'LEGACY' 
    ? `${HOST}/novel/agent/weather/search` 
    : `${HOST}/novel/agent/weather/search/v1`;

// Music / Media
const MUSIC_URL = CURRENT_ENV === 'LEGACY'
    ? `${HOST}/novel/agent/music_recom_by_mood`
    : `${HOST}/novel/agent/music/recommend/v1`;

export const MEDIAQA_URL = `${HOST}/novel/agent/music_qa`;
export const MIAOHUA_URL = `${HOST}/novel/agent/miaohua`;
export const XIMALAYA_URL = `${HOST}/novel/agent/ximalaya`;

// POI
const POI_URL = CURRENT_ENV === 'LEGACY'
    ? `${HOST}/novel/agent/poi/search/v2`
    : `${HOST}/novel/agent/poi/search/v1`;

export const POI_SEARCH_AROUND_URL = `${HOST}/novel/agent/poi/search_around_view/v1`;
export const POI_PLANNING_URL = `${HOST}/novel/agent/poi/poi_planning`;
export const POI_FILTER_SEARCH_URL = `${HOST}/novel/agent/poi/filter_search/v2`;
export const POI_FIND_BY_NAME_URL = `${HOST}/novel/agent/poi/find_by_name`;
export const GET_CURRENT_ADDRESS_URL = `${HOST}/novel/agent/poi/get_current_address`;

// Chat
export const CHAT_URL = `${HOST}/novel/agent/chat/v1`;

const getQueryParams = (input: string) => ({
  user_query: input,
  user_info: {
    faceid: '',
    nickname: '',
    gps_info: '121.40030914855207,31.16835650149113',
    human_info: [],
    face_info: [],
  },
  memory_info: [],
  context_info: [],
});

// Common headers from C++ reference
const COMMON_HEADERS = {
    'Content-Type': 'application/json',
    'apikey': 'iirzcvKiVDXCwdJzBf9ksw==' 
};

// Helper to parse DSL from POI/Music/Weather responses

export const getDsl = (domain: string, content: any): string => {
  if (domain === 'weather') {
    const city = content.cityName;
    const wr = content.weather_range[0];
    const epoch = wr.predictDate;
    // Date conversion
    const date = new Date(epoch * 1000); 
    const low = wr.tempLow;
    const high = wr.tempHigh;
    const cond = wr.weatherDay || wr.weatherNight;
    const humidity = wr.humidity;
    const wind = wr.wspdDay;
    
    const style = (cond.includes('雨') || cond.includes('雪')) ? 'neon' : (high >= 30 ? 'gradient' : 'futuristic');
    const extra = `湿度${humidity}%，风速${wind}m/s`;
    
    // We return a formatted object or string? The Flutter code returns a DSL string: 
    // 'weather(city:$city,style:$style,temp:$low-$high,cond:$cond,extra:$extra,date:$date)'
    // BUT my DslParser parses YAML. 
    // The Flutter code has a DslTransformer that converts this string `weather(...)` into a Map.
    // And then loads the template.
    // I should replicate this "DSL String" generation so I can reuse the `DslTransformer` logic I will write (or have written).
    
    return `weather(city:${city},style:${style},temp:${low}-${high},cond:${cond},extra:${extra},date:${date.toISOString()})`;
  } else if (domain === 'media') {
    const musicList = content.content;
    const raw = musicList[0];
    return `music(albumName:${raw.albumName},artists:${raw.artists},id:${raw.id},name:${raw.name},tags:${raw.tags})`;
  } else if (domain === 'poi') {
      // POI list handling
      // poi(content:[...], type:...)
      const poiList = content.pois;
      const poiType = content.poi_type;
      const dsls = poiList.map((poi: any) => {
          return `poi_info(name:${poi.name},poi_type:${poi.type},address:${poi.address},rating:${poi.business.rating},cost:${poi.business.cost},openTimeToday:${poi.business.opentime_today},image:${poi.photos && poi.photos.length > 0 ? poi.photos[0].url : ''})`;
      });
      // Join with comma
      return `poi(content:[${dsls.join(', ')}], type:${poiType})`;
  }
  return '';
};

// Streaming Request Helper
// Helper function to handle streaming HTTP requests manually using XMLHttpRequest
// This is necessary because standard fetch/axios doesn't easily support reading partial stream data
const streamRequest = (
  url: string,
  payload: any,
  onData: (line: string) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    // Use common headers
    Object.entries(COMMON_HEADERS).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
    });
    
    let seenBytes = 0;

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3) { // Loading (Streaming)
        // ... (rest is same)
        const newData = xhr.responseText.substring(seenBytes);
        seenBytes = xhr.responseText.length;
        
        const lines = newData.split('\n');
        lines.forEach(line => {
            if (line.trim().length > 0) onData(line);
        });
      } else if (xhr.readyState === 4) { // Done
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Request failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = (e) => reject(e);
    xhr.send(JSON.stringify(payload));
  });
};

// Call Omphalos API to get user intentions via streaming
export const omphalos = async (input: string): Promise<any[]> => {
  const payload = getQueryParams(input);
  let intentions: any[] = [];
  
  try {
    await streamRequest(OMPHALOS_URL, payload, (line) => {
       if (!line.startsWith('data:')) return;
       const content = line.substring(5).trim();
       if (content === '[DONE]') return;
       
       try {
           const json = JSON.parse(content);
           if (json.data && Array.isArray(json.data)) {
               intentions = json.data;
           }
       } catch (e) {
           console.warn('Omphalos parse error', e);
       }
    });
    return intentions;
  } catch (e) {
    console.error('Omphalos error', e);
    return [];
  }
};

export const weather = async (input: string): Promise<string> => {
    const payload = getQueryParams(input);
    console.log('Weather Request Payload:', JSON.stringify(payload));
    console.log('Weather Request URL:', WEATHER_URL);
    
    try {
        const resp = await axios.post(WEATHER_URL, payload, {
            headers: COMMON_HEADERS
        });
        console.log('Weather Response Status:', resp.status);
        console.log('Weather Response Data:', JSON.stringify(resp.data));
        
        const data = resp.data;
        if (data.code === 200 && data.data) {
            return getDsl('weather', data.data);
        } else {
            console.warn('Weather API returned error code or empty data', data);
        }
    } catch (e) {
        console.error('Weather error', e);
        if (axios.isAxiosError(e)) {
            console.error('Axios Error Details:', e.message, e.response?.data);
        }
    }
    return '';
};

export const music = async (input: string): Promise<string> => {
    const payload = getQueryParams(input);
    let dsl = '';
    try {
        await streamRequest(MUSIC_URL, payload, (line) => {
           if (!line.startsWith('data:')) return;
           const content = line.substring(5).trim();
           if (content === '[DONE]') return;
           
           try {
               const json = JSON.parse(content);
               const data = json.data;
               if (data && data.type !== 'message' && Array.isArray(data.content) && data.content.length > 0) {
                   dsl = getDsl('media', data);
               }
           } catch (e) {}
        });
    } catch (e) {
        console.error('Music error', e);
    }
    return dsl;
};

export const poi = async (input: string): Promise<string> => {
    const payload = getQueryParams(input);
    let dsl = '';
    try {
        await streamRequest(POI_URL, payload, (line) => {
           if (!line.startsWith('data:')) return;
           const content = line.substring(5).trim();
           if (content === '[DONE]') return;
           
           try {
               const json = JSON.parse(content);
               if (json.data) {
                   dsl = getDsl('poi', json.data);
               }
           } catch (e) {}
        });
    } catch (e) {
        console.error('Poi error', e);
    }
    return dsl;
};
