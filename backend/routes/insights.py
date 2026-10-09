import os
import requests
import json
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from .upload import DATASET_STORE
from ..services.analytics import AnalyticsEngine

router = APIRouter(prefix="/insights", tags=["AI Insights"])

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")


class AIQueryRequest(BaseModel):
    dataset_id: Optional[str] = None
    prompt: str = Field(..., min_length=1, max_length=2000)
    model: str = "llama3.2"


@router.get("/status")
async def get_ollama_status(model: str = Query("llama3.2", min_length=1)):
    """Check actual local Ollama server status and fetch list of downloaded models."""
    try:
        res = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=2)
        if res.status_code == 200:
            data = res.json()
            models_list = [m.get("name") for m in data.get("models", []) if m.get("name")]
            selected_model_available = any(
                model_name == model or model_name.startswith(f"{model}:")
                for model_name in models_list
            )
            return {
                "status": "connected",
                "endpoint": OLLAMA_HOST,
                "models": models_list,
                "total_models": len(models_list),
                "selected_model": model,
                "model_available": selected_model_available,
                "message": "Local Ollama daemon is active and responding."
            }
        else:
            return {
                "status": "error",
                "endpoint": OLLAMA_HOST,
                "models": [],
                "selected_model": model,
                "model_available": False,
                "message": f"Ollama returned HTTP status {res.status_code}."
            }
    except requests.exceptions.RequestException as e:
        return {
            "status": "offline",
            "endpoint": OLLAMA_HOST,
            "models": [],
                "selected_model": model,
                "model_available": False,
            "message": "Ollama is not running on the local host. Run 'ollama serve' or 'ollama run llama3.2' to enable local LLM generation."
        }


@router.post("/query")
async def generate_insights(req: AIQueryRequest):
    """
    Process user query by combining deterministic Pandas computations with
    local Ollama AI reasoning.
    """
    cleaned_prompt = req.prompt.strip()
    if not cleaned_prompt:
        raise HTTPException(status_code=400, detail="Query prompt cannot be empty.")

    # Check if dataset is provided
    if not req.dataset_id or req.dataset_id not in DATASET_STORE:
        return {
            "source": "system",
            "model": req.model,
            "has_dataset": False,
            "response": (
                "### ℹ️ No Active Dataset Selected\n\n"
                "Please upload or select a dataset in the **Data Analysis Studio** first. "
                "Once a dataset is active, I will compute exact numerical aggregations, rankings, and statistical distributions."
            ),
            "calculated_facts": []
        }

    dataset_entry = DATASET_STORE[req.dataset_id]
    df = dataset_entry["df"]
    profile = dataset_entry["profile"]

    # Step 1: Compute Deterministic Calculations using Pandas
    calc_results = AnalyticsEngine.answer_deterministic_query(df, cleaned_prompt)
    facts_list = calc_results.get("calculated_facts", [])
    facts_text = "\n".join(facts_list)

    # Step 2: Attempt Ollama generative analysis if online
    ollama_response_text = None
    ollama_error = None

    context_summary = {
        "filename": dataset_entry["filename"],
        "rows": profile["total_rows"],
        "columns": [c["name"] for c in profile["columns"]],
        "missing_rate": f"{profile['missing_rate']}%",
        "duplicate_rows": profile["duplicate_rows"],
    }

    try:
        system_instruction = (
            "You are Dataverse AI, an expert enterprise data scientist. "
            "Analyze the user query based ONLY on the provided calculated data facts and schema below. "
            "Do NOT invent fictional numbers or hallucinations. Distinguish calculated metrics from strategic advice. "
            "Use clear Markdown bullets."
        )

        ollama_prompt = (
            f"Dataset Summary: {json.dumps(context_summary)}\n"
            f"Calculated Facts from Dataset:\n{facts_text}\n\n"
            f"User Question: {cleaned_prompt}\n\n"
            "Provide concise executive interpretation and recommendations based on these facts."
        )

        payload = {
            "model": req.model,
            "prompt": ollama_prompt,
            "system": system_instruction,
            "stream": False,
            "options": {"temperature": 0.2}
        }

        res = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=10)
        if res.status_code == 200:
            ollama_response_text = res.json().get("response", "").strip()
    except Exception as ex:
        ollama_error = str(ex)

    # Step 3: Synthesize output clearly separating Calculated Facts vs AI Interpretation
    response_sections = []
    
    if facts_list:
        response_sections.append("### 📈 Calculated Data Facts (Deterministic Backend Engine)")
        response_sections.append(facts_text)

    if ollama_response_text:
        response_sections.append("\n### 🧠 AI Executive Reasoning (Ollama LLM)")
        response_sections.append(ollama_response_text)
    else:
        response_sections.append("\n### ℹ️ Local AI Status")
        response_sections.append(
            f"*(Ollama local LLM is currently offline or unreachable at `{OLLAMA_HOST}`. "
            "All figures above were verified and computed deterministically via Pandas. "
            "To enable generative LLM summaries, run `ollama run llama3.2`.)*"
        )

    full_response = "\n\n".join(response_sections)

    return {
        "source": "ollama" if ollama_response_text else "deterministic_engine",
        "model": req.model,
        "has_dataset": True,
        "dataset_name": dataset_entry["filename"],
        "response": full_response,
        "calculated_facts": facts_list,
        "ollama_online": ollama_response_text is not None
    }
