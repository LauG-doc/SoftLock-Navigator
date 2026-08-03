"""
Data validation service
Based on DATA_DISCOVERY_REPORT.md Section 6 (Risks and Assumptions)
"""
from typing import List, Dict, Tuple
import pandas as pd
from pathlib import Path

from app.models.data_source import DataQualityIssue, ColumnInfo
from app.utils.file_loader import FileLoader
from app.utils.id_mapper import IDMapper


class ValidationService:
    """
    Validate data files against known issues from DATA_DISCOVERY_REPORT.md
    """

    def __init__(self):
        self.loader = FileLoader()
        self.id_mapper = IDMapper()

    def validate_file(self, file_name: str, df: pd.DataFrame) -> List[DataQualityIssue]:
        """
        Validate a single file and return list of issues

        Based on DATA_DISCOVERY_REPORT.md Section 6.2 (Data Quality Risks):
        - 100% Missing MM Review Signatures
        - 100% Missing MSO Review Dates
        - 51% Missing SDV Values
        - Test data contamination
        """
        issues = []

        # Test data detection
        if self._detect_test_data(file_name, df):
            issues.append(DataQualityIssue(
                severity='warning',
                category='test_data_contamination',
                description=f'Test data detected in {file_name}',
                affected_rows=len(df)
            ))

        # Check for 100% missing critical fields
        issues.extend(self._check_critical_missing_fields(file_name, df))

        # Check for high missing rates (>50%)
        issues.extend(self._check_high_missing_rates(file_name, df))

        # Check for inconsistent subject IDs
        issues.extend(self._check_subject_id_consistency(file_name, df))

        # Check for missing required columns
        issues.extend(self._check_missing_columns(file_name, df))

        return issues

    def _detect_test_data(self, file_name: str, df: pd.DataFrame) -> bool:
        """
        Detect test data based on DATA_DISCOVERY_REPORT.md findings

        Known test data:
        - EDC_AE Query Report.xlsx: Test_eChecks and Test_Queries sheets
        - Medical Monitor Lab Parameters Review.csv: Row 12 contains "THIS IS SAMPLE TEST DATA"
        """
        # Check for test sheets (should be filtered by loader)
        if 'test' in file_name.lower():
            return True

        # Check for explicit test data warnings in content
        for col in df.columns:
            if df[col].dtype == 'object':
                test_matches = df[col].astype(str).str.contains(
                    'test data|sample data|not for clinical use',
                    case=False,
                    na=False
                )
                if test_matches.any():
                    return True

        return False

    def _check_critical_missing_fields(self, file_name: str, df: pd.DataFrame) -> List[DataQualityIssue]:
        """
        Check for 100% missing critical fields

        From DATA_DISCOVERY_REPORT.md:
        - Medical Monitor AE Listing: MM Initials and Date (100% missing)
        - Protocol Deviations: MSO Review Date (100% missing)
        """
        issues = []

        critical_fields = {
            'Medical Monitor AE Listing': ['MM Initials and Date'],
            'Protocol Deviations Report': ['MSO Review Date'],
        }

        for known_file, fields in critical_fields.items():
            if known_file.lower() in file_name.lower():
                for field in fields:
                    if field in df.columns:
                        missing_pct = (df[field].isna().sum() / len(df)) * 100
                        if missing_pct == 100:
                            issues.append(DataQualityIssue(
                                severity='error',
                                category='critical_missing_field',
                                description=f'Critical field "{field}" is 100% missing',
                                affected_rows=len(df),
                                affected_columns=[field]
                            ))

        return issues

    def _check_high_missing_rates(self, file_name: str, df: pd.DataFrame) -> List[DataQualityIssue]:
        """
        Check for fields with >50% missing data

        From DATA_DISCOVERY_REPORT.md:
        - SDV Key Fields Report: Value field 51.41% missing
        """
        issues = []

        for col in df.columns:
            missing_count = df[col].isna().sum()
            missing_pct = (missing_count / len(df)) * 100

            if missing_pct > 50:
                issues.append(DataQualityIssue(
                    severity='warning',
                    category='high_missing_rate',
                    description=f'Field "{col}" has {missing_pct:.1f}% missing data ({missing_count}/{len(df)} rows)',
                    affected_rows=missing_count,
                    affected_columns=[col]
                ))

        return issues

    def _check_subject_id_consistency(self, file_name: str, df: pd.DataFrame) -> List[DataQualityIssue]:
        """
        Check subject ID format consistency

        From DATA_DISCOVERY_REPORT.md:
        - Multiple formats detected (DUM, CON, Sub)
        - Protocol Deviations uses non-unique subject-only IDs
        """
        issues = []

        subject_info = self.id_mapper.detect_subject_id_column(df, file_name)

        if not subject_info:
            issues.append(DataQualityIssue(
                severity='warning',
                category='missing_subject_id',
                description='No subject ID column detected',
                affected_rows=len(df)
            ))
            return issues

        # Check if subject IDs can be mapped
        if not subject_info['can_map']:
            issues.append(DataQualityIssue(
                severity='error',
                category='unmappable_subject_id',
                description=f'Subject ID format cannot be mapped: {subject_info["transformation_required"]}',
                affected_rows=len(df),
                affected_columns=[subject_info['column_name']]
            ))

        # Check for duplicate subject IDs (within this file)
        subject_col = subject_info['column_name']
        duplicates = df[subject_col].dropna().duplicated().sum()

        if duplicates > 0:
            issues.append(DataQualityIssue(
                severity='info',
                category='duplicate_subject_ids',
                description=f'{duplicates} duplicate subject IDs found (may be expected for multi-row data)',
                affected_rows=duplicates,
                affected_columns=[subject_col]
            ))

        return issues

    def _check_missing_columns(self, file_name: str, df: pd.DataFrame) -> List[DataQualityIssue]:
        """
        Check for expected columns missing from file

        Based on DATA_DISCOVERY_REPORT.md Section 1 (File-by-File Analysis)
        """
        issues = []

        expected_columns = {
            'Adjudication Queries': ['Subject Enrollment Code', 'Center ID', 'Inquiry Status'],
            'EDC_AE Query Report': ['Patient No.', 'Query No.', 'Query Status'],
            'Medical Monitor AE Listing': ['Patient No.', 'Event ID', 'Serious'],
            'Protocol Deviations Report': ['Subject', 'Clinical Site: Site Number', 'Date of PI Acknowledgement'],
            'SDV Key Fields Report': ['Patient no.', 'Form', 'SDV?'],
            'Signature List EDC Report': ['Patient No.', 'Form', 'Signed'],
        }

        for known_file, required_cols in expected_columns.items():
            if known_file.lower() in file_name.lower():
                missing_cols = [col for col in required_cols if col not in df.columns]
                if missing_cols:
                    issues.append(DataQualityIssue(
                        severity='error',
                        category='missing_required_columns',
                        description=f'Required columns missing: {", ".join(missing_cols)}',
                        affected_columns=missing_cols
                    ))

        return issues

    def get_column_info(self, df: pd.DataFrame) -> List[ColumnInfo]:
        """Generate column metadata"""
        column_info = []

        for col in df.columns:
            missing_count = df[col].isna().sum()
            total_rows = len(df)
            missing_pct = (missing_count / total_rows * 100) if total_rows > 0 else 0

            column_info.append(ColumnInfo(
                name=col,
                missing_count=missing_count,
                missing_pct=round(missing_pct, 2),
                total_rows=total_rows,
                data_type=str(df[col].dtype)
            ))

        return column_info

    def detect_orphaned_records(self, all_sources: Dict[str, pd.DataFrame]) -> List[Dict]:
        """
        Detect orphaned records across data sources

        From DATA_DISCOVERY_REPORT.md:
        - Protocol Deviations may have subjects not in other sources due to site code mismatch
        """
        orphaned = []

        # Get all subject IDs from non-Protocol Deviation sources
        all_subject_ids = set()
        for file_name, df in all_sources.items():
            if 'protocol deviation' not in file_name.lower():
                subject_info = self.id_mapper.detect_subject_id_column(df, file_name)
                if subject_info and subject_info['can_map']:
                    ids = df[subject_info['column_name']].dropna().astype(str).unique()
                    all_subject_ids.update(ids)

        # Check Protocol Deviations for orphans
        for file_name, df in all_sources.items():
            if 'protocol deviation' in file_name.lower():
                subject_info = self.id_mapper.detect_subject_id_column(df, file_name)
                if subject_info:
                    pd_subjects = df[subject_info['column_name']].dropna().astype(str).unique()
                    for subject_id in pd_subjects:
                        # Try to find in other sources
                        # Note: This is simplified - real implementation would need site context
                        if subject_id not in all_subject_ids:
                            orphaned.append({
                                'subject_id': subject_id,
                                'source_file': file_name,
                                'reason': 'Subject ID not found in other data sources (possible site code mismatch)'
                            })

        return orphaned
