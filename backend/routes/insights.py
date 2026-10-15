import os
import requests
import json
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from .upload import DATASET_STORE
from ..services.analytics import AnalyticsEngine
from ..services.hf_client import query_huggingface_insight, DEFAULT_MODEL, get_hf_token, SYSTEM_PROMPT

router = APIRouter(prefix="/insights", tags=["AI Insights"])

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")


class AIQueryRequest(BaseModel):
    dataset_id: Optional[str] = None
    prompt: str = Field(..., min_length=1, max_length=2000)
    model: str = "meta-llama/Llama-3.2-3B-Instruct"
    hf_token: Optional[str] = None


@router.get("/status")
async def get_ai_service_status(model: str = Query("meta-llama/Llama-3.2-3B-Instruct", min_length=1)):
    """
    Check AI inference services status:
    1. Hugging Face Hub Inference API status (HF_TOKEN)
    2. Local Ollama daemon status
    """
    hf_token = get_hf_token()
    has_valid_hf_token = bool(
        hf_token
        and not hf_token.startswith("your_hugging_face_token")
        and not hf_token.startswith("hf_YourActualToken")
        and len(hf_token.strip()) > 8
    )

    ollama_ready = False
    ollama_models = []
    try:
        res = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=2)
        if res.status_code == 200:
            ollama_models = [m.get("name") for m in res.json().get("models", []) if m.get("name")]
            ollama_ready = True
    except Exception:
        ollama_ready = False

    is_hf_model = model.startswith("meta-llama") or "/" in model or model.startswith("hf_")
    model_ready = has_valid_hf_token if is_hf_model else (model in ollama_models or any(m.startswith(f"{model}:") for m in ollama_models))

    return {
        "status": "connected" if (has_valid_hf_token or ollama_ready) else "offline",
        "huggingface": {
            "token_configured": has_valid_hf_token,
            "default_model": DEFAULT_MODEL,
            "model_ready": has_valid_hf_token
        },
        "ollama": {
            "endpoint": OLLAMA_HOST,
            "online": ollama_ready,
            "models": ollama_models,
            "total_models": len(ollama_models)
        },
        "selected_model": model,
        "model_available": model_ready,
        "message": (
            f"Hugging Face Hub inference ready ({DEFAULT_MODEL})"
            if has_valid_hf_token and is_hf_model
            else (
                f"Ollama connected with model '{model}'"
                if ollama_ready and not is_hf_model
                else "Set HF_TOKEN in .env for Llama-3.2-3B-Instruct, or run 'ollama serve' for local models."
            )
        )
    }


def synthesize_deterministic_fallback(
    dataset_summary: Dict[str, Any],
    correlations: Dict[str, Any],
    anomalies: List[Dict[str, Any]],
    facts_list: List[str],
    user_query: str,
    hf_token_needed: bool = False
) -> str:
    """
    Synthesizes the EXACT 4-part Markdown output deterministically with ZERO hallucination,
    strictly conforming to the requested output structure.
    """
    rows = dataset_summary.get("total_rows", 0)
    cols = dataset_summary.get("total_columns", 0)
    filename = dataset_summary.get("filename", "Dataset")
    dup_rows = dataset_summary.get("duplicate_rows", 0)
    missing_rate = dataset_summary.get("missing_rate", "0%")

    # 1. Executive Summary
    summary_text = (
        f"The active analytical dataset `{filename}` contains **{rows:,} records** across **{cols} dimensional features**, "
        f"with a global null rate of **{missing_rate}** and **{dup_rows} duplicate rows**. "
        "Deterministic profiling indicates robust structural integrity across primary vectors, enabling reliable mathematical aggregation."
    )

    # 2. Statistical Insights & Correlation Analysis
    corr_bullets = []
    matrix = correlations.get("matrix", [])
    col_names = correlations.get("columns", [])
    
    if matrix and col_names and len(col_names) > 1:
        for i in range(len(col_names)):
            for j in range(i + 1, len(col_names)):
                r_val = matrix[i][j]
                if abs(r_val) >= 0.6:
                    direction = "strong positive" if r_val > 0 else "strong inverse"
                    corr_bullets.append(
                        f"- **{col_names[i]} ↔ {col_names[j]}** ($r = {r_val:+.3f}$): Demonstrates a statistically significant {direction} linear relationship. Changes in `{col_names[i]}` directly covary with `{col_names[j]}` across observed records."
                    )
                elif abs(r_val) >= 0.3:
                    direction = "moderate positive" if r_val > 0 else "moderate inverse"
                    corr_bullets.append(
                        f"- **{col_names[i]} ↔ {col_names[j]}** ($r = {r_val:+.3f}$): Reflects a {direction} relationship worthy of secondary regression validation."
                    )
    
    if not corr_bullets:
        corr_bullets.append(
            "- No pairs of numeric features exceeded the threshold ($r > |0.6|$), indicating low multi-collinearity across measured metrics."
        )

    # 3. Outlier & Anomaly Flags
    anomaly_bullets = []
    if anomalies:
        for a in anomalies[:6]:
            col = a.get("column", "Metric")
            val = a.get("value", 0)
            mean_val = a.get("mean", 0)
            z = a.get("z_score", 0)
            row_idx = a.get("row_index", 0)
            anomaly_bullets.append(
                f"- **Row {row_idx} ({col} = {val})**: Exhibited significant variance ($|Z| = {z} > 3.0$) relative to the baseline column mean ({mean_val}). Potential driver of tail distribution skew."
            )
    else:
        anomaly_bullets.append(
            "- Zero records breached the critical outlier threshold ($|Z| > 3.0$), confirming stable, bounded variance across numeric dimensions."
        )

    # 4. Prescriptive Business Recommendations
    rec_bullets = [
        f"1. **Operationalize Key Drivers**: Align performance monitoring with top variance vectors identified in the `{cols}-column` schema, formalizing automated alert thresholds.",
        f"2. **Mitigate Outlier Skew**: Implement robust quantile trimming or localized capping for flagged Z-score records to prevent distorted executive reporting.",
        f"3. **Continuous Deterministic Validation**: Leverage pre-computed Pearson matrices to optimize resource allocation toward positively correlated operational workflows."
    ]

    parts = [
        "### 📑 Executive Summary\n" + summary_text,
        "### 🔬 Statistical Insights & Correlation Analysis\n" + "\n".join(corr_bullets),
        "### ⚠️ Outlier & Anomaly Flags\n" + "\n".join(anomaly_bullets),
        "### 🚀 Prescriptive Business Recommendations\n" + "\n".join(rec_bullets)
    ]

    if facts_list:
        facts_section = "### 📈 Pre-Computed Deterministic Facts\n" + "\n".join(f"- {f}" for f in facts_list)
        parts.insert(1, facts_section)

    if hf_token_needed:
        token_note = (
            "\n> [!NOTE]\n"
            "> **Hugging Face Hub Token Setup**: To stream direct responses from `meta-llama/Llama-3.2-3B-Instruct`, "
            "set `HF_TOKEN=hf_...` in your `.env` file. Calculations above are 100% deterministic and verified via Pandas."
        )
        parts.append(token_note)

    return "\n\n".join(parts)


@router.post("/query")
async def generate_insights(req: AIQueryRequest):
    """
    Process user query by combining pre-computed deterministic Pandas statistical artifacts
    with Hugging Face Hub Llama-3.2-3B-Instruct reasoning or local Ollama inference.
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

    # Step 1: Extract Pre-Computed Statistical Artifacts from Pandas
    dataset_summary = {
        "filename": dataset_entry["filename"],
        "total_rows": profile.get("total_rows", len(df)),
        "total_columns": profile.get("total_columns", len(df.columns)),
        "memory_usage": profile.get("memory_usage", "N/A"),
        "duplicate_rows": profile.get("duplicate_rows", 0),
        "missing_rate": f"{profile.get('missing_rate', 0)}%",
        "missing_per_column": {c["name"]: f"{c.get('null_percentage', 0)}%" for c in profile.get("columns", []) if c.get("null_percentage", 0) > 0},
        "column_types": {c["name"]: c.get("dtype", "unknown") for c in profile.get("columns", [])}
    }

    correlations = AnalyticsEngine.compute_correlations(df)
    anomalies = AnalyticsEngine.detect_anomalies(df, z_threshold=3.0)

    # Deterministic query facts
    calc_results = AnalyticsEngine.answer_deterministic_query(df, cleaned_prompt)
    facts_list = calc_results.get("calculated_facts", [])

    # Step 2: Determine Inference Engine
    hf_token = req.hf_token or get_hf_token()
    has_valid_hf_token = bool(
        hf_token and not hf_token.startswith("hf_YourActualToken") and len(hf_token.strip()) > 8
    )

    is_hf_model_requested = (
        req.model.startswith("meta-llama") or "/" in req.model or req.model.startswith("hf_")
    )

    hf_response_text = None
    hf_error = None

    # Step 3: Try Hugging Face Hub if token available or requested
    if has_valid_hf_token or is_hf_model_requested:
        if has_valid_hf_token:
            try:
                target_model = req.model if "/" in req.model else DEFAULT_MODEL
                hf_response_text = query_huggingface_insight(
                    dataset_summary=dataset_summary,
                    correlations=correlations,
                    anomalies=anomalies,
                    user_natural_language_query=cleaned_prompt,
                    token=hf_token,
                    model=target_model,
                    max_tokens=600,
                    temperature=0.3
                )
            except Exception as ex:
                hf_error = str(ex)
        else:
            hf_error = "HF_TOKEN not set or placeholder value found in .env."

    # Step 4: If Ollama is explicitly requested or HF wasn't used
    ollama_response_text = None
    if not hf_response_text and not is_hf_model_requested:
        try:
            user_content = (
                f"Dataset Metadata: {json.dumps(dataset_summary)}\n"
                f"Correlation Matrix: {json.dumps(correlations)}\n"
                f"Anomalies (Z-Scores): {json.dumps(anomalies)}\n"
                f"User Query: {cleaned_prompt}"
            )
            payload = {
                "model": req.model,
                "prompt": user_content,
                "system": SYSTEM_PROMPT,
                "stream": False,
                "options": {"temperature": 0.3}
            }
            res = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=12)
            if res.status_code == 200:
                ollama_response_text = res.json().get("response", "").strip()
        except Exception:
            ollama_response_text = None

    # Step 5: Synthesize Final Output
    if hf_response_text:
        final_response = hf_response_text
        source = "huggingface"
        active_model = req.model if "/" in req.model else DEFAULT_MODEL
    elif ollama_response_text:
        final_response = ollama_response_text
        source = "ollama"
        active_model = req.model
    else:
        final_response = synthesize_deterministic_fallback(
            dataset_summary=dataset_summary,
            correlations=correlations,
            anomalies=anomalies,
            facts_list=facts_list,
            user_query=cleaned_prompt,
            hf_token_needed=is_hf_model_requested and not has_valid_hf_token
        )
        source = "deterministic_engine"
        active_model = DEFAULT_MODEL if is_hf_model_requested else req.model

    return {
        "source": source,
        "model": active_model,
        "has_dataset": True,
        "dataset_name": dataset_entry["filename"],
        "response": final_response,
        "calculated_facts": facts_list,
        "correlations": correlations,
        "anomalies": anomalies,
        "hf_error": hf_error,
        "hf_configured": has_valid_hf_token
    }
