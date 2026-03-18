#!/bin/sh
set -e

BACKEND=/var/www/backend

# ── Write .env from environment variables ─────────────────────────────────────
if [ ! -f "$BACKEND/.env" ]; then
    cp "$BACKEND/.env.example" "$BACKEND/.env"
fi

set_env() {
    local key="$1" val="$2"
    local tmp="/tmp/.env_tmp"
    grep -v "^${key}=" "$BACKEND/.env" > "$tmp" 2>/dev/null || true
    printf '%s=%s\n' "$key" "$val" >> "$tmp"
    cp "$tmp" "$BACKEND/.env"
}

set_env APP_ENV      "production"
set_env APP_DEBUG    "false"
set_env APP_URL      "${APP_URL:-http://localhost:3200/backend}"
set_env APP_DIR      "/backend"
set_env API_URL      "${APP_URL:-http://localhost:3200/backend}/api/"
set_env APP_AUTH     "${APP_AUTH:-token}"

set_env DB_HOST      "${DB_HOST:-db}"
set_env DB_PORT      "${DB_PORT:-3306}"
set_env DB_DATABASE  "${DB_DATABASE:-nexus}"
set_env DB_USERNAME  "${DB_USERNAME:-nexus}"
set_env DB_PASSWORD  "${DB_PASSWORD:-nexus}"

set_env QUEUE_CONNECTION "sync"
set_env CACHE_DRIVER     "file"
set_env SESSION_DRIVER   "file"
set_env LOG_LEVEL        "${LOG_LEVEL:-error}"

set_env MAIL_MAILER       "${MAIL_MAILER:-log}"
set_env MAIL_HOST         "${MAIL_HOST:-localhost}"
set_env MAIL_PORT         "${MAIL_PORT:-1025}"
set_env MAIL_FROM_ADDRESS "${MAIL_FROM_ADDRESS:-noreply@example.com}"

set_env KEYCLOAK_BASE_URL         "${KEYCLOAK_BASE_URL:-}"
set_env KEYCLOAK_REALM            "${KEYCLOAK_REALM:-}"
set_env KEYCLOAK_CLIENT_ID        "${KEYCLOAK_CLIENT_ID:-}"
set_env KEYCLOAK_REALM_PUBLIC_KEY "${KEYCLOAK_REALM_PUBLIC_KEY:-}"

set_env ADMIN_EMAIL    "${ADMIN_EMAIL:-admin@example.com}"
set_env ADMIN_PASSWORD "${ADMIN_PASSWORD:-changeme}"

set_env BROADCAST_CONNECTION "reverb"
set_env REVERB_APP_ID     "${REVERB_APP_ID:-nexus}"
set_env REVERB_APP_KEY    "${REVERB_APP_KEY:-nexus-key}"
set_env REVERB_APP_SECRET "${REVERB_APP_SECRET:-nexus-secret}"
set_env REVERB_HOST       "${REVERB_HOST:-0.0.0.0}"
set_env REVERB_PORT       "${REVERB_PORT:-6001}"
set_env REVERB_SCHEME     "${REVERB_SCHEME:-http}"

# Map REVERB_* → PUSHER_* so Laravel's default reverb.php/broadcasting.php configs work
set_env PUSHER_APP_ID      "${REVERB_APP_ID:-nexus}"
set_env PUSHER_APP_KEY     "${REVERB_APP_KEY:-nexus-key}"
set_env PUSHER_APP_SECRET  "${REVERB_APP_SECRET:-nexus-secret}"
set_env PUSHER_HOST        "localhost"          # used by broadcasting.php to publish events TO Reverb
set_env PUSHER_PORT        "${REVERB_PORT:-6001}"
set_env PUSHER_SCHEME      "${REVERB_SCHEME:-http}"
set_env PUSHER_SERVER_HOST "0.0.0.0"           # used by reverb.php for the server bind address
set_env PUSHER_SERVER_PORT "${REVERB_PORT:-6001}"

# ── Clear any stale bootstrap cache ──────────────────────────────────────────
rm -f "$BACKEND/bootstrap/cache/config.php" \
      "$BACKEND/bootstrap/cache/routes.php" \
      "$BACKEND/bootstrap/cache/events.php"

# ── Application key ───────────────────────────────────────────────────────────
cd "$BACKEND"

CURRENT_KEY=$(grep "^APP_KEY=" .env | cut -d= -f2)
if [ -z "$CURRENT_KEY" ]; then
    php artisan key:generate --force --quiet
fi

# ── Migrations ────────────────────────────────────────────────────────────────
# Run migrations; failures are logged but do not crash the container to avoid
# infinite restart loops caused by partially-applied DDL on failed migrations.
php artisan migrate --force 2>&1 || echo "WARNING: One or more migrations failed — check logs above."

# ── Storage symlink ───────────────────────────────────────────────────────────
php artisan storage:link --quiet 2>/dev/null || true

# ── Seed on first boot ────────────────────────────────────────────────────────
SEEDED_FLAG="$BACKEND/storage/app/.seeded"
if [ ! -f "$SEEDED_FLAG" ]; then
    php artisan db:seed --class=DatabaseSeeder --force --quiet 2>/dev/null || true
    touch "$SEEDED_FLAG"
fi

# ── Package discovery (skipped during build, run here with .env present) ─────
php artisan package:discover --ansi 2>/dev/null || true

# ── Cache ─────────────────────────────────────────────────────────────────────
php artisan config:cache --quiet
php artisan route:cache  --quiet
php artisan view:cache   --quiet

# ── Permissions ───────────────────────────────────────────────────────────────
chown -R nginx:nginx "$BACKEND/storage" "$BACKEND/bootstrap/cache"

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
