import io
import json
import os
import re
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple


class DataProcessor:
    """Service to parse, validate, clean, transform, and profile tabular datasets."""

    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    ALLOWED_EXTENSIONS = {'.csv', '.tsv', '.tab', '.json', '.xlsx', '.xls'}

    @classmethod
    def validate_file(cls, content: bytes, filename: str) -> str:
        """Validate file size and extension. Returns normalized extension or raises ValueError."""
        if not filename or not filename.strip():
            raise ValueError("File name cannot be empty.")

        safe_filename = os.path.basename(filename.strip())
        _, ext = os.path.splitext(safe_filename.lower())

        if not ext:
            raise ValueError("Uploaded file has no extension. Please upload a .csv, .xlsx, .xls, .tsv, or .json file.")

        if ext not in cls.ALLOWED_EXTENSIONS:
            allowed_list = ", ".join(sorted(cls.ALLOWED_EXTENSIONS))
            raise ValueError(f"Unsupported file type '{ext}'. Supported formats: {allowed_list}")

        if not content or len(content) == 0:
            raise ValueError("Uploaded file is empty (0 bytes).")

        if len(content) > cls.MAX_FILE_SIZE:
            max_mb = cls.MAX_FILE_SIZE // (1024 * 1024)
            raise ValueError(f"File size exceeds the {max_mb}MB limit. Please upload a smaller dataset.")

        return ext

    @classmethod
    def parse_file(cls, content: bytes, filename: str) -> pd.DataFrame:
        """Parse CSV, TSV, Excel (.xlsx, .xls), or JSON file buffer into a Pandas DataFrame."""
        ext = cls.validate_file(content, filename)

        try:
            if ext == '.xlsx':
                df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
            elif ext == '.xls':
                try:
                    df = pd.read_excel(io.BytesIO(content))
                except Exception as exc:
                    raise ValueError(
                        "Unable to parse legacy .xls format. Please save the workbook as modern .xlsx or export to .csv."
                    ) from exc
            elif ext in ('.tsv', '.tab'):
                for encoding in ('utf-8', 'utf-8-sig', 'latin1', 'cp1252'):
                    try:
                        df = pd.read_csv(io.BytesIO(content), sep='\t', encoding=encoding)
                        break
                    except (UnicodeDecodeError, pd.errors.ParserError):
                        continue
                else:
                    df = pd.read_csv(io.BytesIO(content), sep='\t')
            elif ext == '.json':
                df = pd.read_json(io.BytesIO(content))
            elif ext == '.csv':
                # Try standard encodings
                for encoding in ('utf-8', 'utf-8-sig', 'latin1', 'cp1252'):
                    try:
                        df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                        break
                    except (UnicodeDecodeError, pd.errors.ParserError):
                        continue
                else:
                    df = pd.read_csv(io.BytesIO(content))
            else:
                # Fallback CSV attempt
                df = pd.read_csv(io.BytesIO(content))

        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Failed to parse file: {str(e)}")

        if df is None or df.empty:
            raise ValueError("The uploaded dataset contains no data or rows.")

        # Ensure column names are clean strings
        df.columns = [str(c).strip() if str(c).strip() else f"Unnamed_{i}" for i, c in enumerate(df.columns)]
        return df

    @classmethod
    def detect_inconsistent_types(cls, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect columns with mixed data types or numbers/dates formatted as text strings."""
        issues = []
        for col in df.columns:
            series = df[col].dropna()
            if series.empty:
                continue

            # If currently object/string, check if numeric
            if series.dtype == object or str(series.dtype) == 'string':
                # Test numeric conversion
                numeric_converted = pd.to_numeric(series, errors='coerce')
                num_valid = numeric_converted.notna().sum()
                pct_numeric = num_valid / len(series) if len(series) > 0 else 0

                if 0.60 <= pct_numeric < 1.0:
                    issues.append({
                        "column": col,
                        "type": "mixed_numeric_text",
                        "severity": "warning",
                        "description": f"Column '{col}' has mixed types: {round(pct_numeric * 100, 1)}% numeric values mixed with text.",
                        "detected_type": "Mixed (Numbers + Text)",
                        "recommended_action": "Coerce to numeric (invalid text becomes null) or keep as categorical."
                    })
                elif pct_numeric == 1.0 and len(series) > 0:
                    issues.append({
                        "column": col,
                        "type": "numbers_stored_as_text",
                        "severity": "info",
                        "description": f"Column '{col}' contains pure numbers formatted as strings.",
                        "detected_type": "Numeric (Stored as String)",
                        "recommended_action": "Cast to numeric to unlock math aggregations and correlations."
                    })
                else:
                    # Test date conversion if looks like a date
                    if any(term in str(col).lower() for term in ['date', 'time', 'year', 'month', 'day', 'created']):
                        date_converted = pd.to_datetime(series, errors='coerce')
                        pct_date = date_converted.notna().sum() / len(series) if len(series) > 0 else 0
                        if pct_date > 0.8:
                            issues.append({
                                "column": col,
                                "type": "dates_stored_as_text",
                                "severity": "info",
                                "description": f"Column '{col}' appears to be timestamps stored as string text.",
                                "detected_type": "Datetime (Stored as String)",
                                "recommended_action": "Parse to Datetime for temporal trend analysis."
                            })

        return issues

    @classmethod
    def generate_cleaning_preview(cls, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate structured preview of proposed cleaning operations without modifying data."""
        ops = []
        total_rows = len(df)
        duplicates = int(df.duplicated().sum())

        # 1. Duplicate rows
        if duplicates > 0:
            ops.append({
                "id": "drop_duplicates",
                "title": "Remove Duplicate Rows",
                "description": f"Detect and remove {duplicates} identical duplicate rows, retaining the first occurrence.",
                "impact": f"Dataset will be deduplicated from {total_rows} to {total_rows - duplicates} rows (-{duplicates} rows).",
                "risk": "Low",
                "type": "deduplication"
            })

        # 2. Missing values per column
        for col in df.columns:
            null_count = int(df[col].isnull().sum())
            if null_count > 0:
                null_pct = round((null_count / total_rows) * 100, 1) if total_rows > 0 else 0
                if pd.api.types.is_numeric_dtype(df[col]):
                    median_val = round(float(df[col].dropna().median()), 2) if not df[col].dropna().empty else 0
                    ops.append({
                        "id": f"fill_median_{col}",
                        "column": col,
                        "title": f"Impute Missing Values in '{col}'",
                        "description": f"Fill {null_count} nulls ({null_pct}%) using the column median value ({median_val}).",
                        "impact": f"Preserves all {total_rows} rows while eliminating missing cells in '{col}'.",
                        "risk": "Low",
                        "type": "imputation"
                    })
                    ops.append({
                        "id": f"drop_na_{col}",
                        "column": col,
                        "title": f"Drop Incomplete Rows for '{col}'",
                        "description": f"Drop rows where '{col}' has null or empty values.",
                        "impact": f"Reduces total rows by {null_count} ({null_pct}%).",
                        "risk": "Medium",
                        "type": "row_removal"
                    })
                else:
                    ops.append({
                        "id": f"fill_na_unknown_{col}",
                        "column": col,
                        "title": f"Fill Missing Categories in '{col}'",
                        "description": f"Replace {null_count} null entries ({null_pct}%) with 'Unknown'.",
                        "impact": f"Leaves row count unchanged at {total_rows}; labels unknown categories explicitly.",
                        "risk": "Low",
                        "type": "imputation"
                    })

        # 3. String columns whitespace trimming
        has_whitespace_issues = False
        for col in df.select_dtypes(include=[object, 'string']).columns:
            series = df[col].dropna().astype(str)
            if not series.empty and (series.str.strip() != series).any():
                has_whitespace_issues = True
                break

        if has_whitespace_issues:
            ops.append({
                "id": "trim_text_whitespace",
                "title": "Trim Whitespace on Text Columns",
                "description": "Strip leading and trailing whitespace from string/text attributes.",
                "impact": "Harmonizes categorical grouping and prevents false distinct values.",
                "risk": "Low",
                "type": "standardization"
            })

        return ops

    @classmethod
    def apply_cleaning(cls, df: pd.DataFrame, operations: List[str]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Apply selected cleaning operations to a copy of DataFrame.
        Returns the cleaned DataFrame and an audit summary. Does not modify original in place.
        """
        cleaned_df = df.copy()
        applied_ops = []
        initial_rows = len(df)
        initial_missing = int(df.isnull().sum().sum())

        for op in operations:
            if op == "drop_duplicates":
                before_dups = int(cleaned_df.duplicated().sum())
                cleaned_df = cleaned_df.drop_duplicates()
                applied_ops.append(f"Dropped {before_dups} duplicate rows.")

            elif op == "trim_text_whitespace":
                for col in cleaned_df.select_dtypes(include=[object, 'string']).columns:
                    cleaned_df[col] = cleaned_df[col].apply(lambda x: x.strip() if isinstance(x, str) else x)
                applied_ops.append("Trimmed leading/trailing whitespace across text columns.")

            elif op.startswith("fill_median_"):
                col = op[len("fill_median_"):]
                if col in cleaned_df.columns and pd.api.types.is_numeric_dtype(cleaned_df[col]):
                    median_val = cleaned_df[col].median()
                    null_cnt = int(cleaned_df[col].isnull().sum())
                    cleaned_df[col] = cleaned_df[col].fillna(median_val)
                    applied_ops.append(f"Filled {null_cnt} missing values in '{col}' with median ({round(float(median_val), 2)}).")

            elif op.startswith("fill_na_unknown_"):
                col = op[len("fill_na_unknown_"):]
                if col in cleaned_df.columns:
                    null_cnt = int(cleaned_df[col].isnull().sum())
                    cleaned_df[col] = cleaned_df[col].fillna("Unknown")
                    applied_ops.append(f"Replaced {null_cnt} missing values in '{col}' with 'Unknown'.")

            elif op.startswith("drop_na_"):
                col = op[len("drop_na_"):]
                if col in cleaned_df.columns:
                    before_rows = len(cleaned_df)
                    cleaned_df = cleaned_df.dropna(subset=[col])
                    dropped = before_rows - len(cleaned_df)
                    applied_ops.append(f"Dropped {dropped} rows with missing '{col}'.")

        final_rows = len(cleaned_df)
        final_missing = int(cleaned_df.isnull().sum().sum())

        summary = {
            "applied_operations": applied_ops,
            "rows_before": initial_rows,
            "rows_after": final_rows,
            "rows_removed": initial_rows - final_rows,
            "missing_before": initial_missing,
            "missing_after": final_missing,
            "missing_resolved": initial_missing - final_missing
        }
        return cleaned_df, summary

    @classmethod
    def get_summary_profile(cls, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate a complete statistical summary, health profile, and cleaning previews for the dataset."""
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
                "sample_values": [str(v) for v in df[col].dropna().head(3).tolist()],
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
                    "top_values": {str(k): int(v) for k, v in df[col].value_counts().head(5).items()}
                })

            columns_meta.append(col_data)

        # Tabular preview records (first 50 rows)
        preview_records = df.head(50).replace({np.nan: None}).to_dict(orient="records")

        # Inconsistent types and data quality
        type_issues = cls.detect_inconsistent_types(df)
        cleaning_ops = cls.generate_cleaning_preview(df)

        # Quality score out of 100
        quality_score = max(0.0, round(100.0 - missing_rate - (duplicates / max(1, total_rows) * 100), 1))

        return {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "missing_cells": missing_cells,
            "missing_rate": missing_rate,
            "duplicate_rows": duplicates,
            "quality_score": quality_score,
            "columns": columns_meta,
            "preview": preview_records,
            "type_issues": type_issues,
            "proposed_cleaning": cleaning_ops
        }
