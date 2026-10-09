import io
import json
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional


class DataProcessor:
    """Service to parse, clean, transform, and profile tabular datasets."""

    @staticmethod
    def parse_file(content: bytes, filename: str) -> pd.DataFrame:
        """Parse CSV, JSON, or TSV file buffer into a Pandas DataFrame."""
        lower_name = filename.lower()
        if lower_name.endswith('.csv'):
            return pd.read_csv(io.BytesIO(content))
        elif lower_name.endswith('.tsv') or lower_name.endswith('.tab'):
            return pd.read_csv(io.BytesIO(content), sep='\t')
        elif lower_name.endswith('.json'):
            return pd.read_json(io.BytesIO(content))
        else:
            # Fallback attempt as CSV
            return pd.read_csv(io.BytesIO(content))

    @staticmethod
    def get_summary_profile(df: pd.DataFrame) -> Dict[str, Any]:
        """Generate a complete statistical summary and health profile for the dataset."""
        total_rows, total_cols = df.shape
        missing_cells = int(df.isnull().sum().sum())
        total_cells = total_rows * total_cols if total_cols > 0 else 1
        missing_rate = round((missing_cells / total_cells) * 100, 2)
        
        duplicates = int(df.duplicated().sum())

        columns_meta = []
        for col in df.columns:
            dtype_str = str(df[col].dtype)
            num_unique = int(df[col].nunique(dropna=True))
            null_count = int(df[col].isnull().sum())
            null_pct = round((null_count / total_rows) * 100, 2) if total_rows > 0 else 0

            col_data: Dict[str, Any] = {
                "name": str(col),
                "dtype": dtype_str,
                "unique_count": num_unique,
                "null_count": null_count,
                "null_pct": null_pct,
            }

            if pd.api.types.is_numeric_dtype(df[col]):
                series = df[col].dropna()
                if not series.empty:
                    col_data.update({
                        "type": "numeric",
                        "min": float(series.min()) if not np.isnan(series.min()) else None,
                        "max": float(series.max()) if not np.isnan(series.max()) else None,
                        "mean": round(float(series.mean()), 2) if not np.isnan(series.mean()) else None,
                        "median": round(float(series.median()), 2) if not np.isnan(series.median()) else None,
                        "std": round(float(series.std()), 2) if not np.isnan(series.std()) else None,
                    })
                else:
                    col_data["type"] = "numeric"
            else:
                col_data.update({
                    "type": "categorical",
                    "top_values": df[col].value_counts().head(5).to_dict()
                })

            columns_meta.append(col_data)

        preview_records = df.head(50).replace({np.nan: None}).to_dict(orient="records")

        return {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "missing_cells": missing_cells,
            "missing_rate": missing_rate,
            "duplicate_rows": duplicates,
            "columns": columns_meta,
            "preview": preview_records
        }
