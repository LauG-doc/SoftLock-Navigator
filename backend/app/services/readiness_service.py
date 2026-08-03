"""
Main readiness service - orchestrates dimension building and readiness calculation
"""
from typing import List, Optional
from app.models.subject import (
    SubjectReadiness, SubjectDetail, SubjectsResponse,
    SubjectDetailResponse, SitesResponse, DashboardSummary
)
from app.services.ingestion_service import IngestionService
from app.services.dimension_builder import DimensionBuilder
from app.services.readiness_engine import ReadinessEngine
from app.services.aggregation_service import AggregationService
from app.utils.id_mapper import IDMapper


class ReadinessService:
    """Main service for readiness calculations"""

    def __init__(self, ingestion_service: IngestionService):
        self.ingestion_service = ingestion_service
        self.id_mapper = IDMapper()
        self.dimension_builder = DimensionBuilder(self.id_mapper)
        self.aggregation_service = AggregationService()

        # Cache
        self._subjects_cache: Optional[List[SubjectReadiness]] = None
        self._detail_cache: dict = {}

    def get_all_subjects(self, status_filter: Optional[str] = None) -> SubjectsResponse:
        """
        Get all subjects with readiness status
        Optional filter: 'ready', 'blocked', 'warning'
        """
        subjects = self._get_or_calculate_subjects()

        # Apply filter
        if status_filter:
            if status_filter == 'ready':
                subjects = [s for s in subjects if s.ready_to_soft_lock]
            elif status_filter == 'blocked':
                subjects = [s for s in subjects if not s.ready_to_soft_lock]
            elif status_filter == 'warning':
                subjects = [s for s in subjects if s.blocker_count > 0 and s.blocker_count <= 2]

        ready_count = sum(1 for s in subjects if s.ready_to_soft_lock)
        blocked_count = len(subjects) - ready_count

        return SubjectsResponse(
            subjects=subjects,
            total=len(subjects),
            ready=ready_count,
            blocked=blocked_count
        )

    def get_subject_detail(self, subject_id: str) -> SubjectDetailResponse:
        """Get detailed readiness for a single subject"""

        # Check cache
        if subject_id in self._detail_cache:
            return SubjectDetailResponse(subject=self._detail_cache[subject_id], exists=True)

        # Find in calculated subjects
        subjects = self._get_or_calculate_subjects()
        subject_readiness = next((s for s in subjects if s.subject_id == subject_id), None)

        if not subject_readiness:
            return SubjectDetailResponse(
                subject=SubjectDetail(
                    site_id='',
                    subject_id=subject_id,
                    ready_signature=False,
                    ready_adjudication=False,
                    ready_ae_queries=False,
                    ready_mm_ae=False,
                    ready_mm_lab=False,
                    ready_pd=False,
                    ready_sdv=False,
                    ready_to_soft_lock=False,
                    casebook_needs_action=False,
                    blocker_count=0
                ),
                exists=False
            )

        # Create detail object with drill-down lists
        detail = SubjectDetail(
            **subject_readiness.dict(),
            open_queries=self._get_open_queries(subject_id),
            open_adjudications=self._get_open_adjudications(subject_id),
            missing_signatures=self._get_missing_signatures(subject_id),
            unacknowledged_deviations=self._get_unacknowledged_deviations(subject_id),
            sdv_by_form=self._get_sdv_by_form(subject_id)
        )

        # Cache
        self._detail_cache[subject_id] = detail

        return SubjectDetailResponse(subject=detail, exists=True)

    def get_sites(self) -> SitesResponse:
        """Get site-level aggregates"""
        subjects = self._get_or_calculate_subjects()
        sites = self.aggregation_service.aggregate_by_site(subjects)

        avg_readiness = sum(s.readiness_pct for s in sites) / len(sites) if sites else 0

        return SitesResponse(
            sites=sites,
            total_sites=len(sites),
            avg_readiness_pct=round(avg_readiness, 1)
        )

    def get_dashboard_summary(self) -> DashboardSummary:
        """Get dashboard KPI summary"""
        subjects = self._get_or_calculate_subjects()
        sites_response = self.get_sites()

        return self.aggregation_service.create_dashboard_summary(
            subjects,
            sites_response.sites
        )

    def _get_or_calculate_subjects(self) -> List[SubjectReadiness]:
        """Get cached subjects or calculate if not cached"""
        if self._subjects_cache is not None:
            return self._subjects_cache

        # Load dataframes
        dataframes = self.ingestion_service._loaded_dataframes

        if not dataframes:
            # Need to load first
            self.ingestion_service.ingest_all_files()
            dataframes = self.ingestion_service._loaded_dataframes

        # Build dimensions
        dim_subject = self.dimension_builder.build_subject_dimension(dataframes)
        crosswalk = self.dimension_builder.build_site_crosswalk(dataframes)
        subject_mapping = self.dimension_builder.get_subject_site_mapping(dim_subject, crosswalk)

        # Calculate readiness
        engine = ReadinessEngine(dataframes, subject_mapping)
        subjects = engine.calculate_readiness_all_subjects()

        # Cache
        self._subjects_cache = subjects

        return subjects

    def _get_open_queries(self, subject_id: str) -> List[dict]:
        """Get list of open queries for subject detail"""
        dataframes = self.ingestion_service._loaded_dataframes

        for fname, df in dataframes.items():
            if 'edc_ae query' in fname.lower():
                if 'Patient No.' in df.columns and 'Query No.' in df.columns:
                    subject_df = df[
                        (df['Patient No.'] == subject_id) &
                        (df['Query No.'].notna()) &
                        (df['Query Status'] != 'Closed')
                    ]

                    queries = []
                    for _, row in subject_df.head(10).iterrows():  # Limit to 10
                        queries.append({
                            'query_no': str(row.get('Query No.', '')),
                            'query_text': str(row.get('Query Text', ''))[:100],
                            'status': str(row.get('Query Status', '')),
                            'issued_on': str(row.get('Query Issued On', ''))
                        })
                    return queries
        return []

    def _get_open_adjudications(self, subject_id: str) -> List[dict]:
        """Get list of open adjudications for subject detail"""
        dataframes = self.ingestion_service._loaded_dataframes

        for fname, df in dataframes.items():
            if 'adjudication' in fname.lower():
                if 'Subject Enrollment Code' in df.columns:
                    subject_df = df[
                        (df['Subject Enrollment Code'] == subject_id) &
                        (df['Inquiry Status'] != 'Closed')
                    ]

                    adjudications = []
                    for _, row in subject_df.iterrows():
                        adjudications.append({
                            'event_type': str(row.get('Event Type', '')),
                            'inquiry_status': str(row.get('Inquiry Status', '')),
                            'days_open': int(row.get('Days in Open/to Close State', 0)) if pd.notna(row.get('Days in Open/to Close State')) else 0
                        })
                    return adjudications
        return []

    def _get_missing_signatures(self, subject_id: str) -> List[dict]:
        """Get list of missing signatures"""
        # Simplified - check if Investigator signature on Randomization is missing
        dataframes = self.ingestion_service._loaded_dataframes

        for fname, df in dataframes.items():
            if 'signature list' in fname.lower():
                if 'Patient No.' in df.columns:
                    subject_df = df[df['Patient No.'] == subject_id]

                    req_sig = subject_df[
                        (subject_df['Form'] == 'Randomization') &
                        (subject_df['Signature'] == 'Investigator signature')
                    ]

                    if req_sig.empty:
                        return [{'form': 'Randomization', 'signature_type': 'Investigator signature'}]

                    signed_val = req_sig['Signed'].iloc[0]
                    if pd.isna(signed_val) or str(signed_val) in ['', 'nan', '☐']:
                        return [{'form': 'Randomization', 'signature_type': 'Investigator signature'}]
        return []

    def _get_unacknowledged_deviations(self, subject_id: str) -> List[dict]:
        """Get unacknowledged deviations"""
        # Simplified - subject mapping issue makes this unreliable
        return []

    def _get_sdv_by_form(self, subject_id: str) -> List[dict]:
        """Get SDV completion by form"""
        dataframes = self.ingestion_service._loaded_dataframes

        for fname, df in dataframes.items():
            if 'sdv key fields' in fname.lower():
                if 'Patient no.' in df.columns:
                    subject_df = df[df['Patient no.'] == subject_id]

                    if 'Form' in subject_df.columns and 'SDV?' in subject_df.columns:
                        forms_data = []
                        for form in subject_df['Form'].unique():
                            form_df = subject_df[subject_df['Form'] == form]
                            total = len(form_df)
                            completed = len(form_df[form_df['SDV?'] == 'yes'])
                            pct = (completed / total * 100) if total > 0 else 0

                            forms_data.append({
                                'form': str(form),
                                'total_fields': total,
                                'completed': completed,
                                'pct_complete': round(pct, 1)
                            })
                        return forms_data[:10]  # Limit to 10
        return []


# Fix import
import pandas as pd
