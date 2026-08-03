"""
File loading utilities for CSV and Excel files
Based on DATA_DISCOVERY_REPORT.md specifications
"""
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pandas as pd


class FileLoader:
    """Load CSV and Excel files with sheet detection"""

    def __init__(self, context_dir: str = "../context"):
        self.context_dir = Path(context_dir)

    def detect_file_type(self, file_path: Path) -> str:
        """Detect file type from extension"""
        ext = file_path.suffix.lower()
        if ext == '.csv':
            return 'csv'
        elif ext in ['.xlsx', '.xls']:
            return 'xlsx' if ext == '.xlsx' else 'xls'
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    def load_csv(self, file_path: Path) -> Tuple[pd.DataFrame, Dict]:
        """
        Load CSV file
        Returns: (dataframe, metadata)
        """
        try:
            # Read CSV with basic error handling
            df = pd.read_csv(file_path, encoding='utf-8')

            # Handle files with encoding issues
            if df.empty or len(df.columns) == 0:
                df = pd.read_csv(file_path, encoding='latin-1')

            metadata = {
                'sheets': None,
                'active_sheet': None,
                'row_count': len(df),
                'columns': list(df.columns)
            }

            return df, metadata

        except Exception as e:
            raise RuntimeError(f"Failed to load CSV {file_path}: {str(e)}")

    def load_excel(self, file_path: Path) -> Tuple[Dict[str, pd.DataFrame], Dict]:
        """
        Load Excel file with all sheets
        Returns: (dict of dataframes by sheet name, metadata)

        Based on DATA_DISCOVERY_REPORT.md:
        - EDC_AE Query Report.xlsx has 3 sheets: Sheet1, Test_eChecks, Test_Queries
        - Medical Monitor AE Listing.xlsx has 1 sheet: Seriouness
        - Protocol Deviations Report.xlsx has 1 sheet: Protocol Deviations
        - Signature List EDC Report (2).xlsx has 2 sheets: Worksheet, EDC Signature List
        """
        try:
            # Load all sheets
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names

            dataframes = {}
            sheet_metadata = []

            for sheet_name in sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                dataframes[sheet_name] = df

                sheet_metadata.append({
                    'name': sheet_name,
                    'row_count': len(df),
                    'columns': list(df.columns)
                })

            metadata = {
                'sheets': sheet_metadata,
                'active_sheet': sheet_names[0] if sheet_names else None,
                'total_sheets': len(sheet_names)
            }

            return dataframes, metadata

        except Exception as e:
            raise RuntimeError(f"Failed to load Excel {file_path}: {str(e)}")

    def load_file(self, file_name: str) -> Tuple[pd.DataFrame, Dict, str]:
        """
        Load a file (CSV or Excel) from context directory
        Returns: (primary_dataframe, metadata, file_type)

        For Excel files with multiple sheets, returns the first non-test sheet
        """
        file_path = self.context_dir / file_name

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        file_type = self.detect_file_type(file_path)

        if file_type == 'csv':
            df, metadata = self.load_csv(file_path)
            return df, metadata, file_type
        else:
            # Excel file - load all sheets
            dataframes, metadata = self.load_excel(file_path)

            # Return primary sheet (first non-test sheet)
            # Based on DATA_DISCOVERY_REPORT.md: Test_eChecks and Test_Queries should be excluded
            primary_sheet = None
            for sheet_name, df in dataframes.items():
                if 'test' not in sheet_name.lower():
                    primary_sheet = sheet_name
                    break

            # If no non-test sheet, return first sheet
            if primary_sheet is None:
                primary_sheet = list(dataframes.keys())[0]

            # Add all dataframes to metadata for later access
            metadata['dataframes'] = dataframes
            metadata['primary_sheet'] = primary_sheet

            return dataframes[primary_sheet], metadata, file_type

    def get_all_sheets(self, file_name: str) -> Dict[str, pd.DataFrame]:
        """
        Get all sheets from an Excel file as dict
        For CSV files, returns dict with single key 'data'
        """
        file_path = self.context_dir / file_name
        file_type = self.detect_file_type(file_path)

        if file_type == 'csv':
            df, _ = self.load_csv(file_path)
            return {'data': df}
        else:
            dataframes, _ = self.load_excel(file_path)
            return dataframes
