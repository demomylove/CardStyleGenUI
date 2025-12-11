/**
 * DSL Templates for various card types.
 * These are written in YAML format and define the structure of the UI components.
 * They support variable interpolation via {{key}} syntax.
 */
export const TEMPLATES = {
  // Weather Card Template
  // Displays city, date, temperature range, condition icon, and extra info.
  weather: `page:
  id: "WeatherCard"
  body:
    component_type: "Align"
    properties:
      alignment: "center"
    children:
      - component_type: "ConstrainedBox"
        properties:
          max_width_ratio: 0.9
        children:
          - component_type: "Card"
            properties:
              shape_border_radius: 24
              elevation: 8
              margin: [16, 8, 16, 8]
              background_color: "#5C6BC0"
            children:
              - component_type: "Padding"
                properties:
                  padding: [24, 24, 24, 24]
                children:
                  - component_type: "Column"
                    properties:
                      cross_axis_alignment: "start"
                    children:
                      - component_type: "Row"
                        properties:
                          main_axis_alignment: "spaceBetween"
                          cross_axis_alignment: "center"
                        children:
                          - component_type: "Column"
                            properties:
                              cross_axis_alignment: "start"
                            children:
                              - component_type: "Text"
                                properties:
                                  text: "{{city}}"
                                  font_size: 28
                                  font_weight: "bold"
                                  color: "#FFFFFF"
                              - component_type: "Text"
                                properties:
                                  text: "{{date.year}}-{{date.month}}-{{date.day}} {{date.weekday}}"
                                  font_size: 14
                                  color: "#C5CAE9"
                          - component_type: "Icon"
                            properties:
                              icon_binding: "cond"
                              size: 72
                              color: "#FFD54F"

                      - component_type: "SizedBox"
                        properties:
                          height: 24

                      - component_type: "Row"
                        properties:
                          main_axis_alignment: "start"
                          cross_axis_alignment: "end"
                        children:
                          - component_type: "Text"
                            properties:
                              text: "{{high}}°"
                              font_size: 64
                              font_weight: "300"
                              color: "#FFFFFF"
                          - component_type: "SizedBox"
                            properties:
                              width: 12
                          - component_type: "Column"
                            properties:
                              cross_axis_alignment: "start"
                            children:
                              - component_type: "Text"
                                properties:
                                  text: "{{cond}}"
                                  font_size: 20
                                  font_weight: "bold"
                                  color: "#FFFFFF"
                              - component_type: "Text"
                                properties:
                                  text: "Low: {{low}}°"
                                  font_size: 16
                                  color: "#E8EAF6"
                              - component_type: "SizedBox"
                                properties:
                                  height: 8

                      - component_type: "SizedBox"
                        properties:
                          height: 16

                      - component_type: "Row"
                        properties:
                          main_axis_alignment: "start"
                        children:
                          - component_type: "Icon"
                            properties:
                              icon: "location_on"
                              size: 20
                              color: "#C5CAE9"
                          - component_type: "SizedBox"
                            properties:
                              width: 4
                          - component_type: "Text"
                            properties:
                              text: "{{extra}}"
                              font_size: 14
                              color: "#C5CAE9"`,
  music: `page:
  id: "MusicCard"
  body:
    component_type: "Column"
    properties:
      padding: [16, 16, 16, 16]
      cross_axis_alignment: "center"
    children:
      - component_type: "Image"
        properties:
          height: 180
          width: "infinity"
          border_radius: 12
          placeholder_icon: "music_note"
          color: "#E0E0E0"

      - component_type: "Spacer"
        properties:
          height: 12

      - component_type: "Column"
        properties:
          cross_axis_alignment: "start"
        children:
          - component_type: "Text"
            properties:
              text: "{{music.name}}"
              font_size: 20
              font_weight: "bold"
              color: "#000000"
          - component_type: "Text"
            properties:
              text: "{{music.albumName}} · {{music.artists}}"
              font_size: 14
              color: "#666666"
          - component_type: "Text"
            properties:
              text: "{{music.tags}}"
              font_size: 12
              color: "#999999"

      - component_type: "Slider"
        properties:
          value_binding: "durationState.position"
          max_binding: "durationState.total"

      - component_type: "Row"
        properties:
          main_axis_alignment: "spaceBetween"
        children:
          - component_type: "Text"
            properties:
              text: "00:00"
          - component_type: "Text"
            properties:
              text: "03:45"

      - component_type: "Row"
        properties:
          main_axis_alignment: "center"
        children:
          - component_type: "IconButton"
            properties:
              icon: "play_circle_fill"
              size: 48
              color: "#2196F3"`,
  poi_item: `page:
  id: "PoiCardItem"
  body:
    component_type: "Row"
    properties:
      spacing: 12
      padding: [12, 12, 12, 12]
    children:
      - component_type: "Image"
        properties:
          conditional_source: "{{image}}"
          width: 100
          height: 100
          border_radius: 8
          placeholder_text: "无相关图片"
          placeholder_color: "#E0E0E0"

      - component_type: "Column"
        properties:
          cross_axis_alignment: "start"
        children:
          - component_type: "Text"
            properties:
              text: "{{name}}"
              font_size: 16
              font_weight: "bold"
          - component_type: "Text"
            properties:
              icon: "category"
              text: "{{type}}"
          - component_type: "Text"
            properties:
              icon: "star"
              text: "评分：{{rating}}"
          - component_type: "Text"
            properties:
              icon: "attach_money"
              text: "人均：{{cost}}"
          - component_type: "Text"
            properties:
              icon: "access_time"
              text: "今日营业：{{opentimeToday}}"
          - component_type: "Text"
            properties:
              icon: "location_on"
              text: "{{address}}"`,
  poi: `page:
  id: "PoiList"
  body:
    component_type: "Column"
    properties:
      padding: [8, 8, 8, 8]
      cross_axis_alignment: "start"
    children:
      - component_type: "Loop"
        properties:
          items: "{{pois}}"
          item_alias: "poi"
          separator: 8
        children:
          - component_type: "Component"
            properties:
              template_id: "PoiCardItem"
              data_binding: "{{poi}}"`
};
