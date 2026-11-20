#!/usr/bin/env bash
# The backend half of the end-to-end stack: metu-menton-backend's own compose file, run as the project
# "metu-e2e" on ports no local stack uses, with AI off and fresh random secrets on every run.
#
#   E2E_BACKEND_DIR=../metu-menton-backend e2e/stack.sh up     # writes e2e/.stack/{backend,web}.env, waits for health
#   E2E_BACKEND_DIR=../metu-menton-backend e2e/stack.sh down   # removes the containers, volumes and the app image
#
# E2E_MODE picks how it is built:
#   gates (default)  like a server: no dev profile, no persona login, no Firebase. The edition-gate specs.
#   flows            the persona login on, signed in through a Firebase *test* project. The *.flow.spec.ts specs.
#                    Needs the test project's service account, as E2E_FIREBASE_CREDENTIALS_FILE (a path) or
#                    E2E_FIREBASE_CREDENTIALS_JSON (the JSON), and its web config, as E2E_FIREBASE_WEB_ENV (a file
#                    of NEXT_PUBLIC_FIREBASE_* lines) or E2E_FIREBASE_API_KEY, _AUTH_DOMAIN, _PROJECT_ID, _APP_ID.
#                    The key only ever goes into e2e/.stack/backend.env (owner-only, git-ignored, removed by down).
#                    It also makes the admin and coordinator logins (e2e/support/staff-logins.mjs): fixed uids in
#                    the test project, bootstrapped as staff, their passwords in e2e/.stack/web.env.
set -euo pipefail

cd "$(dirname "$0")/.."
STATE="$PWD/e2e/.stack"
PROJECT=metu-e2e
IMAGE=metu-e2e-app:local
MODE="${E2E_MODE:-gates}"
API_PORT="${E2E_API_PORT:-8097}"
WEB_PORT="${E2E_WEB_PORT:-3300}"

compose() {
  docker compose --project-name "$PROJECT" --env-file "$STATE/backend.env" \
    -f "${E2E_BACKEND_DIR:?set E2E_BACKEND_DIR to a metu-menton-backend checkout}/compose.yml" "$@"
}

random() { openssl rand -hex 24; }

# One line of JSON, written straight to the env file: the key is never echoed.
service_account_json() {
  if [ -n "${E2E_FIREBASE_CREDENTIALS_FILE:-}" ]; then
    python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1])), separators=(",", ":")))' \
      "$E2E_FIREBASE_CREDENTIALS_FILE"
  elif [ -n "${E2E_FIREBASE_CREDENTIALS_JSON:-}" ]; then
    python3 -c 'import json,os; print(json.dumps(json.loads(os.environ["E2E_FIREBASE_CREDENTIALS_JSON"]), separators=(",", ":")))'
  else
    echo "E2E_MODE=flows needs E2E_FIREBASE_CREDENTIALS_FILE or E2E_FIREBASE_CREDENTIALS_JSON" >&2
    return 1
  fi
}

firebase_web_config() {
  if [ -n "${E2E_FIREBASE_WEB_ENV:-}" ]; then
    grep -E '^NEXT_PUBLIC_FIREBASE_[A-Z_]+=' "$E2E_FIREBASE_WEB_ENV"
  elif [ -n "${E2E_FIREBASE_API_KEY:-}" ]; then
    printf 'NEXT_PUBLIC_FIREBASE_API_KEY=%s\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=%s\nNEXT_PUBLIC_FIREBASE_PROJECT_ID=%s\nNEXT_PUBLIC_FIREBASE_APP_ID=%s\n' \
      "$E2E_FIREBASE_API_KEY" "${E2E_FIREBASE_AUTH_DOMAIN:?}" "${E2E_FIREBASE_PROJECT_ID:?}" "${E2E_FIREBASE_APP_ID:?}"
  else
    echo "E2E_MODE=flows needs E2E_FIREBASE_WEB_ENV or E2E_FIREBASE_API_KEY and the rest of the web config" >&2
    return 1
  fi
}

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
  if [ "$MODE" = flows ]; then
    local account
    account="$(service_account_json)"
    {
      echo "SPRING_PROFILES_ACTIVE=dev"
      echo "INSTITUTION_LOGIN_DEV_STUB=true"
      # Office hours expire within seconds of becoming due, so the expiry spec does not wait five minutes.
      echo "APP_OFFICEHOURS_EXPIRY_INTERVALMS=3000"
      echo "FIREBASE_PROJECT_ID=$(printf '%s' "$account" | python3 -c 'import json,sys; print(json.load(sys.stdin)["project_id"])')"
      echo "FIREBASE_CREDENTIALS_JSON=$account"
    } >>"$STATE/backend.env"
    # The admin and coordinator the journeys sign in as (e-mail + password in the test project).
    printf '%s' "$account" | node e2e/support/staff-logins.mjs - >"$STATE/staff.env"
    grep '^APP_BOOTSTRAP_STAFF=' "$STATE/staff.env" >>"$STATE/backend.env"
    sed -i.bak '/^INSTITUTION_LOGIN_DEV_STUB=false$/d' "$STATE/backend.env" && rm -f "$STATE/backend.env.bak"
  fi
  cat >"$STATE/web.env" <<ENV
APP_EDITION=ODTU
APP_URL=http://127.0.0.1:$WEB_PORT
BACKEND_URL=http://127.0.0.1:$API_PORT
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:$API_PORT
NEXT_PUBLIC_REALTIME_URL=ws://127.0.0.1:$API_PORT/ws
BACKEND_USERNAME=e2e
BACKEND_PASSWORD=$service_password
SESSION_PASSWORD=$session_password
NEXT_PUBLIC_ODTU_DEV_LOGIN=$([ "$MODE" = flows ] && echo true || echo false)
NEXT_PUBLIC_OTG_LOGIN_ENABLED=false
NEXT_TELEMETRY_DISABLED=1
E2E_WEB_URL=http://127.0.0.1:$WEB_PORT
E2E_API_URL=http://127.0.0.1:$API_PORT
E2E_MODE=$MODE
E2E_PG_CONTAINER=$PROJECT-postgres-1
E2E_DB_USER=menton
E2E_DB_NAME=menton
ENV
  if [ "$MODE" = flows ]; then
    firebase_web_config >>"$STATE/web.env"
    grep -E '^E2E_(ADMIN|COORDINATOR)_' "$STATE/staff.env" >>"$STATE/web.env"
    rm -f "$STATE/staff.env"
  elif [ -n "${E2E_FIREBASE_WEB_ENV:-}" ]; then
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
