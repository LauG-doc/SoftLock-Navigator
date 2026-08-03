"""
Subject and Site ID mapping utilities
Based on DATA_DISCOVERY_REPORT.md Section 2 & 3
"""
import re
from typing import List, Dict, Optional, Tuple
import pandas as pd


class IDMapper:
    """
    Map Subject and Site IDs across different data sources

    Based on DATA_DISCOVERY_REPORT.md findings:
    - Subject ID formats: DUM-XXXXX-000XX, CON-XXXXX-000XX, Sub-000XX, DUM-00XXX-000XX
    - Site ID formats: DUM-XXXXX, DUM-00XXX, numeric Org No., AAA-000XX
    """

    # Subject ID patterns from DATA_DISCOVERY_REPORT.md
    SUBJECT_ID_PATTERNS = {
        'dum_long': r'^DUM-\d{5}-\d{5}$',      # DUM-XXXXX-000XX
        'dum_short': r'^DUM-\d{5}-\d{5}$',     # DUM-00XXX-000XX (same pattern, different padding)
        'con_format': r'^CON-\d{5}-\d{5}$',    # CON-XXXXX-000XX
        'sub_only': r'^Sub-\d{5}$',            # Sub-000XX
    }

    # Site ID patterns
    SITE_ID_PATTERNS = {
        'dum_format': r'^DUM-\d{3,5}$',        # DUM-XXXXX or DUM-00XXX
        'aaa_format': r'^[A-Z]{3}-\d{5}$',     # AAA-000XX
        'numeric': r'^\d{5}$',                 # 10001 (Org No.)
    }

    def detect_subject_id_column(self, df: pd.DataFrame, file_name: str) -> Optional[Dict]:
        """
        Detect subject ID column based on DATA_DISCOVERY_REPORT.md mappings

        Returns dict with:
        - column_name: str
        - format_pattern: str
        - example_values: List[str]
        - can_map: bool
        - transformation_required: Optional[str]
        """
        # Known mappings from DATA_DISCOVERY_REPORT.md Section 2
        column_mappings = {
            'Medical Monitor AE Listing': 'Patient No.',
            'EDC_AE Query Report': 'Patient No.',
            'Signature List EDC Report': 'Patient No.',
            'Adjudication Queries': 'Subject Enrollment Code',
            'SDV Key Fields Report': 'Patient no.',
            'Protocol Deviations Report': 'Subject',
            'Medical Monitor Lab Parameters': 'C01:Subject',
        }

        # Find matching file
        subject_col = None
        for known_file, col_name in column_mappings.items():
            if known_file.lower() in file_name.lower():
                if col_name in df.columns:
                    subject_col = col_name
                    break

        if not subject_col:
            # Try common column names
            for col in df.columns:
                if any(keyword in col.lower() for keyword in ['subject', 'patient', 'enrollment']):
                    subject_col = col
                    break

        if not subject_col:
            return None

        # Get sample values (non-null)
        sample_values = df[subject_col].dropna().head(5).astype(str).tolist()

        if not sample_values:
            return None

        # Detect format
        format_pattern = self._detect_subject_format(sample_values[0])

        # Determine if mapping is possible
        can_map = format_pattern != 'sub_only'  # Sub-000XX cannot map without site context
        transformation = None

        if format_pattern == 'sub_only':
            transformation = 'Requires site context - cannot map without Clinical Site: Site Number'

        return {
            'column_name': subject_col,
            'format_pattern': format_pattern,
            'example_values': sample_values,
            'can_map': can_map,
            'transformation_required': transformation
        }

    def detect_site_id_columns(self, df: pd.DataFrame, file_name: str) -> Optional[Dict]:
        """
        Detect site ID column(s) based on DATA_DISCOVERY_REPORT.md mappings

        Returns dict with:
        - column_names: List[str]
        - format_pattern: str
        - example_values: List[str]
        - can_map: bool
        - transformation_required: Optional[str]
        """
        # Known mappings from DATA_DISCOVERY_REPORT.md Section 3
        site_column_mappings = {
            'EDC_AE Query Report': ['Org No.', 'Org'],
            'Signature List EDC Report': ['Org. No.'],
            'Adjudication Queries': ['Center ID'],
            'SDV Key Fields Report': ['Site no.'],
            'Protocol Deviations Report': ['Clinical Site: Site Number', 'Clinical Site: PI'],
        }

        # Find matching file
        site_cols = []
        for known_file, col_names in site_column_mappings.items():
            if known_file.lower() in file_name.lower():
                for col_name in col_names:
                    if col_name in df.columns:
                        site_cols.append(col_name)
                if site_cols:
                    break

        # For files with embedded site IDs in subject ID
        if not site_cols:
            # Try to extract from subject ID column
            subject_info = self.detect_subject_id_column(df, file_name)
            if subject_info and subject_info['can_map']:
                # Site is embedded in subject ID (DUM-XXXXX-000XX)
                return {
                    'column_names': ['Embedded in Subject ID'],
                    'format_pattern': 'embedded',
                    'example_values': [f"Extract from {subject_info['example_values'][0]}"],
                    'can_map': True,
                    'transformation_required': f"Extract site code from {subject_info['column_name']}"
                }

        if not site_cols:
            return None

        # Get sample values from first site column
        primary_col = site_cols[0]
        sample_values = df[primary_col].dropna().head(5).astype(str).tolist()

        if not sample_values:
            return None

        # Detect format
        format_pattern = self._detect_site_format(sample_values[0])

        return {
            'column_names': site_cols,
            'format_pattern': format_pattern,
            'example_values': sample_values,
            'can_map': True,
            'transformation_required': None
        }

    def _detect_subject_format(self, sample_value: str) -> str:
        """Detect which subject ID pattern matches"""
        for pattern_name, pattern in self.SUBJECT_ID_PATTERNS.items():
            if re.match(pattern, sample_value):
                return pattern_name
        return 'unknown'

    def _detect_site_format(self, sample_value: str) -> str:
        """Detect which site ID pattern matches"""
        for pattern_name, pattern in self.SITE_ID_PATTERNS.items():
            if re.match(pattern, sample_value):
                return pattern_name
        return 'unknown'

    def extract_site_from_subject_id(self, subject_id: str) -> Optional[str]:
        """
        Extract site code from composite subject ID
        DUM-XXXXX-000XX → DUM-XXXXX
        CON-XXXXX-000XX → CON-XXXXX
        """
        if '-' not in subject_id:
            return None

        parts = subject_id.split('-')
        if len(parts) >= 3:
            return f"{parts[0]}-{parts[1]}"
        return None

    def normalize_subject_id(self, subject_id: str, site_id: Optional[str] = None) -> str:
        """
        Normalize subject ID to canonical format
        Sub-000XX + site → site-Sub-000XX (if site available)
        """
        if pd.isna(subject_id):
            return None

        subject_id = str(subject_id).strip()

        # If already in composite format, return as-is
        if re.match(r'^[A-Z]{3}-\d{3,5}-\d{5}$', subject_id):
            return subject_id

        # If Sub-000XX format and site provided, combine
        if re.match(r'^Sub-\d{5}$', subject_id) and site_id:
            return f"{site_id}-{subject_id}"

        return subject_id

    def normalize_site_id(self, site_id: str) -> str:
        """
        Normalize site ID
        Numeric → zero-padded if needed
        """
        if pd.isna(site_id):
            return None

        site_id = str(site_id).strip()

        # If purely numeric, keep as-is (Org No. format)
        if site_id.isdigit():
            return site_id

        return site_id
