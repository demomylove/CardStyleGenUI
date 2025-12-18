"use strict";
/**
 * ComponentSchema.ts
 *
 * Defines the available UI components and their properties for the Generative UI system.
 * UPDATED: Aligned with DslRenderer's expected structure (snake_case, component_type, properties).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DSL_SCHEMA_DESCRIPTION = void 0;
exports.DSL_SCHEMA_DESCRIPTION = `
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
`;
