
/**
 * ComponentSchema.ts
 * 
 * Defines the available UI components and their properties for the Generative UI system.
 * UPDATED: Aligned with DslRenderer's expected structure (snake_case, component_type, properties).
 */

export const DSL_SCHEMA_DESCRIPTION = `
type Component = {
  component_type: "Column" | "Row" | "Text" | "Image" | "Card" | "SizedBox";
  properties?: Record<string, any>;
  children?: Component[];
}

AVAILABLE COMPONENTS & PROPERTIES:

1. Column
   - properties: { 
       main_axis_alignment: 'start'|'center'|'spacebetween', 
       cross_axis_alignment: 'start'|'center',
       padding: number,
       background_color: string
     }
   - children: Component[]

2. Row
   - properties: { 
       main_axis_alignment: 'start'|'center'|'spacebetween', 
       cross_axis_alignment: 'center'|'end',
       padding: number,
       spacing: number
     }
   - children: Component[]

3. Text
   - properties: { 
       text: string (REQUIRED), 
       font_size: number, 
       color: string (hex), 
       font_weight: 'normal'|'bold',
       max_lines: number
     }
   - children: []

4. Image
   - properties: { 
       source: string (REQUIRED, URL), 
       width: number | 'infinity', 
       height: number, 
       border_radius: number,
       color: string (background)
     }
   - children: []

5. Card
   - properties: { 
       background_color: string (hex), 
       padding: number, 
       shape_border_radius: number, 
       elevation: number,
       margin: number
     }
   - children: Component[]

6. SizedBox
   - properties: { width: number, height: number }
   - children: []

7. Button
   - properties: { 
       text: string (REQUIRED),
       background_color: string (hex, default: '#007AFF'),
       text_color: string (hex, default: '#FFFFFF'),
       font_size: number (default: 16),
       padding: number (default: 12),
       border_radius: number (default: 8),
       on_click: ActionObject (event handler)
     }
   - children: []

# Event Actions (ActionObject)
When a component needs to trigger an action on click, use on_click property:
{
  "on_click": {
    "action_type": "toast" | "navigate" | "call_api",
    "payload": {
      "message": string,     // for toast
      "route": string,       // for navigate
      "api_endpoint": string // for call_api
    }
  }
}

Example Button with Toast:
{
  "component_type": "Button",
  "properties": {
    "text": "点击我",
    "background_color": "#FF6B35",
    "on_click": {
      "action_type": "toast",
      "payload": { "message": "按钮被点击了！" }
    }
  }
}
`;
