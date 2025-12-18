import React from 'react';
import { View, Text } from 'react-native';
import { DslParser, DslTemplateLoader } from './DslParser';
import { renderComponent } from './DslRenderer';
import { PromptBuilder } from '../ai/PromptBuilder';
import { LLMService } from '../ai/LLMService';

/**
 * 将原始 DSL 字符串转换为渲染后的 React Native 组件的工厂。
 * 处理不同领域（天气、音乐、POI）的高级解析逻辑。
 */
export const DslFactory = {
  // New: auto-detect structured JSON DSL vs legacy string DSL
  parseAny: async (input: string): Promise<React.ReactNode> => {
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const obj = JSON.parse(trimmed);
          // Case A: wrapper { component, data }
          if (obj && obj.component && obj.data) {
            return renderComponent(obj.component, obj.data);
          }
          // Case B: direct component JSON
          if (obj && obj.component_type) {
            return renderComponent(obj, {});
          }
          // Unknown JSON → fallback to legacy parsing below
        } catch (_e) {
          // Not JSON, fall through to legacy parsing
        }
      }
    }
    // Legacy string DSL path
    return DslFactory.parseDsl(input);
  },
  parseDsl: async (dsl: string): Promise<React.ReactNode> => {
    // 1. Try JSON parsing first (New Standard)
    const trimmed = dsl.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const json = JSON.parse(trimmed);
            console.log('[DslFactory] Parsed JSON DSL:', json);
            // If it's a Component/Page structure, render it directly.
            // We pass an empty initial data context because the JSON DSL 
            // usually contains its own data via data_binding or properties.
            return renderComponent(json, {});
        } catch (e) {
            console.warn('[DslFactory] JSON parse failed, falling back to legacy parser', e);
        }
    }

    // 2. Fallback to Legacy String Parsing (Old Standard)
    const parsed = parseInput(dsl);
    const type = parsed.type;
    const data = parsed.data;

    if (!type || !data) {
      return <Text>DSL Parse Failed</Text>;
    }

    if (type === 'poi' && Array.isArray(data)) {
      // Special handling for POI list: Render a list of POI cards
      // This mimics the Flutter logic where multiple cards are generated.
      const items: React.ReactNode[] = [];
      for (const poi of data) {
        // Load template manually for each item
        const filledYaml = DslTemplateLoader.loadAndFillTemplate('poi_item', poi);
        const widget = DslParser.parse(filledYaml, poi);
        if (widget) items.push(widget);
      }
      
      // Wrap in Column/List logic
      return (
        <View style={{ marginVertical: 8, marginHorizontal: 16 }}>
           {items.map((item, index) => (
              <View key={index} style={{ marginBottom: 12 }}>
                {item}
              </View>
           ))}
        </View>
      );
    } else {
      // Standard case: Single card rendering
      const filledYaml = DslTemplateLoader.loadAndFillTemplate(type, data);
      return DslParser.parse(filledYaml, data);
    }
  },

  /**
   * Generates UI from natural language query and data using LLM.
   * @param query User's natural language request
   * @param data Data context for the UI
   */
  generateFromQuery: async (query: string, data: any): Promise<React.ReactNode> => {
    try {
      console.log(`[GenUI] Constructing prompt for query: "${query}"`);
      const prompt = PromptBuilder.constructPrompt(query, data);
      
      console.log(`[GenUI] Calling LLMService...`);
      const jsonStr = await LLMService.generateUI(prompt);
      
      console.log(`[GenUI] Received DSL:`, jsonStr);
      let dslObject;
      try {
        // Simple cleanup for markdown code blocks if LLM ignores instruction
        const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '');
        dslObject = JSON.parse(cleanJson);
      } catch (e) {
        console.error('[GenUI] JSON Parse Error:', e);
        return <Text style={{color: 'red'}}>AI Response Error: Invalid JSON</Text>;
      }

      // Render the generated DSL using renderComponent directly
      // This bypasses DslParser's YAML expectation
      return renderComponent(dslObject, data);
    } catch (error) {
      console.error('[GenUI] Generation Failed:', error);
      return <Text style={{color: 'red'}}>Generative UI Failed</Text>;
    }
  },
};

/**
 * 将 DSL 字符串格式 "type(key:value, ...)" 解析为结构化对象。
 */
const parseInput = (input: string): { type: string; data: any } => {
  const typeMatch = input.match(/^(\w+)\((.*)\)$/);
  if (!typeMatch) return { type: '', data: null };

  const type = typeMatch[1];
  const body = typeMatch[2];
  
  let data: any = {};

  if (type === 'weather') {
    data = parseDslMap(body);
    // Post-processing for temp range
    if (data.temp) {
        const parts = data.temp.split('-');
        data.low = parts[0];
        data.high = parts[1];
    }
  } else if (type === 'music') {
      data = parseSimpleMap(input, 'music');
  } else if (type === 'poi') {
      // POI List Parsing: Expects poi(content:[...], type:...)
      const poiMatch = input.match(/poi\(content:\[(.*)\],\s*type:([^\)]+)\)/);
      if (poiMatch) {
          const contentStr = poiMatch[1];
          // const poiType = poiMatch[2].trim(); // unused in rendering for now
          
          console.log('[DslFactory] Parsed POI content string length:', contentStr.length);

          // Extract individual poi_info(...) items
          const poiList: any[] = [];
          const itemRegex = /poi_info\((.*?)\)/g;
          let m;
          while ((m = itemRegex.exec(contentStr)) !== null) {
              const itemBody = m[1]; 
              console.log('[DslFactory] Found POI item body:', itemBody);
              const itemMap = parseDslMap(itemBody); 
              poiList.push(itemMap);
          }
          console.log('[DslFactory] Total parsed items:', poiList.length);
          data = poiList;
      }
  }

  return { type, data };
};

// Helper to parse comma-separated key:value pairs
/**
 * 将逗号分隔的键值对字符串解析为对象。
 * 例如："key1:value1, key2:value2" -> {key1: "value1", key2: "value2"}
 * @param content 要解析的字符串内容
 */
const parseDslMap = (content: string) => {
  const map: any = {};
  const parts = content.split(',');
  parts.forEach(p => {
      const [k, ...v] = p.split(':');
      if (k && v) {
          map[k.trim()] = v.join(':').trim();
      }
  });
  return map;
};

/**
 * 解析简单的 DSL 格式，其中类型名称包裹内容。
 * 例如："music(title:Song, artist:Singer)" -> {title: "Song", artist: "Singer"}
 * @param input 完整的输入字符串
 * @param typeName 预期的类型名称前缀
 */
const parseSimpleMap = (input: string, typeName: string) => {
    const body = input.substring(typeName.length + 1, input.length - 1);
    return parseDslMap(body);
};
