import time

from database import get_db


def check_rate_limit(scope, key, max_attempts=10, window_seconds=300):
    now = int(time.time())
    cutoff = now - int(window_seconds)
    bucket_key = f"{scope}:{key or 'unknown'}"

    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM rate_limits WHERE created_at < ?", (cutoff,))
    c.execute(
        "SELECT COUNT(*) AS n FROM rate_limits WHERE bucket_key = ? AND created_at >= ?",
        (bucket_key, cutoff),
    )
    attempts = c.fetchone()['n']
    if attempts >= max_attempts:
        conn.commit()
        conn.close()
        return False
    c.execute(
        "INSERT INTO rate_limits (bucket_key, created_at) VALUES (?, ?)",
        (bucket_key, now),
    )
    conn.commit()
    conn.close()
    return True
