from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from .upload import DATASET_STORE
from ..services.analytics import AnalyticsEngine

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class DashboardQueryRequest(BaseModel):
    mappings: Optional[Dict[str, Optional[str]]] = None
    filters: Optional[Dict[str, Any]] = None


@router.get("/{dataset_id}/correlations")
async def get_correlations(dataset_id: str):
    """Compute correlation matrix for numeric columns in dataset."""
    if dataset_id not in DATASET_STORE:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    df = DATASET_STORE[dataset_id]["df"]
    return AnalyticsEngine.compute_correlations(df)


@router.get("/{dataset_id}/distribution")
async def get_column_distribution(
    dataset_id: str,
    column: str = Query(..., description="Column name to analyze"),
    bins: int = Query(10, ge=3, le=50)
):
    """Compute distribution or frequency breakdown for a specified column."""
    if dataset_id not in DATASET_STORE:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    df = DATASET_STORE[dataset_id]["df"]
    res = AnalyticsEngine.compute_distribution(df, column, bins)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@router.get("/{dataset_id}/anomalies")
async def get_anomalies(
    dataset_id: str,
    threshold: float = Query(2.5, ge=1.0, le=5.0)
):
    """Identify statistical anomalies and outliers in the dataset."""
    if dataset_id not in DATASET_STORE:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    df = DATASET_STORE[dataset_id]["df"]
    anomalies = AnalyticsEngine.detect_anomalies(df, z_threshold=threshold)
    return {"anomalies": anomalies, "count": len(anomalies)}


@router.get("/{dataset_id}/columns")
async def get_dataset_columns(dataset_id: str):
    """Retrieve auto-detected semantic column mappings and candidates."""
    if dataset_id not in DATASET_STORE:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    df = DATASET_STORE[dataset_id]["df"]
    return AnalyticsEngine.detect_semantic_columns(df)


@router.get("/{dataset_id}/dashboard")
async def get_dashboard_metrics(
    dataset_id: str,
    category: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Retrieve full dashboard KPI telemetry and dynamic charts with query filters."""
    if dataset_id not in DATASET_STORE:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = DATASET_STORE[dataset_id]["df"]
    filters = {}
    if category:
        filters["category"] = category
    if region:
        filters["region"] = region
    if date_from:
        filters["date_from"] = date_from
    if date_to:
        filters["date_to"] = date_to

    return AnalyticsEngine.compute_dashboard_metrics(df, filters=filters)


@router.post("/{dataset_id}/dashboard")
async def post_dashboard_metrics(dataset_id: str, req: DashboardQueryRequest):
    """Retrieve dashboard metrics with custom user column mappings and filters."""
    if dataset_id not in DATASET_STORE:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = DATASET_STORE[dataset_id]["df"]
    return AnalyticsEngine.compute_dashboard_metrics(
        df,
        mappings=req.mappings,
        filters=req.filters
    )
