# The web app as one container behind a reverse proxy, for servers without Amplify (the ODTÜ edition).
#
#   docker build -t menton-web:<tag> --build-arg APP_EDITION=ODTU --build-arg NEXT_PUBLIC_BACKEND_URL=https://<api> ...
#
# NEXT_PUBLIC_* values are compiled into the browser bundle by `next build`, so each deployment builds its own image
# with them as build arguments. APP_EDITION and APP_URL are build arguments too, because pages prerendered during the
# build read them, and must be set again, to the same values, when the container runs. Secrets (BACKEND_PASSWORD,
# SESSION_PASSWORD) are never build arguments: they come from the container's environment at run time only.

FROM node:24-bookworm-slim AS build

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    HUSKY=0

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG APP_EDITION=TEKNOKENT
ARG APP_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_REALTIME_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_VAPID_KEY
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS
ARG NEXT_PUBLIC_ENABLE_ENGLISH=false
ARG NEXT_PUBLIC_OTG_LOGIN_ENABLED=false
# The persona login is for a developer's machine; an image built for a server keeps it off unless asked for.
ARG NEXT_PUBLIC_ODTU_DEV_LOGIN=false

ENV APP_EDITION=$APP_EDITION \
    APP_URL=$APP_URL \
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_REALTIME_URL=$NEXT_PUBLIC_REALTIME_URL \
    NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_VAPID_KEY=$NEXT_PUBLIC_FIREBASE_VAPID_KEY \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=$NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS \
    NEXT_PUBLIC_ENABLE_ENGLISH=$NEXT_PUBLIC_ENABLE_ENGLISH \
    NEXT_PUBLIC_OTG_LOGIN_ENABLED=$NEXT_PUBLIC_OTG_LOGIN_ENABLED \
    NEXT_PUBLIC_ODTU_DEV_LOGIN=$NEXT_PUBLIC_ODTU_DEV_LOGIN

RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# next.config.ts and the modules it imports are read again by `next start`, so the sources stay next to the build.
COPY --from=build --chown=node:node /app /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/login', { redirect: 'manual' }).then((r) => process.exit(r.status < 500 ? 0 : 1), () => process.exit(1))"

CMD ["node_modules/.bin/next", "start"]
