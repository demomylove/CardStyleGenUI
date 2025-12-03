import { TEMPLATES } from './templates';
import yaml from 'js-yaml';
import { renderComponent } from './DslRenderer';

/**
 * 将 DSL 字符串（YAML）解析为 React 组件树。
 */
export const DslParser = {
  parse: (yamlString: string, data: any) => {
    try {
      const yamlMap = yaml.load(yamlString) as any;
      if (!yamlMap || !yamlMap.page || !yamlMap.page.body) {
        return null;
      }
      const root = yamlMap.page.body;
      return renderComponent(root, data);
    } catch (e) {
      console.error('DSL Parse Error:', e);
      return null;
    }
  },
};

/**
 * 帮助从 templates.ts 加载 YAML 模板并填充数据值的辅助工具。
 * 将 {{key}} 替换为 data[key]。
 */
export const DslTemplateLoader = {
  loadAndFillTemplate: (type: string, data: any): string => {
    const template = (TEMPLATES as any)[type];
    if (!template) return '';
    
    // Basic template filling for scalar data (maps).
    // For lists (like POI), logic is handled in DslFactory or via Loop components.
    return fillTemplate(template, data);
  },
};

/**
 * 将模板字符串中的占位符替换为数据对象中的值。
 * 占位符格式为 {{key}} 或 {{nested.key}}。
 * @param template 模板字符串
 * @param data 包含值的数据对象
 */
const fillTemplate = (template: string, data: any): string => {
  const reg = /{{(.*?)}}/g;
  return template.replace(reg, (match, key) => {
    const value = resolveKey(key.trim(), data);
    return value !== undefined && value !== null ? String(value) : '';
  });
};

/**
 * 解析针对数据对象的点符号键路径。
 * @param key 点分隔的键路径（例如 "user.address.city"）
 * @param data 根数据对象
 */
const resolveKey = (key: string, data: any): any => {
  const segments = key.split('.');
  let current = data;
  for (const seg of segments) {
    if (current && typeof current === 'object' && seg in current) {
      current = current[seg];
    } else {
      return undefined;
    }
  }
  return current;
};
