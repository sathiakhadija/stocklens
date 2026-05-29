"""
StockLens — project root entry point.
Run: python run.py
"""
import os

from src.core.app import create_app
from src.core.config import IS_PRODUCTION

if __name__ == '__main__':
    app = create_app()
    print("\nStockLens running at http://127.0.0.1:5001\n")
    app.run(debug=not IS_PRODUCTION, port=int(os.getenv("PORT", "5001")))
