# ======================
# Build Stage
# ======================
# 可参数化基础镜像，便于在受限网络下使用国内镜像源
ARG NODE_BASE=node:18-alpine
FROM ${NODE_BASE} AS builder

WORKDIR /app

# 1. 只复制依赖声明，利用缓存
COPY package.json package-lock.json ./

# 2. 使用 npm ci，保证依赖一致 & 不生成异常元数据
RUN npm ci

# 3. 再复制源码
COPY . .

# 4. 构建
RUN npm run build


# ======================
# Production Stage
# ======================
FROM ${NODE_BASE}

WORKDIR /app

ENV NODE_ENV=production

# 可选：在最终镜像中包含调试工具（仅用于排障，避免在生产长期使用）
# 用法：docker build --build-arg INCLUDE_DEBUG_TOOLS=true ...
ARG INCLUDE_DEBUG_TOOLS=false

# LLM 相关配置参数（可在构建时注入，镜像内以 ENV 持久化）
# 注意：在镜像内存放密钥有安全风险，生产建议用运行时环境变量或 Secret
ARG LLM_USE_MOCK=false
ARG DEEPSEEK_API_KEY=""
ARG DEEPSEEK_API_ENDPOINT="https://api.deepseek.com/chat/completions"
ENV LLM_USE_MOCK=${LLM_USE_MOCK}
ENV DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
ENV DEEPSEEK_API_ENDPOINT=${DEEPSEEK_API_ENDPOINT}

# 5. 只安装生产依赖（用 ci，避免 manifest 异常）
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 统一安装运行层工具，优先使用国内镜像源（Debian/Alpine 两类基镜自适应）
RUN if command -v apt-get >/dev/null 2>&1; then \
      set -eux; \
      echo 'deb http://mirrors.aliyun.com/debian bookworm main non-free-firmware non-free contrib' > /etc/apt/sources.list; \
      echo 'deb http://mirrors.aliyun.com/debian bookworm-updates main non-free-firmware non-free contrib' >> /etc/apt/sources.list; \
      echo 'deb http://mirrors.aliyun.com/debian-security bookworm-security main non-free-firmware non-free contrib' >> /etc/apt/sources.list; \
      apt-get update; \
      BASE_PKGS='bash ca-certificates curl sudo'; \
      DEBUG_PKGS='wget nano vim openssl netcat-openbsd iputils-ping dnsutils procps tzdata'; \
      if [ "$INCLUDE_DEBUG_TOOLS" = "true" ]; then \
        DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $BASE_PKGS $DEBUG_PKGS; \
      else \
        DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $BASE_PKGS; \
      fi; \
      update-ca-certificates; \
      rm -rf /var/lib/apt/lists/*; \
    else \
      set -eux; \
      echo 'https://mirrors.aliyun.com/alpine/v3.21/main' > /etc/apk/repositories; \
      echo 'https://mirrors.aliyun.com/alpine/v3.21/community' >> /etc/apk/repositories; \
      apk update; \
      BASE_PKGS='bash ca-certificates curl'; \
      DEBUG_PKGS='wget nano vim openssl busybox-extras iputils bind-tools procps tzdata netcat-openbsd'; \
      if [ "$INCLUDE_DEBUG_TOOLS" = "true" ]; then \
        apk add --no-cache $BASE_PKGS $DEBUG_PKGS; \
      else \
        apk add --no-cache $BASE_PKGS; \
      fi; \
      update-ca-certificates; \
    fi

# 6. 复制构建产物
COPY --from=builder /app/dist ./dist

# 7. 如果需要额外运行文件（如 public、config）
# COPY --from=builder /app/public ./public

EXPOSE 3000

# 8. 用 node 直接跑，避免 npm 子进程问题
CMD ["node", "dist/server.js"]

# 可选健康检查（容器内部访问自身 3000）
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

#（已合并到上一条 RUN 中，基于 INCLUDE_DEBUG_TOOLS 控制）