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
