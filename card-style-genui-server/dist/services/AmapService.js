"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmapService = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class AmapService {
    static async searchPoi(keyword, city = 'Shanghai') {
        if (!this.API_KEY) {
            console.log('[AmapService] No API Key provided, returning Mock Data.');
            return this.getMockPois(keyword);
        }
        try {
            const url = `${this.TEXT_SEARCH_URL}?keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}&key=${this.API_KEY}&extensions=all`;
            console.log(`[AmapService] Fetching: ${url}`);
            const response = await (0, node_fetch_1.default)(url);
            if (!response.ok) {
                throw new Error(`Amap API error: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.status !== '1') {
                console.warn('[AmapService] API returned status 0:', data.info);
                return this.getMockPois(keyword); // Fallback to mock on API logic error
            }
            if (!data.pois || data.pois.length === 0) {
                return [];
            }
            // Map API response to our simplifed POI model
            return data.pois.slice(0, 5).map((poi) => {
                var _a, _b;
                return ({
                    name: poi.name,
                    type: (poi.type || '').split(';')[0], // Take first category
                    rating: ((_a = poi.biz_ext) === null || _a === void 0 ? void 0 : _a.rating) || '4.5',
                    cost: ((_b = poi.biz_ext) === null || _b === void 0 ? void 0 : _b.cost) ? `¥${poi.biz_ext.cost}` : '¥--',
                    opentimeToday: '09:00-22:00', // API might not have structured open time in basic response
                    address: poi.address,
                    image: (poi.photos && poi.photos.length > 0) ? poi.photos[0].url : '',
                    distance: poi.distance
                });
            });
        }
        catch (error) {
            console.error('[AmapService] Request failed:', error);
            return this.getMockPois(keyword);
        }
    }
    static getMockPois(keyword) {
        // Generate context-aware mock data based on simple keywords
        if (keyword.includes('咖啡') || keyword.includes('coffee')) {
            return [
                {
                    name: "Starbucks Reserve (Mock)",
                    type: "Coffee Shop",
                    rating: "4.8",
                    cost: "¥45",
                    opentimeToday: "07:00-22:00",
                    address: "No. 123 Mock Nanjing Road, Shanghai",
                    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1000&auto=format&fit=crop"
                },
                {
                    name: "Luckin Coffee (Mock)",
                    type: "Coffee Chains",
                    rating: "4.5",
                    cost: "¥18",
                    opentimeToday: "08:00-20:00",
                    address: "B1, Mock Plaza, Shanghai",
                    image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=1000&auto=format&fit=crop"
                },
                {
                    name: "Manner Coffee (Mock)",
                    type: "Specialty Coffee",
                    rating: "4.7",
                    cost: "¥20",
                    opentimeToday: "07:30-19:00",
                    address: "Corner output, Shanghai",
                    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000&auto=format&fit=crop"
                }
            ];
        }
        // Default Generic Mock
        return [
            {
                name: `Mock POI for ${keyword}`,
                type: "Point of Interest",
                rating: "4.0",
                cost: "¥50",
                opentimeToday: "09:00-21:00",
                address: "100 Mock Avenue",
                image: "https://via.placeholder.com/150"
            }
        ];
    }
}
exports.AmapService = AmapService;
// User provided key
AmapService.API_KEY = process.env.AMAP_API_KEY || 'df77469c39902532b069d6273e681c77';
// APIs
AmapService.TEXT_SEARCH_URL = 'https://restapi.amap.com/v3/place/text';
AmapService.WEATHER_API_URL = 'https://restapi.amap.com/v3/weather/weatherInfo';
AmapService.GEOCODING_API_URL = 'https://restapi.amap.com/v3/geocode/geo';
