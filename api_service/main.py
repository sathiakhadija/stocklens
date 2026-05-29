from __future__ import annotations

import os
import sqlite3
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api_service.dependencies import get_db
from api_service.schemas import (
    DecisionResponse,
    ForecastResponse,
    ForecastRunResponse,
    HealthResponse,
)
from services.forecast_service import run_forecast_for_product

_API_RESPONSE_MODELS = (ForecastRunResponse,)

app = FastAPI(
    title="StockLens Forecasting API",
    description="REST API for the StockLens inventory forecasting engine. "
    "Exposes demand forecasting, inventory metrics, and decision "
    "recommendations for retail SMEs.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _latest_forecast_row(
    db: sqlite3.Connection, product_id: int
) -> sqlite3.Row | None:
    return db.execute(
        """
        SELECT
            product_id,
            company_id,
            forecast_demand,
            safety_stock,
            reorder_point,
            order_quantity,
            risk_flag,
            model_used,
            lower_bound,
            upper_bound,
            stockout_prob,
            trend_slope,
            trend_direction,
            created_at
        FROM forecast
        WHERE product_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (product_id,),
    ).fetchone()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="StockLens Forecasting API",
        version="1.0.0",
    )


@app.post(
    "/forecast/{product_id}",
    response_model=ForecastResponse,
    tags=["Forecasting"],
    summary="Run forecast for a product",
    description="Executes the multi-model forecasting pipeline for a single "
    "product SKU. Evaluates SMA, WMA, SES, and Holt's Trend Method, selects "
    "the best model by MAE, and returns demand forecast, safety stock, reorder "
    "point, EOQ, stockout probability, and trend direction.",
)
def run_forecast(
    product_id: int,
    is_active: int = 1,
    db: sqlite3.Connection = Depends(get_db),
) -> ForecastResponse:
    run_forecast_for_product(product_id, is_active)
    row = _latest_forecast_row(db, product_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast found for product_id {product_id}",
        )
    return ForecastResponse(**dict(row))


@app.get(
    "/forecast/{product_id}/latest",
    response_model=ForecastResponse,
    tags=["Forecasting"],
    summary="Get latest forecast for a product",
)
def latest_forecast(
    product_id: int,
    db: sqlite3.Connection = Depends(get_db),
) -> ForecastResponse:
    row = _latest_forecast_row(db, product_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast found for product_id {product_id}",
        )
    return ForecastResponse(**dict(row))


@app.get(
    "/decisions/{company_id}",
    response_model=list[DecisionResponse],
    tags=["Decisions"],
    summary="Get current decisions for a company",
    description="Returns the most recent inventory decision for each product "
    "in a company. Actions: REORDER, AT_RISK, HOLD, INACTIVE.",
)
def company_decisions(
    company_id: int,
    db: sqlite3.Connection = Depends(get_db),
) -> list[DecisionResponse]:
    rows = db.execute(
        """
        SELECT
            product_id,
            company_id,
            action,
            reason AS reasoning,
            created_at
        FROM decisions
        WHERE company_id = ?
          AND decision_id IN (
              SELECT MAX(decision_id)
              FROM decisions
              WHERE company_id = ?
              GROUP BY product_id
          )
        ORDER BY created_at DESC
        """,
        (company_id, company_id),
    ).fetchall()
    return [DecisionResponse(**dict(row)) for row in rows]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api_service.main:app", host="0.0.0.0", port=8000, reload=True)
