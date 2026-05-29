# Production Queue Upgrade

The current app has durable `pipeline_jobs` rows and a local worker thread. That is acceptable for demos and single-process deployments, but not for multi-server production.

Recommended production shape:

1. Add Redis.
2. Move `_create_pipeline_job` worker execution to RQ or Celery.
3. Keep `pipeline_jobs` as the user-facing job status table.
4. Have workers update `pipeline_jobs.status`, `products_processed`, `error`, and `finished_at`.
5. Keep the frontend polling `/api/pipeline/jobs/<job_id>`.

This preserves the API contract added in this readiness pass while replacing local threads with durable workers.
