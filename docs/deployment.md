# StockLens Production Deployment

## Required Environment

Generate a production secret:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Set:

```bash
APP_ENV=production
FLASK_ENV=production
SECRET_KEY=<generated 64 character value>
SESSION_COOKIE_SECURE=1
SESSION_COOKIE_SAMESITE=Lax
SMTP_HOST=<smtp host>
SMTP_PORT=587
SMTP_USERNAME=<smtp user>
SMTP_PASSWORD=<smtp password>
SMTP_FROM=no-reply@yourdomain.example
SMTP_USE_TLS=1
```

## Install And Run

```bash
python -m venv venv
venv/bin/pip install -r requirements.txt
venv/bin/gunicorn wsgi:app --bind 0.0.0.0:${PORT:-5001} --workers 2 --threads 4
```

The `Procfile` uses the same WSGI app for platforms that support Procfile deploys.

## Email

Password reset and email verification use SMTP when `SMTP_HOST` is set. If SMTP is not configured, local development returns the generated link in the JSON response/UI so flows remain testable.

## Scheduler

For the built-in lightweight scheduler:

```bash
ENABLE_SCHEDULER=1
SCHEDULER_INTERVAL_SECONDS=86400
```

For larger deployments, run nightly forecasts through an external scheduler hitting `POST /api/pipeline/run` as a manager, or move the worker to RQ/Celery.

## Database

SQLite is supported for local/demo use. For production, migrate the schema to PostgreSQL using `migrations/postgres/001_initial.sql`, then port `database.py` and SQL placeholders to a PostgreSQL driver or SQLAlchemy before switching traffic. Do not run a multi-tenant SaaS on the bundled SQLite database.

## Backups

Back up:

- PostgreSQL or `db/stocklens.db`
- uploaded/import source files if stored outside the DB in the future
- environment configuration

## Security Checklist

- `SECRET_KEY` is unique and not the development default.
- HTTPS terminates before Flask; `SESSION_COOKIE_SECURE=1`.
- SMTP is configured for password reset and verification.
- CSRF is enabled for authenticated mutating API routes.
- Debug mode is off in production.
- Old demo/runtime files are not deployed.
