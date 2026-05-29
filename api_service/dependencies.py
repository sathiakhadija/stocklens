from __future__ import annotations

import os
import sqlite3
import sys
from typing import Generator

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import DB_PATH


def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
