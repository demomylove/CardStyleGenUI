/**
 * LLMService.ts
 * 
 * Handles interactions with the Large Language Model.
 * Currently allows toggling between a Mock mode and a Real API mode.
 */

// Basic fetch polyfill/implementation for Node.js if needed (Node 18+ has native fetch)
// import fetch from 'node-fetch'; 

export class LLMService {
    // Toggle mock via env; default to REAL API (false) per deployment requirement
    static USE_MOCK = process.env.LLM_USE_MOCK === 'true';

    // Qwen API Endpoint (configurable via env)
    static API_ENDPOINT = process.env.QWEN_API_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'; 
  // IMPORTANT: Do not commit real API keys; use env var only
  static API_KEY = process.env.QWEN_API_KEY || 'sk-7fa0884c562d4009b1a23bb5d52e965a';
  
    /**
     * Generates UI DSL based on the prompt.
     */
    static async generateUI(prompt: string): Promise<string> {
      if (this.USE_MOCK) {
        return this.mockGenerate(prompt);
      } else {
        return this.callRealLLM(prompt);
      }
    }
  
    private static async mockGenerate(prompt: string): Promise<string> {
      // Simulate network delay
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
  
      console.log('[LLM Mock] Received Prompt length:', prompt.length);

      // POI Mock Fallback
      if (prompt.toLowerCase().includes('coffee') || prompt.toLowerCase().includes('poi') || prompt.includes('咖啡') || prompt.includes('附近')) {
          // Return a Component that uses the PoiList template. 
          // The dataContext (pois) is already injected by chat.ts, so the renderer will access it.
          const mockResponse = {
              component_type: "Component",
              properties: {
                  template_id: "PoiList",
                  // Bind the entire data context so {{pois}} in template resolves to data.pois
                  data_binding: "{{}}" 
              }
          };
          return JSON.stringify(mockResponse);
      }
  
      // Default Music Mock
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
                           { component_type: "Text", properties: { text: "❤️", font_size: 18, color: "#FF4081" } }  // Like icon
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
  
    private static async callRealLLM(prompt: string): Promise<string> {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout
        const response = await fetch(this.API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`
          },
          body: JSON.stringify({
            model: "qwen-flash",
            messages: [
              { role: "system", content: "You are a helpful assistant. Please respond with valid JSON." },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);
  
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`LLM API Error Body: ${errorText}`);
          throw new Error(`LLM API Error: ${response.statusText}`);
        }
  
        const data: any = await response.json();
        const content = data.choices[0].message.content;
        return content;
      } catch (error) {
        console.error('LLM Request Failed:', error);
        // Fallback to mock for resilience (optional)
        return this.mockGenerate(prompt); 
      }
    }
  }
