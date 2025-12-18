<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap');
body {
    font-family: 'Noto Sans SC', sans-serif;
}
</style>

# Generative UI 的 Prompt Engineering 工程化指南

## 1. 核心理念：Prompt 即编译器

在 Generative UI (生成式 UI) 系统中，大模型 (LLM) 扮演的角色不仅仅是“对话者”，而是一个**实时编译器**。
*   **源代码 (Source Code)**: 用户的自然语言指令 (User Query) + 业务数据 (Data)。
*   **编译器 (Compiler)**: 大模型 (LLM) + Prompt Engineering。
*   **目标代码 (Target Code)**: 结构化的 UI 描述语言 (DSL JSON/YAML)。
*   **运行时 (Runtime)**: 前端的渲染引擎 (DslRenderer)。

实现 Generative UI 的关键，在于如何设计一套**确定性高、鲁棒性强**的 Prompt 工程体系，让大模型稳定地输出符合规范的 DSL。

## 2. Prompt 架构设计

一个成熟的 Generative UI Prompt 通常包含以下五个核心模块：

### 2.1 角色定义 (Role Definition)
设定 LLM 的身份，确立其思维模式。
> "你是一个精通移动端 UX 设计的专家，擅长使用预定义的组件库构建美观、易用的界面。"

### 2.2 组件库文档 (Component Library / Schema)
这是 Prompt 中最重要的部分。你需要将前端支持的所有组件（DSL 定义）“教”给大模型。这相当于给程序员提供 API 文档。

**技巧：使用 TypeScript 接口定义**
大模型对 TypeScript 接口的理解能力极强。
```typescript
// Prompt 示例片段
interface UIComponent {
  type: "Column" | "Row" | "Text" | "Image" | "Card";
  props: Record<string, any>;
  children?: UIComponent[];
}

interface TextProps {
  content: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}
// ... 列出所有可用组件及其属性
```

### 2.3 业务数据注入 (Data Context)
UI 是数据的载体。必须将当前的业务数据清晰地传给 LLM，让它知道要展示什么。
> "当前业务数据 (JSON): { "weather": { "city": "Shanghai", "temp": 25 } }"

### 2.4 任务指令 (Task Instruction)
明确具体的生成目标。
> "请根据上述业务数据，设计一个天气展示卡片。使用 Column 布局，包含城市名和温度。"

### 2.5 输出规范 (Output Formatting)
强制约束输出格式，确保机器可读。
> "仅输出合法的 JSON 代码，不要包含任何 Markdown 标记或解释性文字。"

## 3. 实战 Prompt 模板 (示例)

以下是一个可以直接用于您工程的 Prompt 模板结构：

```markdown
# Role
You are a UI Generator for a React Native app. You output JSON DSL based on the provided Component Library.

# Component Library (DSL Schema)
The following components are available:
- Column: { children: Component[], gap: number }
- Row: { children: Component[], justifyContent: 'flex-start' | 'center' | 'space-between' }
- Text: { text: string, fontSize: number, color: string, bold: boolean }
- Image: { url: string, width: number, height: number }
- Card: { children: Component[], padding: number, backgroundColor: string }

# Constraints
1. You MUST ONLY use the components listed above.
2. Do not invent new properties.
3. The output must be a valid JSON object representing the root component.

# User Context
User Query: "帮我把这个天气信息展示得好看一点，用卡片风格"
Data: {
  "city": "Beijing",
  "condition": "Sunny",
  "temperature": "28°C"
}

# Output Format
Return ONLY the JSON string.
```

## 4. 进阶技巧 (Advanced Techniques)

### 4.1 Few-Shot Prompting (少样本提示)
给大模型提供 1-3 个 "输入 -> 输出" 的高质量示例。这是提高生成稳定性的最有效手段。
> **Example 1:**
> Input: "显示一个标题"
> Output: { "type": "Text", "props": { "text": "标题", "fontSize": 20, "bold": true } }

### 4.2 Chain of Thought (思维链)
让大模型在生成 JSON 之前，先用自然语言描述一下设计思路。这能显著提升复杂 UI 的逻辑合理性。
> "请先简要描述你的布局策略（例如：'我将使用垂直布局，顶部放图片，底部放文字'），然后再输出 JSON。"
> *(注意：解析时需要通过正则提取 JSON 部分)*

### 4.3 Self-Correction (自修正机制)
在工程实现中，如果 `DslParser` 解析 JSON 失败（例如属性名错误），可以将错误信息回传给 LLM 进行重试。
> "你生成的 JSON 有误：'Text' 组件不支持 'font-weight' 属性，请修正为 'bold' 并重新输出。"

### 4.4 动态 Schema (Dynamic Schema)
如果组件库非常大，不要把所有组件都塞进 Prompt（会消耗 Token 且干扰注意力）。
**策略**：先通过一个小模型判断用户意图（例如“这是天气场景”），然后只将“天气相关组件”和“基础布局组件”的定义注入到 Prompt 中。

## 5. 工程化落地路线图

1.  **定义 DSL**: 完善 `src/dsl/WidgetMapper.tsx`，确定支持的组件全集。
2.  **构建 Prompt Builder**: 编写一个函数，将 DSL Schema、用户 Query、业务 Data 动态拼装成最终的 Prompt 字符串。
3.  **接入 LLM**: 使用支持 JSON Mode 的模型（如 GPT-4o, Gemini 1.5 Pro），设置 `response_format: { type: "json_object" }`。
4.  **解析与渲染**: 接收 JSON -> `DslParser` -> `DslRenderer` -> 界面呈现。

通过这套工程化体系，您就实现了一个真正的 **Generative UI 系统**，它比 `autoview` 更轻量，且完美适配您的 React Native 环境。
