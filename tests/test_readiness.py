import os
import subprocess
import sys


def test_public_recovery_and_legal_pages_load():
    from src.core.app import create_app

    app = create_app()
    client = app.test_client()

    for path in [
        "/forgot-password",
        "/reset-password/test-token",
        "/verify-email/test-token",
        "/privacy",
        "/terms",
        "/contact",
    ]:
        response = client.get(path)
        assert response.status_code == 200


def test_production_requires_secret_key():
    env = os.environ.copy()
    env.pop("SECRET_KEY", None)
    env["APP_ENV"] = "production"
    env["FLASK_ENV"] = "production"

    result = subprocess.run(
        [sys.executable, "-c", "import src.core.config"],
        cwd=os.getcwd(),
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    assert "SECRET_KEY must be set in production" in result.stderr


def test_authenticated_mutations_require_csrf():
    from src.core.app import create_app

    app = create_app()
    client = app.test_client()

    login = client.post(
        "/api/login",
        json={"email": "manager1@stocklens.local", "password": "pass123"},
    )
    assert login.status_code == 200
    client.get("/dashboard")
    with client.session_transaction() as session:
        token = session["csrf_token"]

    blocked = client.post("/api/company/settings", json={"currency_symbol": "£"})
    assert blocked.status_code == 403

    allowed = client.post(
        "/api/company/settings",
        json={"currency_symbol": "£"},
        headers={"X-CSRF-Token": token},
    )
    assert allowed.status_code == 200
