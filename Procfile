web: gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
api: uvicorn api_service.main:app --host 0.0.0.0 --port 8000 --workers 2
