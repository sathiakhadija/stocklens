from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class ForecastResponse(BaseModel):
    product_id: int
    company_id: int
    forecast_demand: float
    safety_stock: float
    reorder_point: float
    order_quantity: int
    risk_flag: str
    model_used: str
    lower_bound: float
    upper_bound: float
    stockout_prob: float
    trend_slope: float
    trend_direction: str
    created_at: str | None = None


class DecisionResponse(BaseModel):
    product_id: int
    company_id: int
    action: str
    reasoning: str
    created_at: str | None = None


class ForecastRunResponse(BaseModel):
    product_id: int
    status: str
    message: str
