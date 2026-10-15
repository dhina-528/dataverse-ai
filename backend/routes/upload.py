from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import uuid
import os
import time
from typing import Dict, Any, List, Optional
from ..services.data_processing import DataProcessor

router = APIRouter(prefix="/upload", tags=["Upload"])

# In-memory dataset store for active sessions
DATASET_STORE: Dict[str, Any] = {}


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


def load_persisted_uploads():
    """Auto-load any existing datasets from backend/uploads into DATASET_STORE."""
    if not os.path.exists(UPLOAD_DIR):
        return
    for fname in os.listdir(UPLOAD_DIR):
        if fname.startswith("."):
            continue
        filepath = os.path.join(UPLOAD_DIR, fname)
        if os.path.isfile(filepath):
            if any(d.get("filename") == fname for d in DATASET_STORE.values()):
                continue
            try:
                with open(filepath, "rb") as f:
                    content = f.read()
                df = DataProcessor.parse_file(content, fname)
                profile = DataProcessor.get_summary_profile(df)
                dataset_id = str(uuid.uuid4())[:8]
                DATASET_STORE[dataset_id] = {
                    "id": dataset_id,
                    "filename": fname,
                    "df": df,
                    "profile": profile,
                    "uploaded_at": int(os.path.getmtime(filepath)),
                    "cleaned": False
                }
            except Exception:
                pass


# Automatically load pre-existing uploaded datasets on backend startup
load_persisted_uploads()


class CleanDatasetRequest(BaseModel):
    operations: List[str]


@router.get("")
@router.get("/datasets")
async def list_datasets():
    """List all available datasets in the current session."""
    datasets = []
    for d_id, data in DATASET_STORE.items():
        profile = data.get("profile", {})
        datasets.append({
            "dataset_id": d_id,
            "filename": data.get("filename", "dataset"),
            "total_rows": profile.get("total_rows", 0),
            "total_columns": profile.get("total_columns", 0),
            "quality_score": profile.get("quality_score", 100),
            "uploaded_at": data.get("uploaded_at", 0)
        })
    return {"datasets": datasets, "count": len(datasets)}


@router.post("")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a CSV, Excel (.xlsx, .xls), TSV, or JSON dataset and generate comprehensive summary statistics."""
    try:
        raw_filename = file.filename or "dataset.csv"
        # Sanitize filename - strip directory path components
        safe_filename = os.path.basename(raw_filename.strip())

        content = await file.read()
        df = DataProcessor.parse_file(content, safe_filename)
        
        dataset_id = str(uuid.uuid4())[:8]
        profile = DataProcessor.get_summary_profile(df)
        
        # Save to store
        DATASET_STORE[dataset_id] = {
            "id": dataset_id,
            "filename": safe_filename,
            "df": df,
            "profile": profile,
            "uploaded_at": int(time.time()),
            "cleaned": False
        }

        # Persist to disk so datasets survive backend restarts
        try:
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            saved_path = os.path.join(UPLOAD_DIR, safe_filename)
            with open(saved_path, "wb") as f:
                f.write(content)
        except Exception:
            pass

        return {
            "success": True,
            "dataset_id": dataset_id,
            "filename": safe_filename,
            "profile": profile
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")


@router.get("/{dataset_id}")
async def get_dataset_summary(dataset_id: str):
    """Retrieve the summary profile for an existing dataset."""
    if dataset_id not in DATASET_STORE:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    return {
        "dataset_id": dataset_id,
        "filename": DATASET_STORE[dataset_id]["filename"],
        "profile": DATASET_STORE[dataset_id]["profile"]
    }


@router.post("/{dataset_id}/clean")
async def clean_dataset(dataset_id: str, req: CleanDatasetRequest):
    """
    Apply requested cleaning operations to the dataset.
    Recalculates quality profile and returns audit summary.
    """
    if dataset_id not in DATASET_STORE:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if not req.operations:
        raise HTTPException(status_code=400, detail="No cleaning operations were selected.")

    dataset = DATASET_STORE[dataset_id]
    original_df = dataset["df"]

    try:
        cleaned_df, summary = DataProcessor.apply_cleaning(original_df, req.operations)
        new_profile = DataProcessor.get_summary_profile(cleaned_df)

        DATASET_STORE[dataset_id]["df"] = cleaned_df
        DATASET_STORE[dataset_id]["profile"] = new_profile
        DATASET_STORE[dataset_id]["cleaned"] = True

        return {
            "success": True,
            "dataset_id": dataset_id,
            "filename": dataset["filename"],
            "summary": summary,
            "profile": new_profile
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to clean dataset: {str(e)}")


@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Remove a dataset from the in-memory store."""
    if dataset_id in DATASET_STORE:
        del DATASET_STORE[dataset_id]
        return {"success": True, "message": "Dataset removed."}
    raise HTTPException(status_code=404, detail="Dataset not found.")
