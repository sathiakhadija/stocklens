import pytest
from starlette.testclient import TestClient

from api_service.main import app

pytestmark = pytest.mark.filterwarnings("ignore::DeprecationWarning")

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "StockLens Forecasting API"


def test_forecast_invalid_product():
    response = client.post("/forecast/999999")
    assert response.status_code == 404


def test_decisions_empty_company():
    response = client.get("/decisions/999999")
    assert response.status_code == 200
    assert response.json() == []
