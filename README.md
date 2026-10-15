# 🌌 Dataverse AI — Autonomous Analytics & Insights Platform

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![Pandas](https://img.shields.io/badge/Pandas-2.2-150458?logo=pandas&logoColor=white)](https://pandas.pydata.org/)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-Llama--3.2-FFD21E?logo=huggingface&logoColor=black)](https://huggingface.co/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-000000?logo=ollama&logoColor=white)](https://ollama.com/)
[![Tests](https://img.shields.io/badge/Pytest-14%20Passing-brightgreen?logo=pytest&logoColor=white)](https://docs.pytest.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Dataverse AI** is an enterprise data analytics, automated business intelligence, and AI-driven reasoning workspace. It couples a responsive glassmorphic React frontend with a high-performance FastAPI and Pandas backend. 

Dataverse AI eliminates numerical hallucinations with a **Deterministic-First** architecture: exact mathematical calculations (sums, averages, distributions, Pearson correlation matrices, and Z-score outlier detection) are computed deterministically before being synthesized into natural-language strategic narratives using **Hugging Face Hub** cloud inference or local, privacy-first **Ollama** LLMs.

---

## ⚡ Quick Start (Run Full Stack)

To run the complete Dataverse AI application locally:

### 1. Start the Backend API (FastAPI)
From the repository root directory:
```bash
python -m uvicorn backend.main:app --reload --port 8000
```
* **API Gateway:** [http://localhost:8000](http://localhost:8000)
* **Interactive API Documentation (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check Probe:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Start the Frontend Development Server (React + Vite)
In a separate terminal from the repository root directory:
```bash
npm run dev
```
* **Web Application UI:** [http://localhost:5173](http://localhost:5173)

---

## 🏛️ System Architecture

Dataverse AI decouples heavy mathematical processing from natural-language generation:

```mermaid
graph TD
    User([User / Browser])
    
    subgraph Frontend ["Frontend — React 18 + Vite (Port 5173)"]
        UI[Glassmorphic UI Workspace]
        Dash[Executive Dashboard]
        DS[Data Analysis & Cleaning Studio]
        RS[AI Reasoning Studio]
        Rep[Executive Reports Generator]
        ApiClient[apiService / ollamaService]
    end

    subgraph Backend ["Backend Engine — FastAPI (Port 8000)"]
        Router[API Gateway & CORS]
        UploadRoute["/api/upload & /clean"]
        AnalyticsRoute["/api/analytics"]
        InsightsRoute["/api/insights"]
        DataProc[DataProcessor - Pandas/NumPy/OpenPyXL]
        AnalyticsEngine[AnalyticsEngine - Z-Scores & Correlations]
        DiskStore[(Persisted Upload Store - backend/uploads)]
        MemStore[(In-Memory Dataset Session Cache)]
    end

    subgraph AIReasoning ["Zero-Hallucination AI Reasoning Layer"]
        HFHub["Hugging Face Hub (Llama-3.2-3B-Instruct)"]
        OllamaEngine["Local Ollama Daemon (Port 11434 / llama3.2)"]
        DeterministicFallback["Deterministic Rule-Based Synthesis Engine"]
    end

    User --> UI
    UI --> Dash & DS & RS & Rep
    Dash & DS & RS & Rep --> ApiClient
    ApiClient --> Router
    Router --> UploadRoute & AnalyticsRoute & InsightsRoute
    UploadRoute --> DataProc --> MemStore & DiskStore
    AnalyticsRoute --> AnalyticsEngine --> MemStore
    InsightsRoute --> AnalyticsEngine
    InsightsRoute --> HFHub
    InsightsRoute -.->|Local Privacy Mode| OllamaEngine
    InsightsRoute -.->|Offline / Fallback| DeterministicFallback
```

---

## 🚀 Key Features

### 📊 1. Executive Telemetry Dashboard
* Real-time KPI summaries (Total Revenue, Pipeline Volume, Active Conversion Rate, Outlier Count).
* Interactive trend visualizations and revenue distribution charts.
* Semantic dimension filters (timeframe, category, region).
* Live workload health telemetry indicators.

### 🔬 2. Data Analysis & Ingestion Studio
* **Multi-Format Ingestion**: Ingest tabular data from `.csv`, `.tsv`, `.tab`, `.json`, `.xlsx`, and `.xls` files (up to 50 MB).
* **Automatic Profiling**: Generates column-level descriptive statistics, data type inferences, null ratios, and duplicate counts.
* **Persistent Uploads**: Automatically saves uploaded datasets to disk (`backend/uploads/`) to preserve sessions across backend server restarts.

### 🧹 3. Automated Data Cleaning & Remediation
* Intelligent cleaning operations: duplicate removal, missing value imputation (mean/median/mode), whitespace normalization, and data type coercion.
* Pre- and post-cleaning data quality scoring ($0-100\%$) with downloadable audit logs.

### 📈 4. Statistical Analytics Engine
* **Correlation Matrices**: Pearson correlation matrices for numeric dimensions.
* **Frequency Distributions**: Histograms and categorical frequency breakdowns with custom binning.
* **Z-Score Anomaly Detection**: Unsupervised statistical anomaly detection identifies records exceeding configurable Z-score thresholds ($|Z| \ge 2.5$).
* **Semantic Column Mapping**: Automatically infers date, financial, categorical, and geographical dimensions.

### 🧠 5. Hybrid Zero-Hallucination AI Reasoning
* **Deterministic Computation First**: All sums, percentages, averages, and correlations are calculated using Pandas before prompt formulation.
* **Dual-Provider Architecture**:
  * **Hugging Face Hub**: Cloud-native serverless inference via `meta-llama/Llama-3.2-3B-Instruct`.
  * **Local Ollama Daemon**: 100% offline, privacy-first local synthesis using `llama3.2`.
* **Zero-Hallucination Fallback**: If neither AI provider is connected, the engine generates an executive analytical brief based purely on exact Pandas calculations.

### 📑 6. Executive Report Synthesis & PDF Export
* Generates structured executive intelligence briefings: Executive Summary, Key Findings, Statistical Anomalies, and Strategic Recommendations.
* Browser-based print styling and PDF export via `window.print()`.

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 5, Lucide Icons | Responsive glassmorphic analytical UI |
| **Styling** | Vanilla CSS3 Design System | Modern CSS variables, glassmorphism, animations |
| **Backend API** | FastAPI, Uvicorn, Pydantic v2 | High-throughput asynchronous REST API |
| **Data Engine** | Pandas 2.2, NumPy 1.26, OpenPyXL | Ingestion, profiling, cleaning, statistical math |
| **AI Cloud** | Hugging Face Hub `InferenceClient` | Serverless cloud reasoning (`Llama-3.2-3B-Instruct`) |
| **AI Local** | Ollama REST API (`/api/generate`) | Privacy-first local LLM inference |
| **Testing** | Pytest, FastAPI TestClient, AnyIO | Automated backend integration test suite |

---

## 📁 Repository Structure

```
Data analyzer/
├── backend/
│   ├── main.py                 # FastAPI application gateway, CORS & middleware
│   ├── requirements.txt        # Python backend dependencies
│   ├── routes/
│   │   ├── upload.py           # Ingestion, profiling, persistence & cleaning endpoints
│   │   ├── analytics.py        # Correlation, distribution, anomalies & KPI endpoints
│   │   └── insights.py         # AI reasoning, Ollama/HF routing & report generation
│   ├── services/
│   │   ├── data_processing.py  # Pandas parser, quality profiler & cleaning pipeline
│   │   ├── analytics.py        # Z-score anomaly detector & correlation computer
│   │   └── hf_client.py        # Hugging Face InferenceClient client service
│   ├── tests/
│   │   └── test_api.py         # Pytest API integration test suite (14 passing tests)
│   └── uploads/                # Persisted dataset storage (survives restarts)
├── src/
│   ├── components/             # Modular UI components (Sidebar, Navbar, Charts, StatCard, FileUpload)
│   ├── pages/
│   │   ├── Dashboard/          # Executive telemetry dashboard
│   │   ├── DataAnalysis/       # Data upload, inspection & cleaning studio
│   │   ├── AIInsights/         # Natural language hybrid reasoning studio
│   │   └── Reports/            # Executive report preview and PDF export
│   ├── services/               # Frontend API clients (apiService.js, ollamaService.js)
│   ├── styles/                 # Pure CSS design system & glassmorphism theme tokens
│   ├── utils/                  # Mock data, color utilities & chart formatting
│   └── App.jsx                 # Root layout controller and navigation router
├── public/                     # Static assets & icons
├── .env.example                # Template environment variables
├── package.json                # Frontend package metadata & build scripts
├── vite.config.js              # Vite server & API reverse proxy configuration
└── pytest.ini                  # Pytest configuration
```

---

## ⚙️ Installation & Setup

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **Python**: v3.10 or higher
* **Ollama** *(Optional, for offline AI)*: [Download from ollama.com](https://ollama.com)

---

### Step 1: Environment Variables

Create your local `.env` configuration file in the project root:
```bash
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5173` | Vite development server port |
| `VITE_API_URL` | `http://localhost:8000/api` | API base URL for frontend clients |
| `BACKEND_PORT` | `8000` | FastAPI uvicorn server port |
| `BACKEND_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed CORS origins |
| `HF_TOKEN` | *(Optional)* | Hugging Face Access Token for cloud inference |
| `HF_MODEL` | `meta-llama/Llama-3.2-3B-Instruct` | Hugging Face model repository ID |
| `VITE_OLLAMA_API_URL` | `http://localhost:11434` | Ollama daemon endpoint for frontend direct calls |
| `VITE_DEFAULT_OLLAMA_MODEL` | `llama3.2` | Default local model name |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama daemon endpoint for backend service |
| `ENVIRONMENT` | `development` | Deployment environment identifier |

---

### Step 2: Backend Installation (FastAPI)

1. Create and activate a Python virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux**:
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```

2. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. Launch the FastAPI server from the project root:
   ```bash
   python -m uvicorn backend.main:app --reload --port 8000
   ```

---

### Step 3: Frontend Installation (React + Vite)

1. In a separate terminal window, install npm dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Step 4: AI Reasoning Setup (Optional)

#### Option A: Hugging Face Cloud Inference (Recommended)
1. Get a free User Access Token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
2. Add your token to `.env`:
   ```env
   HF_TOKEN=hf_YourActualTokenHere
   HF_MODEL=meta-llama/Llama-3.2-3B-Instruct
   ```

#### Option B: Local Ollama AI (Offline & Private)
1. Start the Ollama background daemon:
   ```bash
   ollama serve
   ```
2. Pull the default lightweight reasoning model:
   ```bash
   ollama pull llama3.2
   ```

> **Fallback Mode**: If neither Hugging Face nor Ollama is configured, Dataverse AI automatically falls back to deterministic rule-based analysis. No configuration is required.

---

## 📡 API Reference

### 📤 Ingestion & Profile Endpoints (`/api/upload`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/upload` | List all active and persisted datasets in session |
| `POST` | `/api/upload` | Ingest `.csv`, `.tsv`, `.xlsx`, `.xls`, or `.json` file and compute initial profile |
| `GET` | `/api/upload/{dataset_id}` | Retrieve cached profile metadata for a specific dataset |
| `POST` | `/api/upload/{dataset_id}/clean` | Apply data cleaning operations (deduplicate, impute nulls, trim strings) |

### 📈 Analytics Endpoints (`/api/analytics`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/{dataset_id}/correlations` | Pearson correlation matrix across numerical columns |
| `GET` | `/api/analytics/{dataset_id}/distribution` | Frequency distribution / histogram (`?column=col&bins=10`) |
| `GET` | `/api/analytics/{dataset_id}/anomalies` | Detect outliers using Z-score thresholding (`?threshold=2.5`) |
| `GET` | `/api/analytics/{dataset_id}/columns` | Auto-detect semantic column roles (metrics, dates, categories) |
| `GET` | `/api/analytics/{dataset_id}/dashboard` | Retrieve dynamic KPI cards and telemetry charts with query filters |
| `POST` | `/api/analytics/{dataset_id}/dashboard` | Custom column mapping and multi-filter dashboard query |

### 🧠 AI Insights Endpoints (`/api/insights`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/insights/status` | Health check for Hugging Face Hub token & local Ollama daemon |
| `POST` | `/api/insights/query` | Submit natural-language analytical question with deterministic statistical context |

### 🩺 System Probes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Root API service status and swagger documentation link |
| `GET` | `/api/health` | FastAPI + Pandas + Ollama service health probe |

---

## 🧪 Testing & Verification

Dataverse AI includes a comprehensive automated test suite powered by `pytest` and FastAPI's `TestClient`:

```bash
# Run all backend integration tests
python -m pytest backend/tests -v
```

### Test Suite Highlights (14 Passing Tests):
* **Service Probes**: Validates `/` and `/api/health` connectivity.
* **Upload Ingestion**: Validates parsing of multipart CSV/TSV data and error handling on empty/malformed inputs.
* **Analytics Engine**: Validates Pearson correlation matrix bounds ($-1.0 \le r \le 1.0$), histogram binning, and outlier detection logic.
* **Semantic Mapping**: Validates automatic classification of dates, revenues, categories, and numerical metrics.
* **AI Fallback Assurance**: Validates deterministic report generation when external LLMs are disconnected.

---

## 📄 License

This project is open-source and released under the [MIT License](LICENSE).
