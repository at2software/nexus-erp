# NEXUS

**Free, open-source business management suite for service-oriented teams.**

NEXUS combines CRM, project management, invoicing, time tracking, HR, marketing automation, uptime monitoring, and workflow automation into a single, self-hosted web application — with zero subscription fees and no paywalls.

> Built for digital agencies, IT service companies, consultancies, and software development teams.

---

## Features

| Module | What it does |
|---|---|
| **CRM** | Company and contact management, relationship mapping, revenue analytics |
| **Projects** | Gantt planning, milestones, tasks, team assignments, budget tracking |
| **Invoicing** | PDF generation, ZUGFeRD/Factur-X, recurring billing, cash flow |
| **Time Tracking** | Focus sessions, break management, workload heatmaps, billable hours |
| **HR** | Vacation, sick leave, travel expenses, team capacity analytics |
| **Marketing** | Prospect pipeline, campaign management, Sankey funnel charts |
| **Sentinels** | Visual no-code automation — triggers, conditions, commands |
| **Uptime Monitoring** | HTTP health checks with alerting via email and team chat |
| **Calendar** | CalDAV and CardDAV protocol support for universal device sync |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 19+, TypeScript, Bootstrap 5, RxJS |
| Backend | Laravel 12, PHP 8.1+, Eloquent ORM |
| Database | MySQL / MariaDB |
| Real-Time | Laravel Reverb (WebSockets) |
| Auth | Token (simple) or Keycloak SSO |
| Docker | PHP-FPM + nginx + supervisor in one container |

---

## Repository Structure

```
nexus/
├── frontend/          Angular SPA (TypeScript)
├── backend/           Laravel API (PHP)
├── docker/            Docker build files
│   ├── Dockerfile     Multi-stage build (Node → Angular, Composer → PHP)
│   ├── entrypoint.sh  Container startup (migrations, seeding, caching)
│   ├── nginx.conf     Reverse proxy config (port 3200 → Angular + backend)
│   └── supervisord.conf  PHP-FPM, nginx, queue worker, scheduler, Reverb
└── docker-compose.yml Quick-start with MariaDB included
```

---

## Running with Docker

The quickest way to get NEXUS running is with Docker Compose. This builds the application from source and starts it together with a MariaDB database.

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) (Windows / macOS) or Docker Engine + Docker Compose (Linux)
- Docker ≥ 24, Docker Compose ≥ 2
- ~4 GB RAM available to Docker
- Ports **3200** and **8000** free on the host (configurable)
- Docker Desktop must be **running** before any `docker` command (Windows/macOS: start it from the Start Menu / Applications and wait for the taskbar icon to stop animating)

### 1. Configure

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

| Variable | Description | Default |
|---|---|---|
| `ADMIN_EMAIL` | Initial admin account e-mail | `admin@example.com` |
| `ADMIN_PASSWORD` | Initial admin account password | `changeme` |
| `DB_PASSWORD` | MariaDB password for NEXUS | `nexus` |
| `DB_ROOT_PASSWORD` | MariaDB root password | `nexus_root` |

> **Important:** Change all default passwords before exposing NEXUS to a network.
> `DB_USERNAME` must not be `root` — MariaDB reserves that name.

### 2. Build and start

The first run builds the Docker image from source (Angular + PHP). This takes a few minutes.

```bash
docker compose up -d
```

Subsequent starts use the cached image and are instant.

### 3. Open in browser

| Service | URL |
|---|---|
| NEXUS | http://localhost:3200 |
| Backend API | http://localhost:8000 |

Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `.env`.

### 4. Stop

```bash
docker compose down
```

Data is stored in Docker volumes (`db_data`, `storage_data`) and survives restarts. To delete all data:

```bash
docker compose down -v
```

---

## Building the Docker Image manually

If you want to build and tag the image yourself (e.g. for a private registry):

```bash
docker build -f docker/Dockerfile -t nexus:latest .
```

The build context is the repository root. The multi-stage `Dockerfile` handles everything:
- **Stage 1** — Node.js 22: installs npm dependencies and compiles the Angular app for all locales
- **Stage 2** — PHP 8.4-FPM + nginx: installs Composer dependencies, copies the built frontend, configures the runtime

---

## Optional configuration

### Custom ports

```env
FRONTEND_PORT=3200
BACKEND_PORT=8000
DB_PORT_HOST=3308
```

### Mail

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_FROM_ADDRESS=noreply@example.com
```

### Keycloak SSO

```env
APP_AUTH=keycloak
KEYCLOAK_BASE_URL=https://keycloak.example.com
KEYCLOAK_REALM=my-realm
KEYCLOAK_CLIENT_ID=nexus
KEYCLOAK_REALM_PUBLIC_KEY=<your-public-key>
```

Leave `APP_AUTH=token` (the default) for simple token-based auth without Keycloak.

---

## Development setup

For local development without Docker, run frontend and backend separately:

**Backend** (PHP / Laravel):
```bash
cd backend
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
php artisan serve          # → http://localhost:8000
php artisan reverb:start   # WebSocket server
```

**Frontend** (Angular):
```bash
cd frontend
npm install
npx ng serve --configuration=de   # → http://localhost:4200
```

---

## License

<!-- TODO: Add license -->

---

## Contributing

<!-- TODO: Add contributing guidelines -->
