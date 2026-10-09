from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from .upload import DATASET_STORE
from ..services.analytics import AnalyticsEngine

router = APIRouter(prefix="/analytics", tags=["Analytics"])


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
