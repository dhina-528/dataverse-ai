from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid
from typing import Dict, Any
from ..services.data_processing import DataProcessor

router = APIRouter(prefix="/upload", tags=["Upload"])

# In-memory dataset store for active sessions
DATASET_STORE: Dict[str, Any] = {}


@router.post("")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a CSV, TSV, or JSON dataset and generate comprehensive summary statistics."""
    try:
        content = await file.read()
        df = DataProcessor.parse_file(content, file.filename)
        
        dataset_id = str(uuid.uuid4())[:8]
        profile = DataProcessor.get_summary_profile(df)
        
        # Save to store
        DATASET_STORE[dataset_id] = {
            "id": dataset_id,
            "filename": file.filename,
            "df": df,
            "profile": profile
        }

        return {
            "success": True,
            "dataset_id": dataset_id,
            "filename": file.filename,
            "profile": profile
        }
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
