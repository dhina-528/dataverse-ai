import pandas as pd
import numpy as np
import re
from typing import Dict, Any, List, Optional


class AnalyticsEngine:
    """Service to compute statistical correlations, trends, distributions, anomalies, and deterministic Q&A."""

    @staticmethod
    def compute_correlations(df: pd.DataFrame) -> Dict[str, Any]:
        """Compute Pearson correlation matrix between numeric columns."""
        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.shape[1] < 2:
            return {"columns": list(numeric_df.columns), "matrix": []}

        corr_matrix = numeric_df.corr().round(3).fillna(0)
        return {
            "columns": list(numeric_df.columns),
            "matrix": corr_matrix.values.tolist()
        }

    @staticmethod
    def compute_distribution(df: pd.DataFrame, column_name: str, bins: int = 10) -> Dict[str, Any]:
        """Compute frequency histogram or category breakdown for a selected column."""
        if column_name not in df.columns:
            return {"error": f"Column '{column_name}' not found."}

        series = df[column_name].dropna()
        if pd.api.types.is_numeric_dtype(series):
            counts, bin_edges = np.histogram(series, bins=bins)
            labels = [f"{round(bin_edges[i], 1)} - {round(bin_edges[i+1], 1)}" for i in range(len(counts))]
            return {
                "type": "histogram",
                "column": column_name,
                "labels": labels,
                "values": [int(c) for c in counts]
            }
        else:
            top_counts = series.value_counts().head(12)
            return {
                "type": "categorical",
                "column": column_name,
                "labels": [str(k) for k in top_counts.index],
                "values": [int(v) for v in top_counts.values]
            }

    @staticmethod
    def detect_anomalies(df: pd.DataFrame, z_threshold: float = 2.5) -> List[Dict[str, Any]]:
        """Identify statistical outlier records using Z-score across numeric columns."""
        anomalies = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        for col in numeric_cols:
            col_series = df[col].dropna()
            if len(col_series) < 5:
                continue
            mean = col_series.mean()
            std = col_series.std()
            if std == 0 or np.isnan(std):
                continue

            z_scores = ((df[col] - mean) / std).abs()
            outlier_indices = df[z_scores > z_threshold].index

            for idx in outlier_indices[:5]:
                anomalies.append({
                    "row_index": int(idx),
                    "column": col,
                    "value": float(df.loc[idx, col]),
                    "mean": round(float(mean), 2),
                    "z_score": round(float(z_scores.loc[idx]), 2),
                    "description": f"Value {df.loc[idx, col]} deviates significantly (Z={round(float(z_scores.loc[idx]), 1)}) from column mean {round(mean, 1)}."
                })

        return anomalies

    @staticmethod
    def answer_deterministic_query(df: pd.DataFrame, query: str) -> Dict[str, Any]:
        """Perform exact deterministic data calculations answering specific analytical questions."""
        q = query.lower()
        cols_lower = {str(c).lower(): c for c in df.columns}
        numeric_cols = list(df.select_dtypes(include=[np.number]).columns)
        categorical_cols = list(df.select_dtypes(exclude=[np.number]).columns)

        facts = []
        metric_table = None

        # 1. Total Revenue / Total Sales / Volume
        revenue_keys = ['revenue', 'sales', 'sales_volume', 'amount', 'volume', 'profit', 'net_profit', 'total']
        matched_rev_col = None
        for k in revenue_keys:
            for c in numeric_cols:
                if k in str(c).lower():
                    matched_rev_col = c
                    break
            if matched_rev_col:
                break

        if any(w in q for w in ['total', 'sum', 'overall', 'gross']) and any(w in q for w in ['revenue', 'sales', 'profit', 'volume', 'amount']):
            if matched_rev_col:
                total_val = float(df[matched_rev_col].sum())
                mean_val = float(df[matched_rev_col].mean())
                median_val = float(df[matched_rev_col].median())
                facts.append(f"**Total {matched_rev_col}**: ${total_val:,.2f}" if 'profit' in matched_rev_col.lower() or 'revenue' in matched_rev_col.lower() or 'sales' in matched_rev_col.lower() else f"**Total {matched_rev_col}**: {total_val:,.2f}")
                facts.append(f"- **Mean**: {mean_val:,.2f}")
                facts.append(f"- **Median**: {median_val:,.2f}")
                facts.append(f"- **Record Count Analyzed**: {len(df[matched_rev_col].dropna()):,} rows")
            else:
                facts.append("⚠️ No direct revenue or sales column found in the current dataset schema.")

        # 2. Highest Products / Best Performing Items
        if any(w in q for w in ['highest', 'top', 'best', 'ranking', 'leading']) and any(w in q for w in ['product', 'item', 'category', 'service']):
            cat_col = None
            for c in categorical_cols:
                if any(k in str(c).lower() for k in ['product', 'category', 'item', 'type']):
                    cat_col = c
                    break
            if not cat_col and categorical_cols:
                cat_col = categorical_cols[0]

            val_col = matched_rev_col or (numeric_cols[0] if numeric_cols else None)

            if cat_col and val_col:
                grouped = df.groupby(cat_col)[val_col].sum().sort_values(ascending=False).head(5)
                facts.append(f"**Top Performing {cat_col} by {val_col}**:")
                for rank, (item, val) in enumerate(grouped.items(), 1):
                    facts.append(f"{rank}. **{item}**: {val:,.2f}")
            else:
                facts.append("⚠️ Missing categorical product or numeric value column for ranking calculation.")

        # 3. Best Performing Regions / Locations
        if any(w in q for w in ['region', 'location', 'country', 'state', 'geography', 'territory']):
            region_col = None
            for c in categorical_cols:
                if any(k in str(c).lower() for k in ['region', 'country', 'state', 'loc', 'area']):
                    region_col = c
                    break
            val_col = matched_rev_col or (numeric_cols[0] if numeric_cols else None)

            if region_col and val_col:
                grouped = df.groupby(region_col)[val_col].sum().sort_values(ascending=False)
                facts.append(f"**Regional Breakdown by {val_col}**:")
                for rank, (reg, val) in enumerate(grouped.items(), 1):
                    facts.append(f"{rank}. **{reg}**: {val:,.2f}")
            elif region_col:
                counts = df[region_col].value_counts().head(5)
                facts.append(f"**Top Regions by Frequency ({region_col})**:")
                for reg, count in counts.items():
                    facts.append(f"- **{reg}**: {count:,} transactions")
            else:
                facts.append("⚠️ No geographical or regional column identified in dataset.")

        # 4. Monthly / Temporal Trends
        if any(w in q for w in ['trend', 'month', 'monthly', 'time', 'quarter', 'date', 'timeline']):
            date_col = None
            for c in df.columns:
                if any(k in str(c).lower() for k in ['date', 'time', 'month', 'year', 'quarter', 'period', 'created']):
                    date_col = c
                    break
            if date_col and matched_rev_col:
                try:
                    df_copy = df.copy()
                    df_copy['__dt'] = pd.to_datetime(df_copy[date_col], errors='coerce')
                    df_valid = df_copy.dropna(subset=['__dt'])
                    if not df_valid.empty:
                        monthly = df_valid.groupby(df_valid['__dt'].dt.to_period('M'))[matched_rev_col].sum().head(6)
                        facts.append(f"**Monthly Trend for {matched_rev_col}**:")
                        for p, v in monthly.items():
                            facts.append(f"- **{p}**: {v:,.2f}")
                    else:
                        facts.append(f"**Trend Evaluation**: Date column `{date_col}` contains non-standard timestamp formats.")
                except Exception:
                    facts.append(f"**Trend Evaluation**: Evaluated chronologically across {len(df)} indexed data points.")
            else:
                facts.append(f"**Dataset Timeline Overview**: Total {len(df):,} sequential records evaluated across available attributes.")

        # 5. Missing values and duplicate rows
        if any(w in q for w in ['missing', 'null', 'duplicate', 'quality', 'clean', 'nan', 'empty']):
            null_counts = df.isnull().sum()
            total_cells = df.shape[0] * df.shape[1] if df.shape[1] > 0 else 1
            missing_cells = int(null_counts.sum())
            missing_rate = round((missing_cells / total_cells) * 100, 2)
            dup_count = int(df.duplicated().sum())

            facts.append(f"**Data Integrity & Quality Profile**:")
            facts.append(f"- **Total Missing Cells**: {missing_cells:,} ({missing_rate}% of total dataset)")
            facts.append(f"- **Duplicate Rows**: {dup_count:,}")
            
            null_cols = null_counts[null_counts > 0]
            if not null_cols.empty:
                facts.append(f"- **Columns with Missing Values**:")
                for col, count in null_cols.items():
                    facts.append(f"  • `{col}`: {count:,} nulls ({round((count/len(df))*100, 2)}%)")
            else:
                facts.append("- **Null Status**: 100% complete — No null or NaN values detected.")

        # 6. Main changes / Dataset Overview Summary
        if not facts or any(w in q for w in ['overview', 'summary', 'change', 'describe', 'explain', 'dataset']):
            facts.append(f"**Dataset Schema & Volume Profile**:")
            facts.append(f"- **Dimensions**: {df.shape[0]:,} Rows × {df.shape[1]} Columns")
            facts.append(f"- **Numeric Features ({len(numeric_cols)})**: {', '.join(str(c) for c in numeric_cols) if numeric_cols else 'None'}")
            facts.append(f"- **Categorical Features ({len(categorical_cols)})**: {', '.join(str(c) for c in categorical_cols) if categorical_cols else 'None'}")

        return {
            "has_calculated_facts": len(facts) > 0,
            "calculated_facts": facts,
            "numeric_columns": numeric_cols,
            "categorical_columns": categorical_cols,
            "row_count": len(df),
            "column_count": len(df.columns)
        }

    @staticmethod
    def _is_date_col(series: pd.Series, threshold: float = 0.5) -> bool:
        """Safely test if a Series contains recognizable datetime data without raising warnings."""
        if pd.api.types.is_datetime64_any_dtype(series):
            return True
        sample = series.dropna().head(30)
        if sample.empty:
            return False
        try:
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                parsed = pd.to_datetime(sample, errors='coerce', format='mixed')
                return bool(parsed.notna().sum() >= max(1, len(sample) * threshold))
        except Exception:
            return False

    @staticmethod
    def detect_semantic_columns(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Intelligently detect likely date, revenue, quantity, product, category, customer, region, and order columns.
        Strictly excludes profit from revenue and quantity from sales value.
        """
        cols = list(df.columns)
        numeric_cols = list(df.select_dtypes(include=[np.number]).columns)
        categorical_cols = list(df.select_dtypes(exclude=[np.number]).columns)

        # 1. Date Detection
        date_candidates = []
        for c in cols:
            c_lower = str(c).lower()
            if AnalyticsEngine._is_date_col(df[c], threshold=0.6) if any(w in c_lower for w in ['date', 'timestamp', 'time', 'created', 'order_date', 'invoice_date', 'datetime']) or pd.api.types.is_datetime64_any_dtype(df[c]) else False:
                date_candidates.append(c)

        # 2. Revenue / Sales Amount Detection (NEVER profit, NEVER quantity, NEVER discount, NEVER tax)
        revenue_candidates = []
        forbidden_rev_terms = ['profit', 'margin', 'qty', 'quantity', 'units', 'volume', 'discount', 'tax', 'rate', 'pct', 'percent', 'id']
        rev_priority = ['revenue', 'sales_amount', 'sales', 'total_amount', 'gross_sales', 'turnover', 'net_sales', 'amount', 'price_total', 'total']
        for c in numeric_cols:
            c_lower = str(c).lower()
            if any(term in c_lower for term in forbidden_rev_terms):
                continue
            if any(term in c_lower for term in rev_priority):
                revenue_candidates.append(c)

        # 3. Quantity / Units Sold Detection
        quantity_candidates = []
        qty_terms = ['quantity', 'qty', 'units_sold', 'units', 'items_count', 'pieces']
        for c in numeric_cols:
            c_lower = str(c).lower()
            if any(term in c_lower for term in qty_terms):
                quantity_candidates.append(c)

        # 4. Product / Item Detection
        product_candidates = []
        prod_terms = ['product_name', 'product', 'item_name', 'item', 'sku', 'title', 'description', 'article']
        for c in categorical_cols:
            c_lower = str(c).lower()
            if any(term in c_lower for term in prod_terms):
                product_candidates.append(c)

        # 5. Category / Department Detection
        category_candidates = []
        cat_terms = ['category', 'department', 'dept', 'segment', 'type', 'domain', 'division', 'group']
        for c in categorical_cols:
            c_lower = str(c).lower()
            if any(term in c_lower for term in cat_terms) and c not in product_candidates:
                category_candidates.append(c)

        # 6. Customer Detection
        customer_candidates = []
        cust_terms = ['customer_id', 'customer_name', 'customer', 'client_id', 'client', 'user_id', 'buyer', 'account_id', 'member_id']
        for c in cols:
            c_lower = str(c).lower()
            if any(term in c_lower for term in cust_terms):
                customer_candidates.append(c)

        # 7. Region / Location Detection
        region_candidates = []
        reg_terms = ['region', 'country', 'state', 'city', 'territory', 'location', 'area', 'zone', 'market']
        for c in categorical_cols:
            c_lower = str(c).lower()
            if any(term in c_lower for term in reg_terms):
                region_candidates.append(c)

        # 8. Order / Transaction Detection
        order_candidates = []
        order_terms = ['order_id', 'transaction_id', 'invoice_id', 'order_number', 'order_no', 'receipt_id']
        for c in cols:
            c_lower = str(c).lower()
            if any(term in c_lower for term in order_terms):
                order_candidates.append(c)

        # Auto-selected best matches (never assume random columns for business roles)
        matched = {
            "date": date_candidates[0] if date_candidates else None,
            "revenue": revenue_candidates[0] if revenue_candidates else None,
            "quantity": quantity_candidates[0] if quantity_candidates else None,
            "product": product_candidates[0] if product_candidates else None,
            "category": category_candidates[0] if category_candidates else None,
            "customer": customer_candidates[0] if customer_candidates else None,
            "region": region_candidates[0] if region_candidates else None,
            "order": order_candidates[0] if order_candidates else None,
        }

        candidates = {
            "date": date_candidates,
            "revenue": revenue_candidates,
            "quantity": quantity_candidates,
            "product": product_candidates,
            "category": category_candidates,
            "customer": customer_candidates,
            "region": region_candidates,
            "order": order_candidates,
        }

        return {"detected": matched, "candidates": candidates}

    @staticmethod
    def compute_dashboard_metrics(
        df: pd.DataFrame,
        mappings: Optional[Dict[str, Optional[str]]] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Calculate dynamic, deterministic dashboard metrics, interactive charts, and traceable business insights.
        Applies user column mappings and interactive filters safely.
        """
        # Empty dataset state
        if df is None or df.empty:
            return {
                "is_empty": True,
                "total_rows": 0,
                "total_columns": 0,
                "stats": [
                    {"id": "revenue", "title": "Total Revenue", "value": "Unavailable", "subtitle": "Dataset is empty (0 rows)", "trend": "neutral", "color": "primary"},
                    {"id": "orders", "title": "Total Orders", "value": "0", "subtitle": "No transaction records", "trend": "neutral", "color": "cyan"},
                    {"id": "aov", "title": "Average Order Value", "value": "Unavailable", "subtitle": "Empty dataset", "trend": "neutral", "color": "primary"},
                    {"id": "best_product", "title": "Best-Selling Product", "value": "Unavailable", "subtitle": "No items recorded", "trend": "neutral", "color": "amber"},
                    {"id": "customers", "title": "Active Customers", "value": "Unavailable", "subtitle": "No customers found", "trend": "neutral", "color": "emerald"},
                    {"id": "pop_growth", "title": "Period-over-Period Growth", "value": "Unavailable", "subtitle": "Insufficient chronological records", "trend": "neutral", "color": "cyan"}
                ],
                "revenueTrend": {"available": False, "title": "Revenue Over Time", "data": [], "missing_reason": "Dataset is empty."},
                "topProducts": {"available": False, "title": "Top Products", "data": [], "missing_reason": "Dataset is empty."},
                "regionalPerformance": {"available": False, "title": "Regional Performance", "data": [], "missing_reason": "Dataset is empty."},
                "customerMetrics": {"available": False, "title": "Customer Retention", "data": [], "missing_reason": "Dataset is empty."},
                "sampleInsights": [],
                "missing_explanations": ["Uploaded dataset has no rows."],
                "detected_columns": {},
                "filter_options": {"categories": [], "regions": [], "date_min": None, "date_max": None}
            }

        # 1. Resolve Semantic Column Roles
        auto_detection = AnalyticsEngine.detect_semantic_columns(df)
        detected = dict(auto_detection["detected"])

        mapping_warnings = []
        # Override with user mappings if provided
        if mappings:
            for role, col in mappings.items():
                if col is None or str(col).lower() in ('none', '', 'null'):
                    detected[role] = None
                elif col in df.columns:
                    # Validate numeric columns (revenue, quantity)
                    if role in ('revenue', 'quantity'):
                        if pd.api.types.is_numeric_dtype(df[col]):
                            detected[role] = col
                        else:
                            converted = pd.to_numeric(df[col], errors='coerce')
                            if converted.notna().sum() > 0:
                                df = df.copy()
                                df[col] = converted
                                detected[role] = col
                            else:
                                detected[role] = None
                                mapping_warnings.append(
                                    f"Column '{col}' was mapped to {role.capitalize()}, but does not contain valid numeric data."
                                )
                    # Validate date columns
                    elif role == 'date':
                        if AnalyticsEngine._is_date_col(df[col], threshold=0.5):
                            detected[role] = col
                        else:
                            detected[role] = None
                            mapping_warnings.append(
                                f"Column '{col}' was mapped to Date, but values could not be parsed as valid calendar dates."
                            )
                    else:
                        detected[role] = col

        date_col = detected.get("date")
        rev_col = detected.get("revenue")
        qty_col = detected.get("quantity")
        prod_col = detected.get("product")
        cat_col = detected.get("category")
        cust_col = detected.get("customer")
        region_col = detected.get("region")
        order_col = detected.get("order")

        # 2. Extract Available Filter Options (before applying filters)
        filter_options = {
            "categories": sorted([str(x) for x in df[cat_col].dropna().unique()][:50]) if cat_col and cat_col in df.columns else [],
            "regions": sorted([str(x) for x in df[region_col].dropna().unique()][:50]) if region_col and region_col in df.columns else [],
            "date_min": None,
            "date_max": None
        }

        if date_col and date_col in df.columns:
            try:
                parsed_dates = pd.to_datetime(df[date_col], errors='coerce').dropna()
                if not parsed_dates.empty:
                    filter_options["date_min"] = parsed_dates.min().strftime('%Y-%m-%d')
                    filter_options["date_max"] = parsed_dates.max().strftime('%Y-%m-%d')
            except Exception:
                pass

        # 3. Apply Interactive Filters to Working DataFrame
        working_df = df.copy()
        applied_filter_desc = []

        if filters:
            # Category filter
            cat_filter = filters.get("category")
            if cat_filter and cat_col and cat_col in working_df.columns and cat_filter != "All":
                working_df = working_df[working_df[cat_col].astype(str) == str(cat_filter)]
                applied_filter_desc.append(f"Category: {cat_filter}")

            # Region filter
            reg_filter = filters.get("region")
            if reg_filter and region_col and region_col in working_df.columns and reg_filter != "All":
                working_df = working_df[working_df[region_col].astype(str) == str(reg_filter)]
                applied_filter_desc.append(f"Region: {reg_filter}")

            # Date Range filter
            date_from = filters.get("date_from")
            date_to = filters.get("date_to")
            if (date_from or date_to) and date_col and date_col in working_df.columns:
                try:
                    working_df['_temp_dt'] = pd.to_datetime(working_df[date_col], errors='coerce')
                    if date_from:
                        working_df = working_df[working_df['_temp_dt'] >= pd.to_datetime(date_from)]
                        applied_filter_desc.append(f"From {date_from}")
                    if date_to:
                        working_df = working_df[working_df['_temp_dt'] <= pd.to_datetime(date_to)]
                        applied_filter_desc.append(f"To {date_to}")
                except Exception:
                    pass

        total_rows = len(working_df)
        total_cols = len(working_df.columns)

        # 4. Missing Column Explanations
        missing_explanations = list(mapping_warnings)
        if not rev_col:
            missing_explanations.append(
                "No validated revenue or sales amount column identified. (Columns indicating profit or unit quantity are never silently interpreted as revenue)."
            )
        if not date_col:
            missing_explanations.append(
                "No recognized date or timestamp column detected. Chronological sales velocity and period-over-period comparisons are disabled."
            )
        if not prod_col:
            missing_explanations.append(
                "No distinct product or item column detected. Top product ranking is disabled."
            )
        if not cust_col:
            missing_explanations.append(
                "No customer or account identifier detected. Customer count and repeat-purchase metrics are disabled."
            )
        if not region_col:
            missing_explanations.append(
                "No regional or geographic column detected. Regional distribution chart is disabled."
            )

        # 5. Calculate Dynamic KPI Cards (Deterministic & Transparent)
        stats = []

        # KPI 1: Total Revenue
        if rev_col and rev_col in working_df.columns and pd.api.types.is_numeric_dtype(working_df[rev_col]):
            clean_rev = working_df[rev_col].dropna()
            total_rev = float(clean_rev.sum())
            mean_rev = float(clean_rev.mean()) if not clean_rev.empty else 0
            stats.append({
                "id": "revenue",
                "title": f"Total Revenue ({rev_col})",
                "value": f"${total_rev:,.2f}",
                "change": "Calculated",
                "trend": "up",
                "subtitle": f"Mean: ${mean_rev:,.2f} per transaction",
                "color": "primary",
                "available": True
            })
        else:
            stats.append({
                "id": "revenue",
                "title": "Total Revenue",
                "value": "Unavailable",
                "change": "N/A",
                "trend": "neutral",
                "subtitle": "No sales amount column detected",
                "color": "primary",
                "available": False
            })

        # KPI 2: Total Orders / Transactions
        if order_col and order_col in working_df.columns:
            total_orders = working_df[order_col].dropna().nunique()
            order_subtitle = f"{total_orders:,} unique orders ({total_rows:,} line items)"
        else:
            total_orders = total_rows
            order_subtitle = f"{total_rows:,} recorded transaction entries"

        stats.append({
            "id": "orders",
            "title": "Total Orders",
            "value": f"{total_orders:,}",
            "change": f"{total_rows} Records",
            "trend": "up",
            "subtitle": order_subtitle,
            "color": "cyan",
            "available": True
        })

        # KPI 3: Average Order Value (AOV)
        if rev_col and rev_col in working_df.columns and total_orders > 0 and pd.api.types.is_numeric_dtype(working_df[rev_col]):
            total_rev_val = float(working_df[rev_col].sum())
            aov = total_rev_val / max(1, total_orders)
            stats.append({
                "id": "aov",
                "title": "Average Order Value",
                "value": f"${aov:,.2f}",
                "change": "Deterministic",
                "trend": "up",
                "subtitle": f"Calculated as Revenue ÷ Orders",
                "color": "primary",
                "available": True
            })
        else:
            stats.append({
                "id": "aov",
                "title": "Average Order Value",
                "value": "Unavailable",
                "change": "N/A",
                "trend": "neutral",
                "subtitle": "Requires valid revenue and order counts",
                "color": "primary",
                "available": False
            })

        # KPI 4: Best-Selling Product
        top_product_val = None
        top_product_name = None
        top_product_share = 0
        if prod_col and prod_col in working_df.columns:
            val_metric = rev_col if (rev_col and rev_col in working_df.columns) else (qty_col if (qty_col and qty_col in working_df.columns) else None)
            if val_metric and pd.api.types.is_numeric_dtype(working_df[val_metric]):
                grouped_prod = working_df.groupby(prod_col)[val_metric].sum().sort_values(ascending=False)
                if not grouped_prod.empty:
                    top_product_name = str(grouped_prod.index[0])
                    top_product_val = float(grouped_prod.iloc[0])
                    total_metric_sum = float(working_df[val_metric].sum())
                    top_product_share = round((top_product_val / max(1e-6, total_metric_sum)) * 100, 1)

                    val_str = f"${top_product_val:,.2f}" if val_metric == rev_col else f"{top_product_val:,.0f} units"
                    stats.append({
                        "id": "best_product",
                        "title": "Best-Selling Product",
                        "value": top_product_name,
                        "change": f"{top_product_share}%",
                        "trend": "up",
                        "subtitle": f"Generated {val_str} ({top_product_share}% of total)",
                        "color": "amber",
                        "available": True
                    })
            else:
                top_freq = working_df[prod_col].dropna().value_counts()
                if not top_freq.empty:
                    top_product_name = str(top_freq.index[0])
                    top_product_val = int(top_freq.iloc[0])
                    stats.append({
                        "id": "best_product",
                        "title": "Top Product (Frequency)",
                        "value": top_product_name,
                        "change": f"{top_product_val} rows",
                        "trend": "up",
                        "subtitle": f"Most frequent item across {total_rows:,} records",
                        "color": "amber",
                        "available": True
                    })
        if not top_product_name:
            stats.append({
                "id": "best_product",
                "title": "Best-Selling Product",
                "value": "Unavailable",
                "change": "N/A",
                "trend": "neutral",
                "subtitle": "Requires product and sales/volume column",
                "color": "amber",
                "available": False
            })

        # KPI 5: Customer Count & Repeat Rate
        unique_customers = None
        repeat_rate = 0
        if cust_col and cust_col in working_df.columns:
            cust_counts = working_df[cust_col].dropna().value_counts()
            unique_customers = len(cust_counts)
            repeat_customers = int((cust_counts > 1).sum())
            repeat_rate = round((repeat_customers / max(1, unique_customers)) * 100, 1)

            stats.append({
                "id": "customers",
                "title": "Active Customers",
                "value": f"{unique_customers:,}",
                "change": f"{repeat_rate}% Repeat",
                "trend": "up" if repeat_rate >= 20 else "neutral",
                "subtitle": f"{repeat_customers:,} repeat customers ({repeat_rate}%)",
                "color": "emerald",
                "available": True
            })
        else:
            stats.append({
                "id": "customers",
                "title": "Active Customers",
                "value": "Unavailable",
                "change": "N/A",
                "trend": "neutral",
                "subtitle": "No customer identifier column detected",
                "color": "emerald",
                "available": False
            })

        # KPI 6: Period-over-Period (PoP) Growth
        pop_growth_data = None
        pop_explanation = None
        if date_col and date_col in working_df.columns and rev_col and rev_col in working_df.columns and pd.api.types.is_numeric_dtype(working_df[rev_col]):
            try:
                date_rev_df = working_df.dropna(subset=[date_col, rev_col]).copy()
                date_rev_df['_dt'] = pd.to_datetime(date_rev_df[date_col], errors='coerce')
                date_rev_df = date_rev_df.dropna(subset=['_dt']).sort_values('_dt')

                if len(date_rev_df) >= 2:
                    min_d = date_rev_df['_dt'].min()
                    max_d = date_rev_df['_dt'].max()
                    if min_d < max_d:
                        mid_d = min_d + (max_d - min_d) / 2
                        prior_df = date_rev_df[date_rev_df['_dt'] < mid_d]
                        recent_df = date_rev_df[date_rev_df['_dt'] >= mid_d]

                        if not prior_df.empty and not recent_df.empty:
                            prior_sum = float(prior_df[rev_col].sum())
                            recent_sum = float(recent_df[rev_col].sum())

                            if prior_sum > 0:
                                growth_val = round(((recent_sum - prior_sum) / prior_sum) * 100, 1)
                                pop_growth_data = {
                                    "growth_pct": growth_val,
                                    "recent": recent_sum,
                                    "prior": prior_sum,
                                    "mid": mid_d.strftime('%Y-%m-%d'),
                                    "max": max_d.strftime('%Y-%m-%d')
                                }
                                stats.append({
                                    "id": "pop_growth",
                                    "title": "Period-over-Period Growth",
                                    "value": f"{growth_val:+.1f}%",
                                    "change": "Comparable Periods",
                                    "trend": "up" if growth_val >= 0 else "down",
                                    "subtitle": f"Recent (${recent_sum:,.0f}) vs Prior (${prior_sum:,.0f})",
                                    "color": "cyan",
                                    "available": True
                                })
                            else:
                                pop_explanation = "Prior period revenue was $0, percentage growth is undefined."
                        else:
                            pop_explanation = "Data concentrated in a single time window."
                    else:
                        pop_explanation = "All records occur at the exact same timestamp."
                else:
                    pop_explanation = "Fewer than 2 dated records available."
            except Exception as e:
                pop_explanation = f"Date evaluation encountered: {str(e)}"

        if not pop_growth_data:
            stats.append({
                "id": "pop_growth",
                "title": "Period-over-Period Growth",
                "value": "Unavailable",
                "change": "N/A",
                "trend": "neutral",
                "subtitle": pop_explanation or "Requires date and revenue with comparable periods",
                "color": "cyan",
                "available": False
            })

        # 6. Interactive Charts
        # Chart 1: Revenue Trends Over Time
        trend_chart: Dict[str, Any] = {
            "available": False,
            "title": "Revenue & Sales Trends Over Time",
            "subtitle": "Chronological progression",
            "data": [],
            "missing_reason": None
        }

        if date_col and date_col in working_df.columns:
            try:
                dt_copy = working_df.dropna(subset=[date_col]).copy()
                dt_copy['_dt'] = pd.to_datetime(dt_copy[date_col], errors='coerce')
                valid_dt = dt_copy.dropna(subset=['_dt']).sort_values('_dt')

                if not valid_dt.empty:
                    val_col = rev_col if (rev_col and rev_col in working_df.columns) else None
                    if val_col:
                        # Group monthly or daily if span < 60 days
                        span_days = (valid_dt['_dt'].max() - valid_dt['_dt'].min()).days
                        if span_days > 60:
                            grouped = valid_dt.groupby(valid_dt['_dt'].dt.to_period('M'))[val_col].sum()
                        else:
                            grouped = valid_dt.groupby(valid_dt['_dt'].dt.strftime('%b %d'))[val_col].sum()

                        trend_list = [
                            {"label": str(period), "value": round(float(val), 2)}
                            for period, val in grouped.tail(15).items()
                        ]
                        trend_chart = {
                            "available": True,
                            "title": f"Sales Velocity Over Time ({val_col})",
                            "subtitle": f"Calculated chronologically along '{date_col}'",
                            "data": trend_list,
                            "missing_reason": None
                        }
                    else:
                        grouped = valid_dt.groupby(valid_dt['_dt'].dt.to_period('M')).size()
                        trend_list = [
                            {"label": str(period), "value": int(val)}
                            for period, val in grouped.tail(15).items()
                        ]
                        trend_chart = {
                            "available": True,
                            "title": "Transaction Volume Over Time",
                            "subtitle": f"Record count progression along '{date_col}'",
                            "data": trend_list,
                            "missing_reason": None
                        }
            except Exception as e:
                trend_chart["missing_reason"] = f"Failed to parse dates in '{date_col}': {str(e)}"
        else:
            trend_chart["missing_reason"] = "No date or timestamp column detected in dataset. Temporal trend chart is unavailable."

        # Chart 2: Top Products by Sales/Revenue
        products_chart: Dict[str, Any] = {
            "available": False,
            "title": "Top Products by Performance",
            "subtitle": "Contribution breakdown",
            "data": [],
            "missing_reason": None
        }

        if prod_col and prod_col in working_df.columns:
            val_col = rev_col if (rev_col and rev_col in working_df.columns) else (qty_col if (qty_col and qty_col in working_df.columns) else None)
            palette = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
            if val_col and pd.api.types.is_numeric_dtype(working_df[val_col]):
                top_items = working_df.groupby(prod_col)[val_col].sum().sort_values(ascending=False).head(6)
                p_data = [
                    {"label": str(k)[:20], "value": round(float(v), 2), "color": palette[i % len(palette)]}
                    for i, (k, v) in enumerate(top_items.items())
                ]
                products_chart = {
                    "available": True,
                    "title": f"Top Products by {val_col}",
                    "subtitle": f"Leading items in '{prod_col}'",
                    "data": p_data,
                    "missing_reason": None
                }
            else:
                top_items = working_df[prod_col].dropna().value_counts().head(6)
                p_data = [
                    {"label": str(k)[:20], "value": int(v), "color": palette[i % len(palette)]}
                    for i, (k, v) in enumerate(top_items.items())
                ]
                products_chart = {
                    "available": True,
                    "title": f"Top Products by Order Frequency",
                    "subtitle": f"Most recurring products in '{prod_col}'",
                    "data": p_data,
                    "missing_reason": None
                }
        else:
            products_chart["missing_reason"] = "No product or item column detected. Top product ranking is unavailable."

        # Chart 3: Regional Performance
        region_chart: Dict[str, Any] = {
            "available": False,
            "title": "Regional Performance",
            "subtitle": "Geographic volume distribution",
            "data": [],
            "missing_reason": None
        }

        top_region_name = None
        top_region_val = 0
        top_region_share = 0

        if region_col and region_col in working_df.columns:
            val_col = rev_col if (rev_col and rev_col in working_df.columns) else None
            palette = ['#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
            if val_col and pd.api.types.is_numeric_dtype(working_df[val_col]):
                top_regs = working_df.groupby(region_col)[val_col].sum().sort_values(ascending=False).head(6)
                r_data = [
                    {"label": str(k)[:20], "value": round(float(v), 2), "color": palette[i % len(palette)]}
                    for i, (k, v) in enumerate(top_regs.items())
                ]
                if not top_regs.empty:
                    top_region_name = str(top_regs.index[0])
                    top_region_val = float(top_regs.iloc[0])
                    total_r = float(working_df[val_col].sum())
                    top_region_share = round((top_region_val / max(1e-6, total_r)) * 100, 1)

                region_chart = {
                    "available": True,
                    "title": f"Regional Sales Breakdown ({region_col})",
                    "subtitle": f"Aggregated revenue by territory",
                    "data": r_data,
                    "missing_reason": None
                }
            else:
                top_regs = working_df[region_col].dropna().value_counts().head(6)
                r_data = [
                    {"label": str(k)[:20], "value": int(v), "color": palette[i % len(palette)]}
                    for i, (k, v) in enumerate(top_regs.items())
                ]
                if not top_regs.empty:
                    top_region_name = str(top_regs.index[0])
                    top_region_val = int(top_regs.iloc[0])
                    top_region_share = round((top_region_val / max(1, total_rows)) * 100, 1)

                region_chart = {
                    "available": True,
                    "title": f"Regional Transaction Volume",
                    "subtitle": f"Transaction count across territories in '{region_col}'",
                    "data": r_data,
                    "missing_reason": None
                }
        else:
            region_chart["missing_reason"] = "No region or location column detected in dataset. Regional chart is unavailable."

        # Chart 4: Customer Distribution & Repeat Metrics
        customer_chart: Dict[str, Any] = {
            "available": False,
            "title": "Customer Distribution & Loyalty",
            "subtitle": "Transaction frequencies per customer",
            "data": [],
            "missing_reason": None
        }

        if cust_col and cust_col in working_df.columns:
            counts = working_df[cust_col].dropna().value_counts()
            if not counts.empty:
                one_time = int((counts == 1).sum())
                loyal_2_3 = int(((counts >= 2) & (counts <= 3)).sum())
                frequent_4 = int((counts >= 4).sum())
                c_data = [
                    {"label": "1 Order", "value": one_time, "color": "#6366f1"},
                    {"label": "2-3 Orders", "value": loyal_2_3, "color": "#06b6d4"},
                    {"label": "4+ Orders", "value": frequent_4, "color": "#10b981"}
                ]
                customer_chart = {
                    "available": True,
                    "title": "Customer Frequency Segmentation",
                    "subtitle": f"Calculated across {len(counts):,} unique customers in '{cust_col}'",
                    "data": [d for d in c_data if d["value"] > 0],
                    "missing_reason": None
                }
        else:
            customer_chart["missing_reason"] = "No customer identifier detected. Loyalty distribution is unavailable."

        # 7. Traceable, Verified Business Insights
        live_insights = []

        # Insight 1: Top Revenue Product
        if top_product_name and top_product_val is not None:
            metric_label = f"${top_product_val:,.2f}" if rev_col else f"{top_product_val:,.0f} units"
            live_insights.append({
                "id": "ins-top-product",
                "type": "opportunity",
                "title": f"Top Revenue Contributor: {top_product_name}",
                "description": f"Product '{top_product_name}' is the leading driver, generating {metric_label} ({top_product_share}% of total {rev_col or 'volume'}).",
                "impact": "Core Driver",
                "traceability": f"Groupby sum on '{prod_col}' along '{rev_col or qty_col}'",
                "date": "Verified Calculation"
            })

        # Insight 2: Period-over-Period Growth Trajectory
        if pop_growth_data:
            g_pct = pop_growth_data["growth_pct"]
            direction = "increased" if g_pct >= 0 else "decreased"
            live_insights.append({
                "id": "ins-pop-trajectory",
                "type": "opportunity" if g_pct >= 0 else "anomaly",
                "title": f"Sales {direction.capitalize()} by {g_pct:+.1f}% Across Comparable Periods",
                "description": f"Recent period generated ${pop_growth_data['recent']:,.2f} compared to ${pop_growth_data['prior']:,.2f} in the preceding interval.",
                "impact": "Positive Growth" if g_pct >= 0 else "Contraction Alert",
                "traceability": f"Chronological split along '{date_col}' evaluated on '{rev_col}'",
                "date": "Verified Calculation"
            })

        # Insight 3: Regional Leadership
        if top_region_name and top_region_val > 0:
            val_lbl = f"${top_region_val:,.2f}" if rev_col else f"{top_region_val:,} transactions"
            live_insights.append({
                "id": "ins-regional-leader",
                "type": "opportunity",
                "title": f"Leading Territory: {top_region_name}",
                "description": f"Region '{top_region_name}' delivered {val_lbl}, representing {top_region_share}% of total geographic activity.",
                "impact": "Market Lead",
                "traceability": f"Aggregated along '{region_col}'",
                "date": "Verified Calculation"
            })

        # Insight 4: Category / Anomaly Attention Alert
        anomalies = AnalyticsEngine.detect_anomalies(working_df, z_threshold=2.5)
        if len(anomalies) > 0:
            top_anomaly_col = anomalies[0]["column"]
            live_insights.append({
                "id": "ins-anomaly-alert",
                "type": "recommendation",
                "title": f"Anomaly Investigation: {len(anomalies)} Outliers in '{top_anomaly_col}'",
                "description": f"Statistical engine flagged values in '{top_anomaly_col}' with extreme deviation (|Z-score| > 2.5). Review these entries for data entry errors or exceptional events.",
                "impact": "Quality Review",
                "traceability": f"Z-score standard deviation analysis on numeric features",
                "date": "Verified Calculation"
            })
        elif cat_col and cat_col in working_df.columns:
            counts_cat = working_df[cat_col].value_counts()
            if len(counts_cat) > 1:
                smallest_cat = counts_cat.index[-1]
                smallest_val = counts_cat.iloc[-1]
                live_insights.append({
                    "id": "ins-category-underperf",
                    "type": "recommendation",
                    "title": f"Low Volume Segment: '{smallest_cat}'",
                    "description": f"Segment '{smallest_cat}' accounts for only {smallest_val:,} records ({round((smallest_val / total_rows) * 100, 1)}% of volume). Consider evaluating marketing or stocking in this segment.",
                    "impact": "Review Focus",
                    "traceability": f"Frequency distribution on '{cat_col}'",
                    "date": "Verified Calculation"
                })

        return {
            "is_empty": False,
            "total_rows": total_rows,
            "total_columns": total_cols,
            "stats": stats,
            "revenueTrend": trend_chart,
            "topProducts": products_chart,
            "regionalPerformance": region_chart,
            "customerMetrics": customer_chart,
            "sampleInsights": live_insights,
            "detected_columns": detected,
            "candidate_columns": auto_detection["candidates"],
            "all_columns": [
                {
                    "name": str(c),
                    "dtype": str(df[c].dtype),
                    "sample_values": [str(v) for v in df[c].dropna().head(3).tolist()],
                    "unique_count": int(df[c].nunique()),
                    "is_numeric": bool(pd.api.types.is_numeric_dtype(df[c]) or pd.to_numeric(df[c], errors='coerce').notna().sum() > 0),
                    "is_date": AnalyticsEngine._is_date_col(df[c]),
                }
                for c in df.columns
            ],
            "missing_explanations": missing_explanations,
            "filter_options": filter_options,
            "applied_filters": applied_filter_desc
        }
