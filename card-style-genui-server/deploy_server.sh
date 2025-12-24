#!/bin/bash
set -e

# 确保在脚本所在目录执行
cd "$(dirname "$0")"

echo "Using AMD64 architecture for production build..."

# 生产环境镜像构建 (AMD64)
docker build --no-cache --platform linux/amd64 --provenance=false \
       --build-arg NODE_BASE=docker.m.daocloud.io/library/node:18-alpine \
       -t registry.cn-sh-01.sensecore.cn/iag_innovation/card-style-genui-server:latest .

# 推送镜像
docker push registry.cn-sh-01.sensecore.cn/iag_innovation/card-style-genui-server:latest

echo "Build and Push Complete."
