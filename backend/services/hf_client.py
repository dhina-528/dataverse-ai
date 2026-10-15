import os
import json
from typing import Dict, Any, Optional, List
from huggingface_hub import InferenceClient

SYSTEM_PROMPT = """You are the core analytical reasoning engine for "Dataverse AI," an autonomous analytics and insights platform. Your role is to ingest pre-computed deterministic statistical artifacts (shape, data types, null rates, duplicate counts, Pearson correlation matrices, Z-score anomalies, and frequency distributions) calculated by the Pandas backend, and synthesize them into rigorous, professional executive summaries and strategic business recommendations.

# Core Behavioral Constraints & Rules
1. ZERO NUMERICAL HALLUCINATION: You must NEVER invent, estimate, or modify any mathematical metric, sum, average, correlation coefficient, Z-score, or frequency count. Use ONLY the exact numbers provided in the input payload.
2. DETERMINISTIC FIRST: Acknowledge that calculations are pre-computed. If data points are missing or columns are unpopulated, explicitly state that no data was recorded for those dimensions rather than guessing.
3. PROFESSIONAL TONE: Write with the precision of a senior data scientist and the clarity of a C-suite business strategist. Avoid conversational filler, fluff, or generic greetings.
4. TOKEN EFFICIENCY: Keep explanations concise, high-density, and structured for fast rendering in UI components.

# Input Payload Context Structure
You will receive JSON-structured contexts containing:
- Dataset Metadata: Row count, column count, memory usage, duplicate rows, missing value percentages per column.
- Statistical Computations: Pearson correlation coefficient matrix, Z-score anomaly outliers, distribution histograms/frequency breakdowns.
- User Query: The natural language question or analytical prompt requested via the Data Analysis Studio.

# Required Output Structure
You must format your response in clean Markdown using the exact headers specified below. Do not omit any section:

### 📑 Executive Summary
- Provide a high-level briefing (2-3 sentences) summarizing the dataset's overall health, core operational focus, and primary takeaway.

### 🔬 Statistical Insights & Correlation Analysis
- Highlight significant positive or negative Pearson correlations ($r > |0.6|$) found in the dataset.
- Explain the business implications of these relationships using exact figures from the provided matrix.

### ⚠️ Outlier & Anomaly Flags
- Enumerate significant anomalies detected via Z-score thresholding ($|Z| > 3.0$).
- Detail which columns, rows, or records triggered these flags and their potential impact on skewing platform telemetry.

### 🚀 Prescriptive Business Recommendations
- Provide 3 actionable, data-backed strategic recommendations for operational improvement, risk mitigation, or workflow optimization based strictly on the computed insights."""

DEFAULT_MODEL = "meta-llama/Llama-3.2-3B-Instruct"


def get_hf_token() -> Optional[str]:
    """Retrieve Hugging Face API token from environment."""
    return os.getenv("HF_TOKEN")


def get_inference_client(token: Optional[str] = None, model: str = DEFAULT_MODEL) -> InferenceClient:
    """Initialize the Hugging Face InferenceClient with API key and model."""
    hf_token = token or get_hf_token()
    return InferenceClient(
        model=model,
        token=hf_token
    )


def query_huggingface_insight(
    prompt_context: Optional[str] = None,
    dataset_summary: Optional[Dict[str, Any]] = None,
    correlations: Optional[Dict[str, Any]] = None,
    anomalies: Optional[List[Dict[str, Any]]] = None,
    user_natural_language_query: Optional[str] = None,
    token: Optional[str] = None,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 500,
    temperature: float = 0.3
) -> str:
    """
    Executes analytical reasoning via Hugging Face InferenceClient with Llama-3.2-3B-Instruct,
    adhering strictly to zero numerical hallucination and pre-computed deterministic facts.
    """
    client = get_inference_client(token=token, model=model)

    if prompt_context:
        user_content = prompt_context
    else:
        user_content = (
            f"Dataset Metadata: {json.dumps(dataset_summary or {}, indent=2)}\n"
            f"Correlation Matrix: {json.dumps(correlations or {}, indent=2)}\n"
            f"Anomalies (Z-Scores): {json.dumps(anomalies or [], indent=2)}\n"
            f"User Query: {user_natural_language_query or 'Analyze key dataset patterns and anomalies'}"
        )

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": user_content,
        },
    ]

    response = client.chat.completions.create(
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content
