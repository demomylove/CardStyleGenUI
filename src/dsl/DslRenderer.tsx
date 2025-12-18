import React from 'react';
import { WidgetMapper } from './WidgetMapper';
import { DslTemplateLoader } from './DslParser';
import { DslParser } from './DslParser';

/**
 * 根据组件类型定义和数据上下文渲染组件。
 * @param component DSL 组件定义（来自 YAML）
 * @param data 用于解析绑定的当前数据上下文
 * @returns React 节点
 */
export const renderComponent = (component: any, data: any, onInteraction?: (action: any) => void): React.ReactNode => {
  const type = component.component_type;
  const properties = component.properties || {};
  const children = component.children || [];

  // Special handling for Loop
  // Iterates over an array in 'data' and renders children for each item
  if (type === 'Loop') {
      const itemsKey = properties.items?.replace(/{{|}}/g, '').trim();
      const itemAlias = properties.item_alias;
      const separator = properties.separator;
      
      const items = resolvePath(itemsKey, data);
      
      if (Array.isArray(items)) {
          const loopChildren: React.ReactNode[] = [];
          items.forEach((item, index) => {
             // Render actual children of the Loop component for EACH item
             // But we need to inject the alias into data context
             const itemContext = { ...data, [itemAlias]: item };
             
             children.forEach((childTemplate: any, childIndex: number) => {
                 const childNode = renderComponent(childTemplate, itemContext, onInteraction);
                 if (childNode) {
                     if (React.isValidElement(childNode)) {
                        // Assign unique key to help React reconciliation
                        loopChildren.push(React.cloneElement(childNode, { key: `${index}-${childIndex}` }));
                     } else {
                        loopChildren.push(childNode);
                     }
                 }
             });

             // Separator logic: add a SizedBox between items
             if (separator && index < items.length - 1) {
                 loopChildren.push(WidgetMapper.buildWidget('SizedBox', { height: separator }, [], itemContext));
             }
          });
          
          return (
              <React.Fragment>
                  {loopChildren}
              </React.Fragment>
          );
      }
      return null;
  }
  
  // Special handling for Component (Template inclusion)
  // Allows re-using templates (like partials)
  if (type === 'Component') {
      const templateId = properties.template_id;
      const dataBinding = properties.data_binding; // e.g. "{{poi}}"
      
      if (templateId) {
          // Resolve data binding for the new component scope
          // Resolve data binding for the new component scope
          let componentData = data;
          if (dataBinding) {
             if (typeof dataBinding === 'string') {
                const key = dataBinding.replace(/{{|}}/g, '').trim();
                componentData = resolvePath(key, data) || data;
             } else if (typeof dataBinding === 'object') {
                // Direct object injection (from JSON DSL)
                componentData = dataBinding;
             }
          }
          
          // Load and fill template dynamically
          const filledYaml = DslTemplateLoader.loadAndFillTemplate(templateId, componentData);
          // Parse and Render the loaded template
          return DslParser.parse(filledYaml, componentData);
          // Note: DslParser.parse calls renderComponent internally? 
          // Wait, DslParser.parse returns ReactNode?
          // I need to check DslParser definition. Assuming for now I can't easily pass it if parse wraps it.
          // But looking at line 77: DslParser.parse(filledYaml, componentData)
          // If DslParser invokes renderComponent, I need to update DslParser too.
      }
      return null;
  }

  // Resolve properties: Replace {{binding}} with actual values
  const resolvedProps: any = {};
  Object.keys(properties).forEach((key) => {
    resolvedProps[key] = resolveValue(properties[key], data);
  });

  // Recursively render children
  const childWidgets = children.map((child: any, index: number) => {
     // Add key to children
     const childNode = renderComponent(child, data, onInteraction);
     if (React.isValidElement(childNode)) {
        return React.cloneElement(childNode, { key: index });
     }
     return childNode;
  });

  return WidgetMapper.buildWidget(type, resolvedProps, childWidgets, data, onInteraction);
};

/**
 * 解析可能包含类似 handlebars 语法 {{key}} 的字符串值
 */
const resolveValue = (value: any, data: any): any => {
  if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
    const reg = /{{(.*?)}}/g;
    return value.replace(reg, (match, key) => {
        // Handle | padLeft logic if present (simple version)
        // The flutter regex was: r"{{\s*([^}|]+)\s*(\|\s*padLeft\((\d+),\s*\'(.)\'\))?\s*}}"
        // We need to handle that if we want date formatting to work.
        
        let cleanKey = key.trim();
        let padLen = 0;
        let padChar = ' ';
        
        if (cleanKey.includes('|')) {
            const parts = cleanKey.split('|');
            cleanKey = parts[0].trim();
            const pipe = parts[1].trim();
            if (pipe.startsWith('padLeft')) {
                const args = pipe.match(/padLeft\((\d+),\s*'(.)'\)/);
                if (args) {
                    padLen = parseInt(args[1]);
                    padChar = args[2];
                }
            }
        }

        const val = resolvePath(cleanKey, data);
        let str = val !== undefined && val !== null ? String(val) : '';
        if (padLen > 0) {
            str = str.padStart(padLen, padChar);
        }
        return str;
    });
  }
  return value;
};

const resolvePath = (key: string, data: any): any => {
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
