# StartupBridge

StartupBridge helps founders connect with sponsors, developers, and mentors.
This repository contains a Django REST API and a separate React/Vite web app.

> **Backend guide.** For frontend setup and pages, see
> [frontend/README.md](./frontend/README.md).

## Features

- JWT-based account registration and authentication
- Founder-managed startup listings with search, stage filters, and pagination
- Country-scoped startup discovery and connection requests for sponsors
- Connection requests with selectable interests and founder decisions
- Messaging between participants after a request is accepted
- User profiles with role, skills, bio, and organization details

## Technology

- Python, Django, Django REST Framework
- PostgreSQL
- Simple JWT authentication
- React and Vite frontend

## Backend setup

### Requirements

- Python and pip
- PostgreSQL

Create and activate a virtual environment from the repository root:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

On macOS or Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install the Python dependencies:

```bash
python -m pip install -r requirements.txt
```

### Configure the database

Django settings load environment variables from a root-level `.env` file.
Create one with the connection details for a local PostgreSQL database:

```dotenv
DJANGO_DEBUG=true
DJANGO_SECRET_KEY=replace-with-a-local-development-secret
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=startupbridge
DB_USER=postgres
DB_PASSWORD=your-local-postgres-password
DB_HOST=localhost
DB_PORT=5432
```

Create the database and database user in PostgreSQL before migrating. Keep
`.env` private; never commit credentials or production secrets.

### Initialize and run

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API is available at `http://localhost:8000/api/`, and the Django admin is
at `http://localhost:8000/admin/`.

## API overview

All API routes are under `/api/`.

| Route | Purpose |
| --- | --- |
| `POST /auth/register/` | Create an account and profile |
| `POST /auth/token/` | Obtain JWT access and refresh tokens |
| `POST /auth/token/refresh/` | Refresh an access token |
| `GET`, `PATCH /profile/me/` | Read or update the signed-in user's profile |
| `/startups/` | Discover, create, update, and retrieve startup listings |
| `/startups/mine/` | List the signed-in founder's startup listings |
| `/startups/{id}/interest/` | Send a connection request to a startup |
| `/connections/` | List requests; use `?direction=sent` or `?direction=received` to filter |
| `/connections/{id}/respond/` | Accept or reject a pending request |
| `/connections/{id}/messages/` | Read or send messages in an accepted connection |

Protected endpoints expect an `Authorization: Bearer <access-token>` header.
List responses use page-number pagination with `count`, `next`, `previous`, and
`results`. The default page size is 20; clients may request up to 100 items with
`?page_size=100`.

Sponsors can discover and request connections to startups whose founder has
the same registered country code. This MVP uses the founder's country as the
startup's country.

## Checks and tests

```bash
python manage.py check
python manage.py test
```

Before deployment, also run:

```bash
python manage.py check --deploy
```

## Deployment

The repository includes a Render Blueprint in `render.yaml` for the Django API
and a Vercel SPA rewrite in `frontend/vercel.json` for React Router deep links.
Deploy the backend and frontend separately, and use a managed PostgreSQL
database for `DATABASE_URL` (for example, a hosted PostgreSQL provider).

### Django API on Render

1. Create a managed PostgreSQL database and copy its private connection URL.
2. Deploy this repository as a Render Blueprint. The service builds static
   files with WhiteNoise and runs database migrations before starting Gunicorn.
3. In the API service's environment, set `DATABASE_URL` to the database URL
   and `DJANGO_CORS_ALLOWED_ORIGINS` to the exact HTTPS origin of the frontend
   (for example, `https://your-app.vercel.app`, with no trailing slash).
4. Confirm `DJANGO_ALLOWED_HOSTS` matches the API hostname. The Blueprint
   defaults to `startupbridge-api.onrender.com`; update it if the service or
   custom domain uses another hostname.

The Blueprint generates `DJANGO_SECRET_KEY` and enables production security
settings. Do not reuse the development key or commit deployment secrets.

### React frontend on Vercel

1. Import the repository and set the Vercel project's **Root Directory** to
   `frontend`.
2. Use `npm run build` as the build command and `dist` as the output directory.
3. Set `VITE_API_BASE_URL` to the complete HTTPS API URL ending in `/api`,
   such as `https://startupbridge-api.onrender.com/api`.
4. Redeploy after setting environment variables. The Vercel rewrite serves the
   SPA for nested routes such as `/dashboard` and `/startups/<id>`.

The Vite `VITE_*` setting is embedded into the public frontend build; never put
secrets in it. Free hosting plans can sleep or impose quotas, so they are
appropriate for a demo/MVP but not a reliability guarantee for production
traffic. Set up database backups and test restore before accepting important
user data.

## Deployment configuration

Set deployment configuration in the hosting environment or a protected
environment file. Production settings require:

| Variable | Purpose |
| --- | --- |
| `DJANGO_DEBUG` | Set to `false` in production |
| `DJANGO_SECRET_KEY` | Unique secret key for the deployment |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated API hostnames |
| `DJANGO_CORS_ALLOWED_ORIGINS` | Comma-separated HTTPS frontend origins |
| `DATABASE_URL` | PostgreSQL connection URL; SSL is required when `DEBUG` is false |
| `DB_NAME` | PostgreSQL database name when `DATABASE_URL` is not used |
| `DB_USER` | PostgreSQL user when `DATABASE_URL` is not used |
| `DB_PASSWORD` | PostgreSQL password when `DATABASE_URL` is not used |

Other supported settings:

| Variable | Purpose |
| --- | --- |
| `DB_HOST`, `DB_PORT` | Database host and port when `DATABASE_URL` is not used; default to `localhost` and `5432` |
| `DJANGO_CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Comma-separated trusted origins for CSRF-protected pages |
| `DJANGO_USE_X_FORWARDED_PROTO` | Trust a sanitized `X-Forwarded-Proto` header from a trusted proxy |
| `DJANGO_SECURE_HSTS_SECONDS` | HSTS duration in seconds; defaults to one year in production |
| `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS` | Enable HSTS for all subdomains; opt in only when appropriate |
| `DJANGO_SECURE_HSTS_PRELOAD` | Enable HSTS preload; opt in only when domain requirements are met |

Email uses Django's console backend unless `DJANGO_EMAIL_HOST` is set. To send
email, configure `DJANGO_EMAIL_HOST`, `DJANGO_EMAIL_PORT`,
`DJANGO_EMAIL_USER`, `DJANGO_EMAIL_PASSWORD`, `DJANGO_EMAIL_USE_TLS` or
`DJANGO_EMAIL_USE_SSL`, and optionally `DJANGO_DEFAULT_FROM_EMAIL`. TLS and SSL
cannot both be enabled.

Generate a production secret with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Store the value in a secret manager rather than in source control. Serve the
application over HTTPS. When TLS terminates at a reverse proxy, configure that
trusted proxy to preserve the original scheme before enabling
`DJANGO_USE_X_FORWARDED_PROTO`.
