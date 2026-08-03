"""
Readiness API endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.models.subject import (
    SubjectsResponse, SubjectDetailResponse,
    SitesResponse, DashboardSummary
)
from app.services.readiness_service import ReadinessService
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/api", tags=["readiness"])

# Initialize services (singleton pattern)
ingestion_service = IngestionService()
readiness_service = ReadinessService(ingestion_service)


@router.get("/subjects", response_model=SubjectsResponse)
async def get_subjects(
    status: Optional[str] = Query(None, regex="^(ready|blocked|warning)$")
):
    """
    Get all subjects with readiness status

    Query Parameters:
    - status: Filter by status ('ready', 'blocked', 'warning')

    Returns consolidated row per subject with:
    - site_id, subject_id
    - 7 readiness flags (signature, adjudication, ae_queries, mm_ae, mm_lab, pd, sdv)
    - ready_to_soft_lock (overall status)
    - casebook_needs_action (action required flag)
    - primary_blocker (top priority issue)
    - Detailed metrics (query count, adjudication count, SDV %, etc.)
    """
    try:
        return readiness_service.get_all_subjects(status_filter=status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subjects: {str(e)}")


@router.get("/subjects/{subject_id}", response_model=SubjectDetailResponse)
async def get_subject_detail(subject_id: str):
    """
    Get detailed readiness for a single subject

    Returns SubjectReadiness plus drill-down lists:
    - open_queries: List of open queries with details
    - open_adjudications: List of pending adjudications
    - missing_signatures: List of required signatures not obtained
    - unacknowledged_deviations: List of deviations pending acknowledgment
    - sdv_by_form: SDV completion breakdown by form

    Path Parameters:
    - subject_id: Subject identifier (e.g., DUM-10001-00042)
    """
    try:
        return readiness_service.get_subject_detail(subject_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subject detail: {str(e)}")


@router.get("/sites", response_model=SitesResponse)
async def get_sites():
    """
    Get site-level aggregate metrics

    Returns for each site:
    - site_id
    - total_subjects, ready_count, blocked_count
    - readiness_pct
    - Blocker breakdown (queries, adjudications, signatures, deviations, SDV)
    - most_common_blocker
    - avg_blockers_per_subject

    Sorted by readiness_pct descending
    """
    try:
        return readiness_service.get_sites()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sites: {str(e)}")


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary():
    """
    Get dashboard KPI summary

    Returns:
    - Overall: total_subjects, ready_count, blocked_count, readiness_pct
    - By site: total_sites, sites_above_90_pct, sites_below_60_pct
    - Blocker distribution: counts by blocker type
    - Critical issues: critical_adjudications (>90 days), high_query_volume (>10 queries)
    - Data quality: warnings count, test_data_excluded flag, orphaned_subjects count
    """
    try:
        return readiness_service.get_dashboard_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard summary: {str(e)}")
