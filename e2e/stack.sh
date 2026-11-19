#!/usr/bin/env bash
# The backend half of the end-to-end stack: metu-menton-backend's own compose file, run as the project
# "metu-e2e" on ports no local stack uses, built like a server (ODTU edition, no dev profile, no persona login,
# AI off). Every run gets fresh random secrets; nothing here is a real credential.
#
#   E2E_BACKEND_DIR=../metu-menton-backend e2e/stack.sh up     # writes e2e/.stack/{backend,web}.env, waits for health
#   e2e/stack.sh down                                            # removes the containers, volumes and the app image
#
# Optional: E2E_FIREBASE_WEB_ENV points at a file with the NEXT_PUBLIC_FIREBASE_* lines of a test project.
set -euo pipefail

cd "$(dirname "$0")/.."
STATE="$PWD/e2e/.stack"
PROJECT=metu-e2e
IMAGE=metu-e2e-app:local
API_PORT="${E2E_API_PORT:-8097}"
WEB_PORT="${E2E_WEB_PORT:-3300}"

compose() {
  docker compose --project-name "$PROJECT" --env-file "$STATE/backend.env" \
    -f "${E2E_BACKEND_DIR:?set E2E_BACKEND_DIR to a metu-menton-backend checkout}/compose.yml" "$@"
}

random() { openssl rand -hex 24; }

write_env() {
  mkdir -p "$STATE"
  local service_password session_password
  service_password="$(random)"
  session_password="$(random)"
  umask 077
  cat >"$STATE/backend.env" <<ENV
APP_IMAGE=$IMAGE
APP_ENV_FILE=$STATE/backend.env
APP_PORT=$API_PORT
DATABASE_PORT=${E2E_DB_PORT:-5447}
REDIS_PORT=${E2E_REDIS_PORT:-6387}
DATABASE_NAME=menton
DATABASE_USERNAME=menton
DATABASE_PASSWORD=$(random)
SECURITY_USERNAME=e2e
SECURITY_PASSWORD=$service_password
REALTIME_TOKEN_SECRET=$(random)
APP_EDITION=ODTU
SWAGGER_ENABLED=false
INSTITUTION_LOGIN_DEV_STUB=false
OTG_LOGIN_ENABLED=false
MEETING_TRANSCRIPT_BOT_ENABLED=false
MEETING_PROVIDER_BASE_URL=
NOTIFICATION_REMINDERS_ENABLED=false
AI_PROFILE_PARSING_ENABLED=false
AI_SYLLABUS_ENABLED=false
AI_MATCHING_ENABLED=false
AI_MEETING_REPORT_ENABLED=false
AI_TASK_HANDOVER_ENABLED=false
MATCHING_PGVECTOR_ENABLED=false
AWS_REGION=eu-central-1
AWS_S3_BUCKET=
APP_PUBLIC_URL=http://127.0.0.1:$WEB_PORT
REALTIME_ALLOWED_ORIGINS=http://127.0.0.1:$WEB_PORT
DOCUMENTS_ALLOWED_ORIGINS=http://127.0.0.1:$WEB_PORT
ENV
  cat >"$STATE/web.env" <<ENV
APP_EDITION=ODTU
APP_URL=http://127.0.0.1:$WEB_PORT
BACKEND_URL=http://127.0.0.1:$API_PORT
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:$API_PORT
NEXT_PUBLIC_REALTIME_URL=ws://127.0.0.1:$API_PORT/ws
BACKEND_USERNAME=e2e
BACKEND_PASSWORD=$service_password
SESSION_PASSWORD=$session_password
NEXT_PUBLIC_ODTU_DEV_LOGIN=false
NEXT_PUBLIC_OTG_LOGIN_ENABLED=false
NEXT_TELEMETRY_DISABLED=1
E2E_WEB_URL=http://127.0.0.1:$WEB_PORT
E2E_API_URL=http://127.0.0.1:$API_PORT
ENV
  if [ -n "${E2E_FIREBASE_WEB_ENV:-}" ]; then
    grep -E '^NEXT_PUBLIC_FIREBASE_[A-Z_]+=' "$E2E_FIREBASE_WEB_ENV" >>"$STATE/web.env"
  fi
}

case "${1:-}" in
  up)
    write_env
    compose up --detach --build app postgres redis
    for _ in $(seq 1 90); do
      if curl -fsS -o /dev/null "http://127.0.0.1:$API_PORT/api/health"; then
        echo "backend healthy on :$API_PORT"
        exit 0
      fi
      sleep 4
    done
    echo "backend did not become healthy; last log lines:" >&2
    compose logs --tail 60 app >&2
    exit 1
    ;;
  down)
    if [ -f "$STATE/backend.env" ]; then
      compose down --volumes --remove-orphans
    fi
    docker image rm -f "$IMAGE" >/dev/null 2>&1 || true
    rm -rf "$STATE"
    ;;
  *)
    echo "usage: E2E_BACKEND_DIR=<backend checkout> $0 up|down" >&2
    exit 2
    ;;
esac
