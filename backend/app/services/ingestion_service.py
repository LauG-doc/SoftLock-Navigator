"""
Data ingestion service - orchestrates file loading and validation
"""
from typing import List, Dict
from pathlib import Path
import pandas as pd

from app.models.data_source import (
    DataSourceInfo,
    SheetInfo,
    SubjectIDMapping,
    SiteIDMapping,
    ValidationSummary,
    SourcesResponse,
    DataQualityResponse
)
from app.utils.file_loader import FileLoader
from app.utils.id_mapper import IDMapper
from app.services.validation_service import ValidationService


class IngestionService:
    """
    Main service for data ingestion and validation

    Based on DATA_DISCOVERY_REPORT.md:
    - 7 files to load
    - Multiple formats (CSV, XLSX)
    - Various subject/site ID formats
    - Known data quality issues
    """

    # Expected files from DATA_DISCOVERY_REPORT.md Section 1
    EXPECTED_FILES = [
        'Adjudication Queries.csv',
        'EDC_AE Query Report.xlsx',
        'Medical Monitor AE Listing.xlsx',
        'Medical Monitor Lab Parameters Review.csv',
        'Protocol Deviations Report.xlsx',
        'SDV Key Fields Report.csv',
        'Signature List EDC Report (2).xlsx',
    ]

    def __init__(self, context_dir: str = "../context"):
        self.context_dir = Path(context_dir)
        self.loader = FileLoader(context_dir)
        self.id_mapper = IDMapper()
        self.validator = ValidationService()
        self._loaded_sources: Dict[str, DataSourceInfo] = {}
        self._loaded_dataframes: Dict[str, pd.DataFrame] = {}

    def ingest_all_files(self) -> SourcesResponse:
        """
        Load and validate all expected files

        Returns complete sources response with validation summary
        """
        sources: List[DataSourceInfo] = []
        total_rows = 0
        all_subject_ids = set()
        all_site_ids = set()
        subject_formats = set()
        site_formats = set()
        critical_issues = 0
        warnings = 0
        test_data_detected = False

        for file_name in self.EXPECTED_FILES:
            try:
                source_info = self._load_and_validate_file(file_name)
                sources.append(source_info)

                # Store for later access
                self._loaded_sources[file_name] = source_info

                # Aggregate metrics
                total_rows += source_info.row_count

                if source_info.subject_id_mapping:
                    subject_formats.add(source_info.subject_id_mapping.format_pattern)

                if source_info.site_id_mapping:
                    site_formats.add(source_info.site_id_mapping.format_pattern)

                # Count issues
                for issue in source_info.data_quality_issues:
                    if issue.severity == 'error':
                        critical_issues += 1
                    elif issue.severity == 'warning':
                        warnings += 1

                if source_info.test_data_detected:
                    test_data_detected = True

            except FileNotFoundError:
                # File missing
                source_info = DataSourceInfo(
                    file_name=file_name,
                    file_path=str(self.context_dir / file_name),
                    file_type='unknown',
                    row_count=0,
                    columns=[],
                    data_quality_issues=[],
                    is_loaded=False,
                    load_error=f'File not found: {file_name}'
                )
                sources.append(source_info)
                critical_issues += 1

            except Exception as e:
                # Load error
                source_info = DataSourceInfo(
                    file_name=file_name,
                    file_path=str(self.context_dir / file_name),
                    file_type='unknown',
                    row_count=0,
                    columns=[],
                    data_quality_issues=[],
                    is_loaded=False,
                    load_error=str(e)
                )
                sources.append(source_info)
                critical_issues += 1

        # Count unique subjects and sites (approximate - would need full crosswalk)
        total_subjects = len(all_subject_ids)
        total_sites = len(all_site_ids)

        # Create validation summary
        summary = ValidationSummary(
            total_files=len(self.EXPECTED_FILES),
            loaded_files=len([s for s in sources if s.is_loaded]),
            failed_files=len([s for s in sources if not s.is_loaded]),
            total_rows=total_rows,
            total_subjects=total_subjects if total_subjects > 0 else 0,
            total_sites=total_sites if total_sites > 0 else 0,
            subject_id_formats=list(subject_formats),
            site_id_formats=list(site_formats),
            critical_issues=critical_issues,
            warnings=warnings,
            test_data_contamination=test_data_detected
        )

        return SourcesResponse(sources=sources, summary=summary)

    def _load_and_validate_file(self, file_name: str) -> DataSourceInfo:
        """Load and validate a single file"""

        # Load file
        df, metadata, file_type = self.loader.load_file(file_name)

        # Store dataframe for later use
        self._loaded_dataframes[file_name] = df

        # Detect subject ID mapping
        subject_mapping = self.id_mapper.detect_subject_id_column(df, file_name)
        subject_id_mapping = None
        if subject_mapping:
            subject_id_mapping = SubjectIDMapping(**subject_mapping)

        # Detect site ID mapping
        site_mapping = self.id_mapper.detect_site_id_columns(df, file_name)
        site_id_mapping = None
        if site_mapping:
            site_id_mapping = SiteIDMapping(**site_mapping)

        # Validate
        issues = self.validator.validate_file(file_name, df)

        # Test data detection
        test_data = self.validator._detect_test_data(file_name, df)

        # Get column info
        column_info = self.validator.get_column_info(df)

        # Sheet info (for Excel files)
        sheet_info = None
        if metadata.get('sheets'):
            sheet_info = [SheetInfo(**s) for s in metadata['sheets']]

        return DataSourceInfo(
            file_name=file_name,
            file_path=str(self.context_dir / file_name),
            file_type=file_type,
            row_count=len(df),
            sheets=sheet_info,
            columns=column_info,
            subject_id_mapping=subject_id_mapping,
            site_id_mapping=site_id_mapping,
            data_quality_issues=issues,
            test_data_detected=test_data,
            is_loaded=True,
            load_error=None
        )

    def get_data_quality_report(self) -> DataQualityResponse:
        """
        Generate comprehensive data quality report

        Based on DATA_DISCOVERY_REPORT.md Section 6
        """
        if not self._loaded_sources:
            # Need to load files first
            self.ingest_all_files()

        # Group issues by severity
        issues_by_severity = {'error': [], 'warning': [], 'info': []}
        issues_by_file = {}

        for file_name, source in self._loaded_sources.items():
            if not source.is_loaded:
                continue

            issues_by_file[file_name] = source.data_quality_issues

            for issue in source.data_quality_issues:
                issues_by_severity[issue.severity].append({
                    'file': file_name,
                    'category': issue.category,
                    'description': issue.description,
                    'affected_rows': issue.affected_rows,
                    'affected_columns': issue.affected_columns
                })

        # Detect orphaned records
        orphaned = self.validator.detect_orphaned_records(self._loaded_dataframes)

        # Missing data summary (from DATA_DISCOVERY_REPORT.md)
        missing_data_summary = [
            {
                'file': 'Medical Monitor AE Listing.xlsx',
                'field': 'MM Initials and Date',
                'missing_pct': 100.0,
                'impact': 'BLOCKER for Rule 1 (SAE Resolution) - cannot validate MM review'
            },
            {
                'file': 'Protocol Deviations Report.xlsx',
                'field': 'MSO Review Date',
                'missing_pct': 100.0,
                'impact': 'Cannot track MSO review timeline'
            },
            {
                'file': 'SDV Key Fields Report.csv',
                'field': 'Value',
                'missing_pct': 51.41,
                'impact': 'Cannot validate data-level SDV'
            }
        ]

        # Test data files
        test_data_files = [
            source.file_name
            for source in self._loaded_sources.values()
            if source.test_data_detected
        ]

        return DataQualityResponse(
            issues_by_severity=issues_by_severity,
            issues_by_file=issues_by_file,
            orphaned_records=orphaned,
            missing_data_summary=missing_data_summary,
            test_data_files=test_data_files
        )

    def get_sources(self) -> SourcesResponse:
        """Get cached sources or load if not already loaded"""
        if not self._loaded_sources:
            return self.ingest_all_files()

        sources = list(self._loaded_sources.values())

        # Rebuild summary
        summary = ValidationSummary(
            total_files=len(self.EXPECTED_FILES),
            loaded_files=len([s for s in sources if s.is_loaded]),
            failed_files=len([s for s in sources if not s.is_loaded]),
            total_rows=sum(s.row_count for s in sources),
            total_subjects=0,  # Would need full analysis
            total_sites=0,
            subject_id_formats=list(set(
                s.subject_id_mapping.format_pattern
                for s in sources
                if s.subject_id_mapping
            )),
            site_id_formats=list(set(
                s.site_id_mapping.format_pattern
                for s in sources
                if s.site_id_mapping
            )),
            critical_issues=sum(
                len([i for i in s.data_quality_issues if i.severity == 'error'])
                for s in sources
            ),
            warnings=sum(
                len([i for i in s.data_quality_issues if i.severity == 'warning'])
                for s in sources
            ),
            test_data_contamination=any(s.test_data_detected for s in sources)
        )

        return SourcesResponse(sources=sources, summary=summary)
