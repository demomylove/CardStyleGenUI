Card-Style-GenUI-Server：构建 / 推送 / 验证指南

概览
- 技术栈：Node 18、Express、TypeScript
- 主要接口：
  - GET /health → 返回 200，文本：AG-UI Server is running
  - POST /api/chat → SSE 流（Server‑Sent Events），按 AG‑UI 事件协议返回，最后以 data: [DONE] 结束
- 运行模式：
  - 真实 LLM（DeepSeek）：默认，环境变量 LLM_USE_MOCK=false
  - Mock：返回固定示例 DSL，LLM_USE_MOCK=true

前置条件
- 已安装 Docker Desktop，并启用 buildx（docker buildx ls 能看到 desktop-linux 等 builder）
- 有权访问镜像仓库：registry.cn-sh-01.sensecore.cn（必要时 docker login 登录）
- 可选：使用国内基础镜像源 docker.m.daocloud.io 提升构建稳定性

编译 TypeScript
```
cd card-style-genui-server
npm run build
```

Docker 构建与推送（推荐：密钥只在运行时注入，不写入镜像）
- 原则：仅用 build-arg 选择基础镜像；DeepSeek 的密钥用运行时环境变量传入。
```
# 生产镜像（体积小，不含调试工具）
docker buildx build --builder desktop-linux --platform linux/amd64 \
  --build-arg NODE_BASE=docker.m.daocloud.io/library/node:18-alpine \
  -t registry.cn-sh-01.sensecore.cn/iag_innovation/card-style-genui-server:latest \
  -f card-style-genui-server/Dockerfile card-style-genui-server \
  --push --provenance=false --sbom=false

# 调试镜像（可选；内置 curl/bash/vim 等，体积更大）
docker buildx build --builder desktop-linux --platform linux/amd64 \
  --build-arg NODE_BASE=docker.m.daocloud.io/library/node:18-bookworm-slim \
  --build-arg INCLUDE_DEBUG_TOOLS=true \
  -t registry.cn-sh-01.sensecore.cn/iag_innovation/card-style-genui-server:debug \
  -f card-style-genui-server/Dockerfile card-style-genui-server \
  --push --provenance=false --sbom=false
```

运行时环境变量（强烈推荐）
- 真实 LLM：
  - LLM_USE_MOCK=false
  - DEEPSEEK_API_KEY=sk-******（不要写入代码/镜像）
  - 可选 DEEPSEEK_API_ENDPOINT=https://api.deepseek.com/chat/completions
- Mock：
  - LLM_USE_MOCK=true（无需密钥）

本地运行示例
```
# 真实 LLM（将 <YOUR_KEY> 替换为真实 Key）
docker run -d --name local-server -p 3000:3000 --platform linux/amd64 \
  -e LLM_USE_MOCK=false \
  -e DEEPSEEK_API_KEY='<YOUR_KEY>' \
  registry.cn-sh-01.sensecore.cn/iag_innovation/card-style-genui-server:latest

# Mock
docker run -d --name local-server-mock -p 3001:3000 --platform linux/amd64 \
  -e LLM_USE_MOCK=true \
  registry.cn-sh-01.sensecore.cn/iag_innovation/card-style-genui-server:latest
```

请求验证（Health & SSE）
```
# 健康检查（当前环境）
curl -v http://10.210.0.58:3001/health
# 预期：200 OK，正文 "AG-UI Server is running"

# SSE（务必使用 HTTP/1.1；带上 JSON 和 SSE 头）
curl -N --http1.1 \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"messages":[{"role":"user","content":"给我生成一个简单卡片UI"}],"state":{"dataContext":{"title":"demo"}}}' \
  http://10.210.0.58:3001/api/chat
# 预期：持续输出 data: { ... } 事件，最后一行 data: [DONE]
```

云端发布要点（Ingress / NodePort / Nginx）
- 必须有真实的对外入口（SLB/Ingress/NodePort）将外部端口转发到容器 3000。
- Nginx/Ingress 代理 SSE 必须：
  - proxy_http_version 1.1
  - proxy_buffering off
  - proxy_read_timeout 3600s
- 健康检查路径：/health

常见问题排查
- 外网访问出现 Empty reply from server：
  - 端口未真正暴露；创建 NodePort/Ingress/SLB 并放通安全组。
  - 先在宿主机验证：curl -v http://127.0.0.1:3000/health
- SSE 没输出或断开：
  - 代理未按 SSE 配置；加 --http1.1，并在代理关闭缓冲。
- 一直是 Mock：
  - 检查环境：echo $LLM_USE_MOCK（真实需为 false）
  - 检查密钥：node -e "console.log(!!process.env.DEEPSEEK_API_KEY)"
  - 容器出网：curl https://api.deepseek.com（不带 Authorization 预期 401，证明 TLS/出网正常）
  - 查看服务日志是否有 "LLM Request Failed"（真实调用失败会回退 Mock）

安全建议
- DEEPSEEK_API_KEY 优先使用运行时环境变量/Secret 注入；不要写入 Dockerfile/镜像。
- 日志中避免打印敏感信息。

Registry 速查
```
# 登录（如需）
docker login registry.cn-sh-01.sensecore.cn

# 若本地已有镜像，打 tag 后推送
docker tag local/card-style-genui-server:dev \
  registry.cn-sh-01.sensecore.cn/iag_innovation/card-style-genui-server:latest
docker push registry.cn-sh-01.sensecore.cn/iag_innovation/card-style-genui-server:latest
```
