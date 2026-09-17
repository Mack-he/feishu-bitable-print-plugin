#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    echo "Starting Next.js server on port ${DEPLOY_RUN_PORT} for deploy..."
    # 使用 Next.js 生产服务器
    PORT=${DEPLOY_RUN_PORT} npx next start
}

echo "Starting Next.js server on port ${DEPLOY_RUN_PORT} for deploy..."
start_service
