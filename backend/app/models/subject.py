"""
Subject models and readiness status
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SubjectReadiness(BaseModel):
    """Subject readiness status - one row per subject"""
    # Identifiers
    site_id: str
    subject_id: str

    # Readiness flags (True = ready, False = blocker)
    ready_signature: bool = Field(description="All required signatures obtained")
    ready_adjudication: bool = Field(description="No pending adjudications")
    ready_ae_queries: bool = Field(description="All AE queries closed")
    ready_mm_ae: bool = Field(description="MM AE review complete (degraded - data not available)")
    ready_mm_lab: bool = Field(description="MM Lab review complete (test data excluded)")
    ready_pd: bool = Field(description="Protocol deviations acknowledged")
    ready_sdv: bool = Field(description="SDV completion sufficient")

    # Overall status
    ready_to_soft_lock: bool = Field(description="All readiness checks passed")
    casebook_needs_action: bool = Field(description="Casebook team action required")

    # Primary blocker
    primary_blocker: Optional[str] = Field(
        None,
        description="Primary blocking issue (null if ready)"
    )

    # Detailed metrics
    open_query_count: int = 0
    open_adjudication_count: int = 0
    max_adjudication_days_open: Optional[int] = None
    sdv_completion_pct: Optional[float] = None
    missing_signatures_count: int = 0
    unacknowledged_deviation_count: int = 0

    # Metadata
    blocker_count: int = Field(description="Total number of failing readiness checks")
    data_quality_flags: List[str] = Field(default_factory=list, description="Data quality warnings")


class SubjectDetail(SubjectReadiness):
    """Extended subject detail with drill-down data"""
    # Additional detail lists
    open_queries: List[Dict[str, Any]] = Field(default_factory=list)
    open_adjudications: List[Dict[str, Any]] = Field(default_factory=list)
    missing_signatures: List[Dict[str, Any]] = Field(default_factory=list)
    unacknowledged_deviations: List[Dict[str, Any]] = Field(default_factory=list)
    sdv_by_form: List[Dict[str, Any]] = Field(default_factory=list)


class SiteAggregate(BaseModel):
    """Site-level aggregate metrics"""
    site_id: str
    site_name: Optional[str] = None
    total_subjects: int
    ready_count: int
    blocked_count: int
    readiness_pct: float

    # Blocker breakdown
    blocked_by_queries: int = 0
    blocked_by_adjudications: int = 0
    blocked_by_signatures: int = 0
    blocked_by_deviations: int = 0
    blocked_by_sdv: int = 0

    # Most common blocker
    most_common_blocker: Optional[str] = None
    avg_blockers_per_subject: float = 0


class DashboardSummary(BaseModel):
    """Dashboard KPI summary"""
    # Overall metrics
    total_subjects: int
    ready_count: int
    blocked_count: int
    readiness_pct: float

    # By site
    total_sites: int
    sites_above_90_pct: int
    sites_below_60_pct: int

    # Blocker distribution
    blocked_by_queries: int
    blocked_by_adjudications: int
    blocked_by_signatures: int
    blocked_by_deviations: int
    blocked_by_sdv: int
    blocked_by_mm_review: int
    mm_ae_coverage_pct: float

    # Actionability split
    actionable_blocked_count: int
    data_quality_only_count: int

    # Critical issues
    critical_adjudications: int = Field(description="Adjudications open >90 days")
    high_query_volume: int = Field(description="Subjects with >10 open queries")

    # Data quality
    data_quality_warnings: int
    test_data_excluded: bool
    orphaned_subjects: int


class SubjectsResponse(BaseModel):
    """Response for GET /api/subjects"""
    subjects: List[SubjectReadiness]
    total: int
    ready: int
    blocked: int


class SubjectDetailResponse(BaseModel):
    """Response for GET /api/subjects/{subject_id}"""
    subject: SubjectDetail
    exists: bool = True


class SitesResponse(BaseModel):
    """Response for GET /api/sites"""
    sites: List[SiteAggregate]
    total_sites: int
    avg_readiness_pct: float
