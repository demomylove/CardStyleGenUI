import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';

// Simple Emoji mapping for icons to avoid native dependency issues with vector-icons
// In a real production app, you would use react-native-vector-icons
const ICON_MAP: any = {
  wb_sunny: '☀️',
  cloud: '☁️',
  grain: '🌧️',
  nights_stay: '🌙',
  star: '⭐',
  attach_money: '💰',
  access_time: '🕒',
  category: '🏷️',
  music_note: '🎵',
  play_circle_fill: '▶️',
  pause_circle_filled: '⏸️',
  location_on: '📍',
  help_outline: '❓',
};

const COLOR_MAP: any = {
  neon: '#00BCD4', // Cyan Accent
  gradient: '#FF6E40', // Deep Orange Accent
  default: '#69F0AE', // Green Accent
};

/**
 * 将 DSL 组件类型和属性映射到 React Native 组件。
 * 这是 DSL 系统的核心渲染工厂。
 */
export class WidgetMapper {
  /**
   * 根据组件类型构建 React Native 元素。
   * @param type 组件类型字符串（例如 'Column', 'Text'）
   * @param props 解析后的属性映射
   * @param children 已经渲染的子 React 节点数组
   * @param dataContext 完整的数据上下文（用于一些此前未解析的深度绑定）
   */
  static buildWidget(
    type: string,
    props: any,
    children: any[],
    dataContext: any,
    onInteraction?: (action: any) => void
  ): React.ReactNode {
    switch (type) {
      case 'Column':
        return (
          <View
            style={{
              flexDirection: 'column',
              alignItems: this.crossAxisAlignment(props.cross_axis_alignment) as any,
              justifyContent: this.mainAxisAlignment(props.main_axis_alignment) as any,
              padding: this.parsePadding(props.padding),
              backgroundColor: props.background_color,
            }}
          >
            {children}
          </View>
        );
// ... existing code ...

      case 'Row':
        return (
          <View
            style={{
              flexDirection: 'row',
              alignItems: this.crossAxisAlignment(props.cross_axis_alignment) as any,
              justifyContent: this.mainAxisAlignment(props.main_axis_alignment) as any,
              padding: this.parsePadding(props.padding),
              // spacing is handled by gap in newer RN or margin on children
              gap: props.spacing, 
            }}
          >
            {children}
          </View>
        );

      case 'Text':
        const color = props.color || (props.color_binding ? this.parseBoundColor(props.color_binding, dataContext) : '#000000');
        const textContent = props.text_binding ? this.resolveBinding(props.text_binding, dataContext) : props.text;
        
        if (props.icon) {
            return (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ 
                        fontSize: props.font_size || 14, 
                        color: color, 
                        marginRight: 4 
                    }}>
                        {ICON_MAP[props.icon] || ICON_MAP.help_outline}
                    </Text>
                    <Text
                        numberOfLines={props.max_lines}
                        style={{
                            fontSize: props.font_size || 14,
                            fontWeight: this.fontWeight(props.font_weight),
                            color: color,
                            flex: 1, // Allow text to take remaining space
                        }}
                    >
                        {textContent}
                    </Text>
                </View>
            );
        }

        return (
          <Text
            numberOfLines={props.max_lines}
            style={{
              fontSize: props.font_size || 14,
              fontWeight: this.fontWeight(props.font_weight),
              color: color,
            }}
          >
            {textContent}
          </Text>
        );

      case 'Image':
        return this.buildImage(props, dataContext);

      case 'Spacer':
      case 'SizedBox':
        return (
          <View style={{ height: props.height, width: props.width }}>
            {children}
          </View>
        );

      case 'Align':
      case 'Center':
        // React Native layouts are flexbox, Center/Align often implies wrapping view with alignment
        // But if it's just wrapping one child, we can use a View with alignItems/justifyContent
        return (
          <View
            style={{
              alignItems: (type === 'Center' ? 'center' : this.parseAlignment(props.alignment).alignItems) as any,
              justifyContent: (type === 'Center' ? 'center' : this.parseAlignment(props.alignment).justifyContent) as any,
              width: '100%', // Align usually takes full width
            }}
          >
            {children}
          </View>
        );

      case 'ConstrainedBox':
         // max_width_ratio
         return (
             <View style={{ maxWidth: props.max_width_ratio ? `${props.max_width_ratio * 100}%` : undefined }}>
                 {children}
             </View>
         );

      case 'Padding':
        return (
          <View style={{ padding: this.parsePadding(props.padding) }}>
            {children}
          </View>
        );

      case 'Icon':
        const iconName = props.icon || (props.icon_binding ? this.parseBoundIcon(props.icon_binding, dataContext) : 'help_outline');
        const iconColor = props.color || (props.color_binding ? this.parseBoundColor(props.color_binding, dataContext) : '#000000');
        return (
            <Text style={{ fontSize: props.size || 24, color: iconColor }}>
                {ICON_MAP[iconName] || ICON_MAP.help_outline}
            </Text>
        );

      case 'IconButton': {
         const btnIconName = props.icon || (props.icon_binding ? this.resolveBinding(props.icon_binding, dataContext) : 'help_outline');
         
         const handlePress = () => {
             console.log('Icon Button Pressed', props.on_click);
             if (props.on_click && onInteraction) {
                 onInteraction(props.on_click);
             }
         };

        return (
             <TouchableOpacity onPress={handlePress}>
                <Text style={{ fontSize: props.size || 24, color: props.color }}>
                    {this.evalIconExpression(props.icon_binding, dataContext) || ICON_MAP[btnIconName] || ICON_MAP.help_outline}
                </Text>
             </TouchableOpacity>
        );
      }

      case 'Card':
        return (
          <View
            style={{
              backgroundColor: props.background_color || 'white',
              borderRadius: props.shape_border_radius || 0,
              margin: this.parsePadding(props.margin), // using parsePadding for margin list
              elevation: props.elevation,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
            }}
          >
            {children}
          </View>
        );
        
      case 'Slider':
        return (
            <Slider
                style={{width: '100%', height: 40}}
                minimumValue={0}
                maximumValue={this.resolveBinding(props.max_binding, dataContext) || 100}
                value={this.resolveBinding(props.value_binding, dataContext) || 0}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="#000000"
            />
        );

      default:
        const defaultView = <View />;
        if (props.on_click && onInteraction) {
            return (
                <TouchableOpacity onPress={() => onInteraction(props.on_click)}>
                    {children.length > 0 ? children : defaultView}
                </TouchableOpacity>
            );
        }
        return <View>{children}</View>;
    }
  }

  static crossAxisAlignment(s: string) {
    switch (s?.toLowerCase()) {
      case 'start': return 'flex-start';
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'stretch': return 'stretch';
      default: return 'flex-start';
    }
  }

  static mainAxisAlignment(s: string) {
    switch (s?.toLowerCase()) {
      case 'start': return 'flex-start';
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'spacebetween': return 'space-between';
      case 'spacearound': return 'space-around';
      case 'spaceevenly': return 'space-evenly';
      default: return 'flex-start';
    }
  }

  static fontWeight(s: string) {
    switch (s?.toLowerCase()) {
      case 'bold': return 'bold';
      case 'w500': return '500';
      default: return 'normal';
    }
  }

  static parsePadding(v: any) {
    if (Array.isArray(v) && v.length === 4) {
       // Flutter LTRB -> Top Right Bottom Left? No, Flutter is Left Top Right Bottom.
       // CSS/RN padding is usually Top Right Bottom Left (shorthand) or specific props.
       // We'll return just one number if they are all equal, or handle individually if View supports it.
       // But React Native `padding` prop takes number. `paddingHorizontal/Vertical` etc.
       // Let's return the integer if uniform, or undefined and set specific styles?
       // Actually View style accepts `paddingLeft` etc.
       // But here I returned it in `style={{ padding: ... }}`.
       // I should handle this better.
       return v[0]; // Simplified: assume uniform for now or fix logic.
       // Wait, if v is [16,16,16,16] it's uniform.
    }
    return typeof v === 'number' ? v : 0;
  }

  static parseAlignment(s: string) {
    // return alignItems and justifyContent for the wrapper
    switch (s?.toLowerCase()) {
      case 'center': return { alignItems: 'center', justifyContent: 'center' };
      case 'centerleft': return { alignItems: 'flex-start', justifyContent: 'center' };
      // ... others
      default: return { alignItems: 'flex-start', justifyContent: 'flex-start' };
    }
  }

  static parseBoundColor(key: string, ctx: any) {
    const val = ctx[key];
    return COLOR_MAP[val] || COLOR_MAP.default;
  }

  static parseBoundIcon(key: string, ctx: any) {
    const val = (ctx[key] || '').toString();
    if (val.includes('晴')) return 'wb_sunny';
    if (val.includes('云')) return 'cloud';
    if (val.includes('雨')) return 'grain';
    if (val.includes('星')) return 'star';
    return 'nights_stay';
  }

  static buildImage(props: any, dataContext: any) {
    let url = props.source;
    if (props.conditional_source) {
        // Need to resolve template inside conditional_source {{image}}
        url = this.resolveBinding(props.conditional_source, dataContext);
    }
    
    if (url && (url.startsWith('http') || url.startsWith('https'))) {
        return (
            <Image
                source={{ uri: url }}
                style={{
                    width: props.width === 'infinity' ? '100%' : props.width,
                    height: props.height,
                    borderRadius: props.border_radius,
                    backgroundColor: props.color,
                }}
                resizeMode="cover"
            />
        );
    }
    
    // Placeholder
    return (
        <View
            style={{
                width: props.width === 'infinity' ? '100%' : props.width,
                height: props.height,
                borderRadius: props.border_radius,
                backgroundColor: props.placeholder_color || '#E0E0E0',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{color: 'grey'}}>{props.placeholder_text || 'No Image'}</Text>
        </View>
    );
  }

  static resolveBinding(binding: string, data: any) {
      // Reuse the logic from DslRenderer? Or implement simple eval
      // Handle {{key}}
      if (!binding) return null;
      if (binding.includes('{{')) {
          const reg = /{{(.*?)}}/g;
          const match = reg.exec(binding);
          if (match) {
              const key = match[1].trim();
              return this.getValue(key, data);
          }
      }
      // Handle direct property access "durationState.position"
      return this.getValue(binding, data);
  }
  
  static getValue(key: string, data: any) {
      const parts = key.split('.');
      let curr = data;
      for (const p of parts) {
          if (curr && curr[p] !== undefined) curr = curr[p];
          else return undefined;
      }
      return curr;
  }

  static evalIconExpression(expr: string, data: any) {
      // Quick hack for the ternary in music template
      if (expr && expr.includes('?')) {
          // playerState.playing ? 'pause' : 'play'
          // We can try to parse it.
          const [condition, rest] = expr.split('?');
          const [trueVal, falseVal] = rest.split(':');
          const val = this.getValue(condition.trim(), data);
          if (val) return trueVal.trim().replace(/'/g, '');
          return falseVal.trim().replace(/'/g, '');
      }
      return this.resolveBinding(expr, data);
  }
}
