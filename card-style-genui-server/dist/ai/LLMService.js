"use strict";
/**
 * LLMService.ts
 *
 * Handles interactions with the Large Language Model.
 * Currently allows toggling between a Mock mode and a Real API mode.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
// Basic fetch polyfill/implementation for Node.js if needed (Node 18+ has native fetch)
// import fetch from 'node-fetch'; 
class LLMService {
    /**
     * Generates UI DSL based on the prompt.
     */
    static async generateUI(prompt) {
        if (this.USE_MOCK) {
            return this.mockGenerate(prompt);
        }
        else {
            return this.callRealLLM(prompt);
        }
    }
    static async mockGenerate(prompt) {
        // ... (mock implementation unchanged)
        // Simulate network delay
        await new Promise(resolve => setTimeout(() => resolve(), 1000));
        console.log('[LLM Mock] Received Prompt length:', prompt.length);
        // UPDATED MOCK with correct schema (snake_case, component_type, properties)
        const mockResponse = {
            component_type: "Center",
            properties: {},
            children: [
                {
                    component_type: "SizedBox",
                    properties: { width: 280 },
                    children: [
                        {
                            component_type: "Card",
                            properties: {
                                background_color: "#6200EA", // Deep Purple Accent
                                padding: 12,
                                shape_border_radius: 16,
                                elevation: 8,
                                margin: 0
                            },
                            children: [
                                {
                                    component_type: "Column",
                                    properties: { spacing: 8, cross_axis_alignment: 'center' },
                                    children: [
                                        {
                                            component_type: "Image",
                                            properties: {
                                                source: "https://p1.music.126.net/s8rG2Jc8R9w0g7_l_G8jRg==/109951165792276536.jpg",
                                                width: '100%',
                                                height: 150,
                                                border_radius: 12
                                            }
                                        },
                                        {
                                            component_type: "Text",
                                            properties: { text: "七里香", font_size: 18, font_weight: "bold", color: "#FFFFFF" }
                                        },
                                        {
                                            component_type: "Text",
                                            properties: { text: "周杰伦", font_size: 14, color: "#DDDDDD" }
                                        },
                                        {
                                            component_type: "Row",
                                            properties: { spacing: 8, main_axis_alignment: 'center' },
                                            children: [
                                                { component_type: "Text", properties: { text: "▶", font_size: 20, color: "#00E676" } }, // Play icon
                                                { component_type: "Text", properties: { text: "❤️", font_size: 18, color: "#FF4081" } } // Like icon
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        return JSON.stringify(mockResponse);
    }
    static async callRealLLM(prompt) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: "You are a helpful assistant." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) {
                throw new Error(`LLM API Error: ${response.statusText}`);
            }
            const data = await response.json();
            const content = data.choices[0].message.content;
            return content;
        }
        catch (error) {
            console.error('LLM Request Failed:', error);
            // Fallback to mock for resilience (optional)
            return this.mockGenerate(prompt);
        }
    }
}
exports.LLMService = LLMService;
// Toggle mock via env; default to REAL API (false) per deployment requirement
LLMService.USE_MOCK = process.env.LLM_USE_MOCK === 'true';
// DeepSeek API Endpoint (configurable via env)
LLMService.API_ENDPOINT = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/chat/completions';
LLMService.API_KEY = process.env.DEEPSEEK_API_KEY || 'YOUR_DEEPSEEK_API_KEY';
