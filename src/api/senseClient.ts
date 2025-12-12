// axios is no longer needed - using streamRequest for all API calls

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

// Helper to parse weather information from natural language text
const parseWeatherText = (text: string): any => {
  console.log('Parsing weather text:', text);
  
  // Extract city name (common Chinese cities)
  const cityMatch = text.match(/(北京|上海|广州|深圳|杭州|南京|成都|重庆|武汉|西安|天津|苏州|郑州|长沙|沈阳|青岛|宁波|厦门|济南|哈尔滨|福州|大连|昆明|无锡|合肥|佛山|东莞|南宁|长春|石家庄|太原|南昌|贵阳|兰州|海口|银川|西宁|拉萨|乌鲁木齐)/)
  const city = cityMatch ? cityMatch[1] : '未知';
  
  // Extract date (relative or absolute)
  const dateMatch = text.match(/(今天|明天|后天|大后天)/);
  const dateStr = dateMatch ? dateMatch[1] : '今天';
  const date = new Date();
  if (dateStr === '明天') date.setDate(date.getDate() + 1);
  else if (dateStr === '后天') date.setDate(date.getDate() + 2);
  else if (dateStr === '大后天') date.setDate(date.getDate() + 3);
  
  // Extract temperature (patterns like "10度", "1-10度", "10度左右")
  const tempRangeMatch = text.match(/(\d+)[-到](\d+)度/);
  const tempSingleMatch = text.match(/(\d+)度/);
  let low = '0', high = '0';
  
  if (tempRangeMatch) {
    low = tempRangeMatch[1];
    high = tempRangeMatch[2];
  } else if (tempSingleMatch) {
    high = tempSingleMatch[1];
    low = (parseInt(high, 10) - 5).toString(); // Estimate low temp
  }
  
  // Extract weather condition
  const condMatch = text.match(/(晴|多云|阴|小雨|中雨|大雨|暴雨|雷阵雨|阵雨|雨夹雪|小雪|中雪|大雪|暴雪|雾|霾|沙尘暴)/);
  const cond = condMatch ? condMatch[1] : '晴';
  
  // Extract additional info (humidity, wind, etc.)
  const humidityMatch = text.match(/湿度(\d+)%/);
  const windMatch = text.match(/风速(\d+)/);
  const humidity = humidityMatch ? humidityMatch[1] : '50';
  const wind = windMatch ? windMatch[1] : '3';
  
  console.log('Parsed weather:', { city, date: date.toISOString(), low, high, cond, humidity, wind });
  
  return {
    cityName: city,
    weather_range: [{
      predictDate: Math.floor(date.getTime() / 1000),
      tempLow: low,
      tempHigh: high,
      weatherDay: cond,
      weatherNight: cond,
      humidity: humidity,
      wspdDay: wind
    }],
    parsedFromText: true
  };
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
    
    const style = (cond.includes('雨') || cond.includes('雪')) ? 'neon' : (parseInt(high, 10) >= 30 ? 'gradient' : 'futuristic');
    const extra = `湿度${humidity}%，风速${wind}m/s`;
    
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
    let incompleteData = ''; // Buffer for incomplete JSON

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3) { // Loading (Streaming)
        const newData = xhr.responseText.substring(seenBytes);
        seenBytes = xhr.responseText.length;
        
        // Combine with any incomplete data from previous chunk
        const fullData = incompleteData + newData;
        const lines = fullData.split('\n');
        
        // Keep the last line as it might be incomplete
        incompleteData = lines.pop() || '';
        
        lines.forEach(line => {
            if (line.trim().length > 0) onData(line);
        });
      } else if (xhr.readyState === 4) { // Done
        // Process any remaining data
        const remainingData = xhr.responseText.substring(seenBytes);
        const fullData = incompleteData + remainingData;
        
        if (fullData.trim().length > 0) {
          const lines = fullData.split('\n');
          lines.forEach(line => {
              if (line.trim().length > 0) onData(line);
          });
        }
        
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
    
    let accumulatedText = '';
    let dsl = '';
    
    try {
        await streamRequest(WEATHER_URL, payload, (line) => {
            if (!line.startsWith('data:')) return;
            const content = line.substring(5).trim();
            if (content === '[DONE]') return;
            
            try {
                const json = JSON.parse(content);
                if (json.code === 200 && json.data && json.data.type === 'message') {
                    // Accumulate text fragments
                    accumulatedText += json.data.content || '';
                }
            } catch (e) {
                console.warn('Weather stream parse error', e);
            }
        });
        
        console.log('Accumulated weather text:', accumulatedText);
        
        if (accumulatedText) {
            // Parse the accumulated text to extract weather information
            const parsedData = parseWeatherText(accumulatedText);
            dsl = getDsl('weather', parsedData);
            console.log('Generated DSL from parsed text:', dsl);
        }
    } catch (e) {
        console.error('Weather error', e);
    }
    
    return dsl;
};

export const music = async (input: string): Promise<string> => {
    const payload = getQueryParams(input);
    console.log('Music Request Payload:', JSON.stringify(payload));
    console.log('Music Request URL:', MUSIC_URL);
    
    let dsl = '';
    let responseCount = 0;
    
    try {
        await streamRequest(MUSIC_URL, payload, (line) => {
           if (!line.startsWith('data:')) return;
           const content = line.substring(5).trim();
           if (content === '[DONE]') return;
           
           responseCount++;
           
           try {
               const json = JSON.parse(content);
               console.log(`Music Response #${responseCount}:`, JSON.stringify(json).substring(0, 200));
               
               const data = json.data;
               if (data) {
                   console.log('Music data type:', data.type);
                   
                   // Check if it's a message type (like weather)
                   if (data.type === 'message') {
                       console.log('Music returned message type - may need text parsing');
                   } else if (data.type !== 'message' && Array.isArray(data.content) && data.content.length > 0) {
                       dsl = getDsl('media', data);
                       console.log('Generated Music DSL:', dsl);
                   }
               }
           } catch (e) {
               console.warn('Music stream parse error', e);
           }
        });
        
        console.log('Music final DSL:', dsl);
    } catch (e) {
        console.error('Music error', e);
    }
    return dsl;
};

export const poi = async (input: string): Promise<string> => {
    const payload = getQueryParams(input);
    console.log('POI Request Payload:', JSON.stringify(payload));
    console.log('POI Request URL:', POI_URL);
    
    let dsl = '';
    let responseCount = 0;
    let jsonBuffer = ''; // Buffer for accumulating multi-line JSON
    
    try {
        await streamRequest(POI_URL, payload, (line) => {
           // Check if this is a data line or continuation of previous JSON
           if (line.startsWith('data:')) {
               // If we have buffered JSON, try to parse it first
               if (jsonBuffer) {
                   try {
                       const json = JSON.parse(jsonBuffer);
                       responseCount++;
                       console.log(`POI Response #${responseCount} type:`, json.type);
                       
                       if (json.type === 'poi' && json.data && json.data.pois) {
                           console.log('POI structured data received, pois count:', json.data.pois.length);
                           dsl = getDsl('poi', json.data);
                           console.log('Generated POI DSL:', dsl.substring(0, 200) + '...');
                       } else if (json.type === 'poi_tts') {
                           console.log('POI TTS response (ignored):', json.data?.substring(0, 50));
                       }
                   } catch (e) {
                       console.warn('POI buffered JSON parse error', e);
                   }
                   jsonBuffer = '';
               }
               
               // Start new JSON from this line
               const content = line.substring(5).trim();
               if (content === '[DONE]') return;
               
               jsonBuffer = content;
               
               // Try to parse immediately (might be complete)
               try {
                   const json = JSON.parse(jsonBuffer);
                   responseCount++;
                   console.log(`POI Response #${responseCount} type:`, json.type);
                   
                   if (json.type === 'poi' && json.data && json.data.pois) {
                       console.log('POI structured data received, pois count:', json.data.pois.length);
                       dsl = getDsl('poi', json.data);
                       console.log('Generated POI DSL:', dsl.substring(0, 200) + '...');
                   } else if (json.type === 'poi_tts') {
                       console.log('POI TTS response (ignored):', json.data?.substring(0, 50));
                   }
                   jsonBuffer = ''; // Clear buffer if successfully parsed
               } catch (e) {
                   // JSON incomplete, keep in buffer
               }
           } else if (jsonBuffer) {
               // This is a continuation line, append to buffer
               jsonBuffer += line;
           }
        });
        
        // Process any remaining buffered JSON
        if (jsonBuffer) {
            try {
                const json = JSON.parse(jsonBuffer);
                responseCount++;
                console.log(`POI Response #${responseCount} type (final):`, json.type);
                
                if (json.type === 'poi' && json.data && json.data.pois) {
                    console.log('POI structured data received (final), pois count:', json.data.pois.length);
                    dsl = getDsl('poi', json.data);
                    console.log('Generated POI DSL (final):', dsl.substring(0, 200) + '...');
                }
            } catch (e) {
                console.warn('POI final buffer parse error', e);
            }
        }
        
        console.log('POI final DSL:', dsl);
    } catch (e) {
        console.error('Poi error', e);
    }
    return dsl;
};
