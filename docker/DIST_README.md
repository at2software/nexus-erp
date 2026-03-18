# NEXUS __VERSION__

NEXUS is an open-source project management platform.
This release package is production-ready — no build tools required.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (Engine 24+ or Docker Desktop)
- [Docker Compose](https://docs.docker.com/compose/) (v2, included with Docker Desktop)

## Quick Start

### 1. Configure your environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

| Variable | Description | Example |
|---|---|---|
| `APP_URL` | Public URL of the backend API | `http://your-server:3200/backend` |
| `ADMIN_EMAIL` | E-mail for the first admin account | `admin@example.com` |
| `ADMIN_PASSWORD` | Password for the first admin account | *(choose a strong password)* |
| `DB_PASSWORD` | MariaDB password for the nexus user | *(choose a strong password)* |
| `DB_ROOT_PASSWORD` | MariaDB root password | *(choose a strong password)* |

All other variables have sensible defaults and can be left unchanged for a first run.

### 2. Start NEXUS

```bash
docker compose up -d
```

Docker will pull the MariaDB image, build the NEXUS image, run migrations, and seed
the admin account automatically on first start. This takes about 1–2 minutes.

### 3. Open in your browser

| Service | Default URL |
|---|---|
| NEXUS frontend | http://localhost:3200 |
| Backend API | http://localhost:3200/backend |

Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you configured above.

## Authentication

NEXUS supports two authentication modes, set via `APP_AUTH` in `.env`:

| Value | Description |
|---|---|
| `token` | Built-in token authentication (default) |
| `keycloak` | Keycloak SSO — also set `KEYCLOAK_BASE_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, and `KEYCLOAK_REALM_PUBLIC_KEY` |

## Ports

| Variable | Default | Description |
|---|---|---|
| `FRONTEND_PORT` | `3200` | Port NEXUS is reachable on |
| `BACKEND_PORT` | `8000` | Direct PHP-FPM port (usually not needed externally) |
| `DB_PORT_HOST` | `3308` | MariaDB port exposed on the host (for external DB access) |

## Updating

```bash
docker compose pull   # if using a registry image
docker compose up -d --build
```

Or replace the `dist/` folder and `backend/` folder with the new release and rebuild:

```bash
docker compose up -d --build
```

Migrations run automatically on every container start.

## Data persistence

All application data is stored in named Docker volumes:

| Volume | Contents |
|---|---|
| `nexus_db_data` | MariaDB database |
| `nexus_storage_data` | Uploaded files and application storage |

To back up your data:

```bash
docker run --rm \
  -v nexus_storage_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/nexus-storage-backup.tar.gz /data
```

## Building from source

If you want to modify NEXUS, the `frontend/` and `backend/` source directories are
included in this package. The `docker/` folder also contains a `Dockerfile.src` that
performs a full multi-stage build (requires Node.js 22+ on the build machine or uses
Docker's build stage):

```bash
docker build -f docker/Dockerfile.src -t nexus:custom .
```

## Support & Contributing

- GitHub: https://github.com/at2-digital/nexus
- Issues: https://github.com/at2-digital/nexus/issues
- License: See LICENSE file
