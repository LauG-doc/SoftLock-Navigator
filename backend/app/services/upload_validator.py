"""
File upload validation service
Validates uploaded files against expected structure from DATA_DISCOVERY_REPORT.md
"""
from typing import Dict, List, Set
import pandas as pd
from pathlib import Path

from app.models.upload import FileValidationResult
from app.utils.file_loader import FileLoader
from app.utils.id_mapper import IDMapper


class UploadValidator:
    """Validates uploaded files against expected structure"""

    # Expected files and their required columns (from DATA_DISCOVERY_REPORT.md)
    EXPECTED_FILES = {
        'Adjudication Queries.csv': [
            'Subject Enrollment Code',
            'Center ID',
            'Inquiry Status'
        ],
        'EDC_AE Query Report.xlsx': [
            'Patient No.',
            'Query No.',
            'Query Status'
        ],
        'Medical Monitor AE Listing.xlsx': [
            'Patient No.',
            'Event ID',
            'Serious'
        ],
        'Medical Monitor Lab Parameters Review.csv': [
            'C01:Subject'
        ],
        'Protocol Deviations Report.xlsx': [
            'Subject',
            'Clinical Site: Site Number',
            'Date of PI Acknowledgement'
        ],
        'SDV Key Fields Report.csv': [
            'Patient no.',
            'Form',
            'SDV?'
        ],
        'Signature List EDC Report (2).xlsx': [
            'Patient No.',
            'Form',
            'Signed'
        ],
    }

    # Alternative file names (case-insensitive matching)
    FILE_NAME_ALIASES = {
        'signature list edc report.xlsx': 'Signature List EDC Report (2).xlsx',
        'signature list edc report (2).xlsx': 'Signature List EDC Report (2).xlsx',
        'adjudication queries.csv': 'Adjudication Queries.csv',
        'edc_ae query report.xlsx': 'EDC_AE Query Report.xlsx',
        'edc ae query report.xlsx': 'EDC_AE Query Report.xlsx',
        'medical monitor ae listing.xlsx': 'Medical Monitor AE Listing.xlsx',
        'medical monitor lab parameters review.csv': 'Medical Monitor Lab Parameters Review.csv',
        'protocol deviations report.xlsx': 'Protocol Deviations Report.xlsx',
        'sdv key fields report.csv': 'SDV Key Fields Report.csv',
    }

    def __init__(self):
        self.loader = FileLoader()
        self.id_mapper = IDMapper()

    def validate_uploaded_file(self, file_path: Path, original_filename: str) -> FileValidationResult:
        """
        Validate a single uploaded file

        Checks:
        1. Is this file expected/recognized?
        2. Can we load it (CSV/Excel format valid)?
        3. Does it have expected columns?
        4. Can we detect subject/site IDs?
        5. Any data quality issues?
        """
        # Normalize filename
        normalized_name = self._normalize_filename(original_filename)
        expected_file = normalized_name in self.EXPECTED_FILES

        if not expected_file:
            return FileValidationResult(
                file_name=original_filename,
                expected=False,
                valid=False,
                errors=[f"File '{original_filename}' is not a recognized data file"]
            )

        expected_columns = self.EXPECTED_FILES[normalized_name]

        try:
            # Load file
            df, metadata, file_type = self.loader.load_file(str(file_path))

            # Get actual columns
            found_columns = list(df.columns)

            # Compare columns
            missing_columns = [col for col in expected_columns if col not in found_columns]
            extra_columns = []  # We allow extra columns

            # Check for subject ID
            subject_info = self.id_mapper.detect_subject_id_column(df, normalized_name)
            subject_id_detected = subject_info is not None and subject_info['can_map']

            # Check for site ID
            site_info = self.id_mapper.detect_site_id_columns(df, normalized_name)
            site_id_detected = site_info is not None

            # Collect errors and warnings
            errors = []
            warnings = []

            if missing_columns:
                errors.append(f"Missing required columns: {', '.join(missing_columns)}")

            if df.empty:
                errors.append("File is empty (0 rows)")
            elif len(df) < 5:
                warnings.append(f"File has only {len(df)} rows - seems unusually small")

            if not subject_id_detected:
                warnings.append("Could not detect subject ID column")

            if not site_id_detected:
                warnings.append("Could not detect site ID column")

            # Check for test data
            if self._contains_test_data(df, normalized_name):
                warnings.append("File may contain test data")

            valid = len(errors) == 0

            return FileValidationResult(
                file_name=original_filename,
                expected=True,
                valid=valid,
                row_count=len(df),
                column_count=len(found_columns),
                expected_columns=expected_columns,
                found_columns=found_columns,
                missing_columns=missing_columns,
                extra_columns=extra_columns,
                subject_id_detected=subject_id_detected,
                site_id_detected=site_id_detected,
                errors=errors,
                warnings=warnings
            )

        except Exception as e:
            return FileValidationResult(
                file_name=original_filename,
                expected=True,
                valid=False,
                errors=[f"Failed to load file: {str(e)}"]
            )

    def validate_upload_batch(self, file_paths: Dict[str, Path]) -> Dict[str, FileValidationResult]:
        """
        Validate a batch of uploaded files
        Returns dict of original_filename -> validation result
        """
        results = {}

        for original_filename, file_path in file_paths.items():
            result = self.validate_uploaded_file(file_path, original_filename)
            results[original_filename] = result

        return results

    def check_completeness(self, validated_files: Dict[str, FileValidationResult]) -> List[str]:
        """
        Check if all required files are present and valid
        Returns list of missing required files
        """
        # Get normalized names of uploaded files
        uploaded_normalized = set()
        for filename, result in validated_files.items():
            if result.valid:
                normalized = self._normalize_filename(filename)
                uploaded_normalized.add(normalized)

        # Check what's missing
        required_files = set(self.EXPECTED_FILES.keys())
        missing = required_files - uploaded_normalized

        return list(missing)

    def _normalize_filename(self, filename: str) -> str:
        """
        Normalize filename to canonical form
        Case-insensitive matching with aliases
        """
        lower_name = filename.lower().strip()

        # Check direct match
        for expected_name in self.EXPECTED_FILES.keys():
            if lower_name == expected_name.lower():
                return expected_name

        # Check aliases
        if lower_name in self.FILE_NAME_ALIASES:
            return self.FILE_NAME_ALIASES[lower_name]

        # Return as-is if no match
        return filename

    def _contains_test_data(self, df: pd.DataFrame, file_name: str) -> bool:
        """Check if file contains test data markers"""
        # Check for explicit test data warnings
        for col in df.columns:
            if df[col].dtype == 'object':
                test_matches = df[col].astype(str).str.contains(
                    'test data|sample data|not for clinical use',
                    case=False,
                    na=False
                )
                if test_matches.any():
                    return True

        # Check for test sheets (should be filtered by loader)
        if 'test' in file_name.lower():
            return True

        return False
