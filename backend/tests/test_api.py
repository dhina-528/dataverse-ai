import pytest
from fastapi.testclient import TestClient
import io
import pandas as pd
from backend.main import app
from backend.routes.upload import DATASET_STORE
from backend.services.analytics import AnalyticsEngine

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_store():
    DATASET_STORE.clear()
    yield
    DATASET_STORE.clear()


def test_root_and_health_endpoints():
    root_res = client.get("/")
    assert root_res.status_code == 200
    assert root_res.json()["status"] == "online"

    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"


def test_valid_csv_upload_known_statistics():
    """
    Test uploading a valid CSV with precisely known numerical values
    and verify calculated moments (sum, mean, median, min, max).
    Known values for revenue: [100.0, 200.0, 300.0, 400.0]
    Sum = 1000.0, Mean = 250.0, Median = 250.0, Min = 100.0, Max = 400.0
    """
    csv_data = (
        "id,revenue,product\n"
        "1,100,WidgetA\n"
        "2,200,WidgetB\n"
        "3,300,WidgetA\n"
        "4,400,WidgetC\n"
    )
    file_payload = {"file": ("sales_data.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}

    upload_res = client.post("/api/upload", files=file_payload)
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert data["success"] is True
    dataset_id = data["dataset_id"]
    profile = data["profile"]

    # Verify rows & columns
    assert profile["total_rows"] == 4
    assert profile["total_columns"] == 3
    assert profile["missing_cells"] == 0
    assert profile["duplicate_rows"] == 0

    # Verify column statistics for revenue
    rev_col = next(c for c in profile["columns"] if c["name"] == "revenue")
    assert rev_col["type"] == "numeric"
    assert rev_col["min"] == 100.0
    assert rev_col["max"] == 400.0
    assert rev_col["mean"] == 250.0
    assert rev_col["median"] == 250.0

    # Verify dashboard metrics calculation
    dash_res = client.get(f"/api/analytics/{dataset_id}/dashboard")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    rev_stat = next(s for s in dash_data["stats"] if s["id"] == "revenue")
    assert "$1,000.00" in rev_stat["value"]


def test_excel_xlsx_upload_and_preview():
    """
    Test uploading an Excel .xlsx workbook generated via pandas/openpyxl with known values.
    """
    df = pd.DataFrame({
        "order_id": [101, 102, 103],
        "sales": [50.0, 150.0, 250.0],
        "category": ["Book", "Electronics", "Book"]
    })
    excel_buf = io.BytesIO()
    df.to_excel(excel_buf, index=False, engine="openpyxl")
    excel_buf.seek(0)

    file_payload = {
        "file": (
            "quarterly_orders.xlsx",
            excel_buf,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    }

    upload_res = client.post("/api/upload", files=file_payload)
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert data["success"] is True
    profile = data["profile"]
    assert profile["total_rows"] == 3
    assert profile["total_columns"] == 3
    assert len(profile["preview"]) == 3
    assert profile["preview"][0]["order_id"] == 101


def test_missing_values_and_duplicate_rows_detection():
    """
    Test a synthetic dataset with known missing values and exact duplicate rows.
    """
    csv_data = (
        "id,score,category\n"
        "1,10.0,Alpha\n"
        "2,,Beta\n"
        "1,10.0,Alpha\n"
    )
    file_payload = {"file": ("dirty_data.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}

    upload_res = client.post("/api/upload", files=file_payload)
    assert upload_res.status_code == 200
    profile = upload_res.json()["profile"]

    assert profile["total_rows"] == 3
    assert profile["missing_cells"] == 1
    assert profile["duplicate_rows"] == 1

    ops = profile["proposed_cleaning"]
    op_ids = [op["id"] for op in ops]
    assert "drop_duplicates" in op_ids
    assert "fill_median_score" in op_ids


def test_proposed_cleaning_operations_execution():
    """
    Test applying proposed cleaning operations without modifying original unexpectedly.
    """
    csv_data = (
        "id,score\n"
        "1,10.0\n"
        "2,20.0\n"
        "3,\n"
        "1,10.0\n"
    )
    file_payload = {"file": ("cleaning_target.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/upload", files=file_payload)
    dataset_id = upload_res.json()["dataset_id"]

    clean_res = client.post(
        f"/api/upload/{dataset_id}/clean",
        json={"operations": ["drop_duplicates", "fill_median_score"]}
    )
    assert clean_res.status_code == 200
    clean_data = clean_res.json()
    assert clean_data["success"] is True

    new_profile = clean_data["profile"]
    assert new_profile["total_rows"] == 3
    assert new_profile["duplicate_rows"] == 0
    assert new_profile["missing_cells"] == 0


def test_invalid_files_rejection():
    """Verify rejection of empty files and unsupported extensions."""
    empty_payload = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    res_empty = client.post("/api/upload", files=empty_payload)
    assert res_empty.status_code == 400
    assert "empty" in res_empty.json()["detail"].lower()

    script_payload = {"file": ("script.py", io.BytesIO(b"print('hello')"), "text/x-python")}
    res_script = client.post("/api/upload", files=script_payload)
    assert res_script.status_code == 400
    assert "unsupported" in res_script.json()["detail"].lower()


def test_smart_dashboard_kpis_and_interactive_filters():
    """
    Verify all 6 dynamic KPI cards and interactive filtering using a synthetic enterprise dataset.
    Known records:
      - 2024-01-05: Product Alpha, Cat Enterprise, Customer C1, Region US-East, Sales $100, Order O1
      - 2024-01-20: Product Beta,  Cat Consumer,   Customer C2, Region US-West, Sales $200, Order O2
      - 2024-02-10: Product Alpha, Cat Enterprise, Customer C1, Region US-East, Sales $300, Order O3
      - 2024-02-25: Product Gamma, Cat Consumer,   Customer C3, Region EU-West, Sales $400, Order O4
    Total Revenue: $1,000.00
    Total Orders: 4
    Average Order Value (AOV): $250.00
    Best Product: Product Alpha ($400 total)
    Active Customers: 3 (C1 has 2 orders -> 33.3% repeat rate)
    PoP Growth: Period 1 (Jan, $300) to Period 2 (Feb, $700) -> +133.3%
    """
    csv_data = (
        "order_id,date,product,category,customer,region,revenue\n"
        "O1,2024-01-05,Product Alpha,Enterprise,C1,US-East,100\n"
        "O2,2024-01-20,Product Beta,Consumer,C2,US-West,200\n"
        "O3,2024-02-10,Product Alpha,Enterprise,C1,US-East,300\n"
        "O4,2024-02-25,Product Gamma,Consumer,C3,EU-West,400\n"
    )
    payload = {"file": ("enterprise_sales.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/upload", files=payload)
    dataset_id = upload_res.json()["dataset_id"]

    # 1. Test Base Dashboard Metrics
    dash_res = client.get(f"/api/analytics/{dataset_id}/dashboard")
    assert dash_res.status_code == 200
    data = dash_res.json()

    stats_map = {s["id"]: s for s in data["stats"]}

    # Verify 6 KPIs
    assert "$1,000.00" in stats_map["revenue"]["value"]
    assert "4" in stats_map["orders"]["value"]
    assert "$250.00" in stats_map["aov"]["value"]
    assert stats_map["best_product"]["value"] == "Product Alpha"
    assert "3" in stats_map["customers"]["value"]
    assert "+133.3%" in stats_map["pop_growth"]["value"]

    # Verify Charts
    assert data["revenueTrend"]["available"] is True
    assert len(data["revenueTrend"]["data"]) >= 2

    assert data["topProducts"]["available"] is True
    assert data["topProducts"]["data"][0]["label"] == "Product Alpha"
    assert data["topProducts"]["data"][0]["value"] == 400.0

    assert data["regionalPerformance"]["available"] is True
    assert data["customerMetrics"]["available"] is True

    # Verify Insights
    insights = data["sampleInsights"]
    assert len(insights) > 0
    assert any("Product Alpha" in ins["title"] or "Product Alpha" in ins["description"] for ins in insights)
    assert any("increased" in ins["title"].lower() for ins in insights)

    # 2. Test Interactive Category Filter (Enterprise only)
    # Expected: 2 records (O1 and O3), Total Revenue = $400, AOV = $200
    filter_res = client.post(
        f"/api/analytics/{dataset_id}/dashboard",
        json={"filters": {"category": "Enterprise"}}
    )
    assert filter_res.status_code == 200
    filtered_data = filter_res.json()
    f_stats = {s["id"]: s for s in filtered_data["stats"]}

    assert "$400.00" in f_stats["revenue"]["value"]
    assert "2" in f_stats["orders"]["value"]
    assert "$200.00" in f_stats["aov"]["value"]


def test_column_mapping_resolver_and_profit_exclusion():
    """
    Verify automatic column detection does NOT confuse profit or quantity with revenue.
    Verify custom user column mappings via POST /api/analytics/{id}/dashboard.
    """
    csv_data = (
        "id,profit,quantity,sales_cash\n"
        "1,50,2,100\n"
        "2,80,5,200\n"
    )
    payload = {"file": ("financial_test.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/upload", files=payload)
    dataset_id = upload_res.json()["dataset_id"]

    # Check auto-detection
    cols_res = client.get(f"/api/analytics/{dataset_id}/columns")
    assert cols_res.status_code == 200
    detected = cols_res.json()["detected"]
    # Must choose sales_cash, NEVER profit or quantity
    assert detected["revenue"] == "sales_cash"
    assert detected["quantity"] == "quantity"

    dash_res = client.get(f"/api/analytics/{dataset_id}/dashboard")
    rev_kpi = next(s for s in dash_res.json()["stats"] if s["id"] == "revenue")
    assert "$300.00" in rev_kpi["value"]

    # Now override mapping explicitly to use 'profit'
    override_res = client.post(
        f"/api/analytics/{dataset_id}/dashboard",
        json={"mappings": {"revenue": "profit"}}
    )
    assert override_res.status_code == 200
    overridden_rev = next(s for s in override_res.json()["stats"] if s["id"] == "revenue")
    assert "$130.00" in overridden_rev["value"]  # 50 + 80


def test_dataset_missing_business_columns_shows_unavailable():
    """
    Test dataset missing business columns (sensor data without revenue, orders, customers, or dates).
    Must return 'Unavailable' for missing KPIs with clear explanations, without crashing.
    """
    csv_data = (
        "sensor_name,temperature,humidity\n"
        "Sensor A,22.4,55.2\n"
        "Sensor B,24.1,53.0\n"
    )
    payload = {"file": ("sensors.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/upload", files=payload)
    dataset_id = upload_res.json()["dataset_id"]

    dash_res = client.get(f"/api/analytics/{dataset_id}/dashboard")
    assert dash_res.status_code == 200
    data = dash_res.json()

    stats_map = {s["id"]: s for s in data["stats"]}
    assert stats_map["revenue"]["value"] == "Unavailable"
    assert stats_map["aov"]["value"] == "Unavailable"
    assert stats_map["customers"]["value"] == "Unavailable"
    assert stats_map["pop_growth"]["value"] == "Unavailable"

    # Missing explanations should be transparent
    assert len(data["missing_explanations"]) >= 3


def test_empty_dataset_handling():
    """Verify empty dataset does not crash and returns explicit empty state."""
    df_empty = pd.DataFrame()
    metrics = AnalyticsEngine.compute_dashboard_metrics(df_empty)
    assert metrics["is_empty"] is True
    assert metrics["total_rows"] == 0
    assert metrics["revenueTrend"]["available"] is False


def test_dataset_switching_isolation():
    """Verify metrics from two distinct datasets remain strictly isolated."""
    csv_1 = "revenue,product\n100,A\n200,B\n"  # sum = 300
    csv_2 = "revenue,product\n500,X\n"        # sum = 500

    res1 = client.post("/api/upload", files={"file": ("d1.csv", io.BytesIO(csv_1.encode()), "text/csv")})
    res2 = client.post("/api/upload", files={"file": ("d2.csv", io.BytesIO(csv_2.encode()), "text/csv")})

    id1 = res1.json()["dataset_id"]
    id2 = res2.json()["dataset_id"]

    dash1 = client.get(f"/api/analytics/{id1}/dashboard").json()
    dash2 = client.get(f"/api/analytics/{id2}/dashboard").json()

    rev1 = next(s["value"] for s in dash1["stats"] if s["id"] == "revenue")
    rev2 = next(s["value"] for s in dash2["stats"] if s["id"] == "revenue")

    assert "$300.00" in rev1
    assert "$500.00" in rev2


def test_name_list_dataset_schema_and_unsupported_metrics():
    """
    Test parsing and analytics on 'Name.list Assign.xlsx' dataset.
    Verify:
    1. 6 actual columns are loaded.
    2. No columns are mistakenly auto-mapped to revenue, date, region, customer, or product.
    3. Unsupported metrics are clearly marked 'Unavailable'.
    4. Custom mapping of category populates category filters.
    """
    import os
    file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "Name.list Assign.xlsx")
    if not os.path.exists(file_path):
        pytest.skip("Name.list Assign.xlsx not found in uploads")

    with open(file_path, "rb") as f:
        file_payload = {
            "file": (
                "Name.list Assign.xlsx",
                io.BytesIO(f.read()),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        }

    upload_res = client.post("/api/upload", files=file_payload)
    assert upload_res.status_code == 200
    dataset_id = upload_res.json()["dataset_id"]
    profile = upload_res.json()["profile"]

    # Verify 38 rows and 6 columns
    assert profile["total_rows"] == 38
    assert profile["total_columns"] == 6

    # Verify auto-detection does not assume business roles
    cols_res = client.get(f"/api/analytics/{dataset_id}/columns")
    assert cols_res.status_code == 200
    detected = cols_res.json()["detected"]
    assert detected["revenue"] is None
    assert detected["date"] is None
    assert detected["region"] is None
    assert detected["customer"] is None
    assert detected["product"] is None

    # Base dashboard: all unsupported metrics are marked Unavailable
    dash_res = client.get(f"/api/analytics/{dataset_id}/dashboard")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()

    stats_map = {s["id"]: s for s in dash_data["stats"]}
    assert stats_map["revenue"]["value"] == "Unavailable"
    assert stats_map["aov"]["value"] == "Unavailable"
    assert stats_map["best_product"]["value"] == "Unavailable"
    assert stats_map["customers"]["value"] == "Unavailable"
    assert stats_map["pop_growth"]["value"] == "Unavailable"

    # Category and region filters should have 0 options initially
    assert len(dash_data["filter_options"]["categories"]) == 0
    assert len(dash_data["filter_options"]["regions"]) == 0

    # Test invalid mapping validation: mapping text column (Unnamed: 2) to revenue must fail and warn
    invalid_map_res = client.post(
        f"/api/analytics/{dataset_id}/dashboard",
        json={"mappings": {"revenue": "Unnamed: 2", "date": "Unnamed: 1"}}
    )
    assert invalid_map_res.status_code == 200
    invalid_data = invalid_map_res.json()
    assert invalid_data["detected_columns"]["revenue"] is None
    assert invalid_data["detected_columns"]["date"] is None
    assert any("mapped to Revenue, but does not contain valid numeric data" in exp for exp in invalid_data["missing_explanations"])
    assert any("mapped to Date, but values could not be parsed" in exp for exp in invalid_data["missing_explanations"])

    # Test valid mapping: Map 'Unnamed: 3' (Group) to Category and 'Unnamed: 2' (Name) to Product
    valid_map_res = client.post(
        f"/api/analytics/{dataset_id}/dashboard",
        json={"mappings": {"category": "Unnamed: 3", "product": "Unnamed: 2"}}
    )
    assert valid_map_res.status_code == 200
    valid_data = valid_map_res.json()
    assert valid_data["detected_columns"]["category"] == "Unnamed: 3"
    assert valid_data["detected_columns"]["product"] == "Unnamed: 2"

    # Category filter options must now be populated
    assert len(valid_data["filter_options"]["categories"]) > 0

    # Top product must now be calculated from frequency of Unnamed: 2
    valid_stats = {s["id"]: s for s in valid_data["stats"]}
    assert valid_stats["best_product"]["value"] != "Unavailable"


def test_ollama_status_offline_response():
    """Verify AI status endpoint returns status for both HF Hub and Ollama."""
    status_res = client.get("/api/insights/status?model=meta-llama/Llama-3.2-3B-Instruct")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert "huggingface" in status_data
    assert "ollama" in status_data
    assert status_data["selected_model"] == "meta-llama/Llama-3.2-3B-Instruct"


def test_ai_insights_query_with_required_structure():
    """
    Test uploading a dataset and querying AI insights endpoint.
    Verifies that the returned Markdown strictly includes the 4 required sections:
    - Executive Summary
    - Statistical Insights & Correlation Analysis
    - Outlier & Anomaly Flags
    - Prescriptive Business Recommendations
    """
    csv_data = (
        "id,revenue,units_sold,satisfaction\n"
        "1,100,10,4.5\n"
        "2,200,20,4.6\n"
        "3,300,30,4.7\n"
        "4,12000,1200,1.2\n"  # Extreme outlier record for Z-score testing
    )
    file_payload = {"file": ("enterprise_kpis.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/upload", files=file_payload)
    assert upload_res.status_code == 200
    dataset_id = upload_res.json()["dataset_id"]

    query_payload = {
        "dataset_id": dataset_id,
        "prompt": "Analyze revenue correlations, anomalies, and key drivers.",
        "model": "meta-llama/Llama-3.2-3B-Instruct"
    }

    query_res = client.post("/api/insights/query", json=query_payload)
    assert query_res.status_code == 200
    res_data = query_res.json()
    assert res_data["has_dataset"] is True
    assert "response" in res_data
    response_md = res_data["response"]

    # Verify all 4 required headers are present
    assert "### 📑 Executive Summary" in response_md
    assert "### 🔬 Statistical Insights & Correlation Analysis" in response_md
    assert "### ⚠️ Outlier & Anomaly Flags" in response_md
    assert "### 🚀 Prescriptive Business Recommendations" in response_md

    # Verify correlations and anomalies were computed deterministically
    assert "correlations" in res_data
    assert "anomalies" in res_data


