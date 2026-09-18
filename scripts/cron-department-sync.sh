#!/bin/sh
# 只用 POSIX sh 语法：XXL-Job 的 GLUE(Shell) 在 Linux 上用 /bin/sh（dash）执行，
# bash 专有写法（[[ ]]、pipefail、$'...'）会导致脚本直接失败。
#
# 部门定时同步：调用应用内的 /api/cron/departments/sync
# 适用于 crontab / systemd timer / XXL-Job GLUE(Shell) / K8s CronJob
#
# 用法：
#   DEPARTMENT_SYNC_CRON_SECRET=xxx ./scripts/cron-department-sync.sh
#
# 环境变量：
#   DEPARTMENT_SYNC_CRON_SECRET  必填，与应用的 DEPARTMENT_SYNC_CRON_SECRET 一致
#   APP_BASE_URL                 可选，默认 http://127.0.0.1:5000
#   SYNC_QUERY                   可选，追加到接口后面的查询串，
#                                例如 "all=false&userBatchSize=30"（短超时调度器用）
#                                也可用第一个位置参数传（XXL-Job 的「任务参数」会传进来）
#   CURL_MAX_TIME                可选，HTTP 超时秒数，默认 300
#
# 退出码：0 成功；非 0 失败（HTTP 非 200 或网络错误），便于调度器识别任务失败

set -eu

APP_BASE_URL="${APP_BASE_URL:-http://127.0.0.1:5000}"
CURL_MAX_TIME="${CURL_MAX_TIME:-300}"
SYNC_QUERY="${1:-${SYNC_QUERY:-}}"

if [ -z "${DEPARTMENT_SYNC_CRON_SECRET:-}" ]; then
  echo "缺少环境变量 DEPARTMENT_SYNC_CRON_SECRET" >&2
  exit 2
fi

url="${APP_BASE_URL%/}/api/cron/departments/sync"
if [ -n "$SYNC_QUERY" ]; then
  url="${url}?${SYNC_QUERY}"
fi

# -L：应用开了 trailingSlash，不带尾斜杠的地址会先返回 308，不跟随就永远调不到接口
# -w：把 HTTP 状态码附在响应末尾，既保留响应体（便于排查），又能判断成败
#     （不要只用 curl -sS：那样 HTTP 4xx/5xx 的退出码仍是 0，调度器会把失败当成功）
response="$(curl -sSL --max-time "$CURL_MAX_TIME" -w '\n%{http_code}' \
  -H "X-Cron-Secret: ${DEPARTMENT_SYNC_CRON_SECRET}" \
  "$url")" || {
  echo "调用定时同步接口失败（网络错误或超时 ${CURL_MAX_TIME}s）：$url" >&2
  exit 1
}

http_code="$(printf '%s' "$response" | tail -n 1)"
body="$(printf '%s' "$response" | sed '$d')"

if [ "$http_code" != "200" ]; then
  echo "同步失败（HTTP ${http_code}）：${body}" >&2
  exit 1
fi

echo "同步成功：${body}"