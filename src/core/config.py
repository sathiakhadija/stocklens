import os
from datetime import timedelta

# Absolute project root (two levels up from src/core/)
ROOT     = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH  = os.path.join(ROOT, 'db', 'stocklens.db')
DATA_DIR = os.path.join(ROOT, 'data')
DB_DIR   = os.path.join(ROOT, 'db')

ENV = os.getenv('FLASK_ENV', os.getenv('APP_ENV', 'development')).lower()
IS_PRODUCTION = ENV in {'production', 'prod'}

SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise RuntimeError('SECRET_KEY must be set in production. Generate one with: python -c "import secrets; print(secrets.token_hex(32))"')
    SECRET_KEY = 'dev-only-change-me'
elif IS_PRODUCTION and SECRET_KEY == 'dev-only-change-me':
    raise RuntimeError('SECRET_KEY is still the development default. Set a unique 32-byte secret before deploying.')
SESSION_LIFETIME = timedelta(hours=12)
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', '1' if IS_PRODUCTION else '0') == '1'
SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
SESSION_COOKIE_HTTPONLY = True
