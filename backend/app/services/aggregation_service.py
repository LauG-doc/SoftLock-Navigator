"""
Aggregation service for site-level and dashboard metrics
"""
from typing import List, Dict
from collections import Counter
from app.models.subject import SubjectReadiness, SiteAggregate, DashboardSummary


class AggregationService:
    """Aggregate subject readiness data for sites and dashboard"""

    def aggregate_by_site(self, subjects: List[SubjectReadiness]) -> List[SiteAggregate]:
        """Aggregate subjects by site"""
        if not subjects:
            return []

        # Group by site
        sites_data: Dict[str, List[SubjectReadiness]] = {}
        for subject in subjects:
            if subject.site_id not in sites_data:
                sites_data[subject.site_id] = []
            sites_data[subject.site_id].append(subject)

        # Calculate aggregates
        site_aggregates = []
        for site_id, site_subjects in sites_data.items():
            total = len(site_subjects)
            ready = sum(1 for s in site_subjects if s.ready_to_soft_lock)
            blocked = total - ready
            readiness_pct = (ready / total * 100) if total > 0 else 0

            # Count blockers
            blocked_by_queries = sum(1 for s in site_subjects if not s.ready_ae_queries)
            blocked_by_adj = sum(1 for s in site_subjects if not s.ready_adjudication)
            blocked_by_sig = sum(1 for s in site_subjects if not s.ready_signature)
            blocked_by_pd = sum(1 for s in site_subjects if not s.ready_pd)
            blocked_by_sdv = sum(1 for s in site_subjects if not s.ready_sdv)

            # Most common blocker
            blockers = [s.primary_blocker for s in site_subjects if s.primary_blocker]
            most_common = Counter(blockers).most_common(1)[0][0] if blockers else None

            # Average blockers per subject
            avg_blockers = sum(s.blocker_count for s in site_subjects) / total if total > 0 else 0

            site_aggregates.append(SiteAggregate(
                site_id=site_id,
                total_subjects=total,
                ready_count=ready,
                blocked_count=blocked,
                readiness_pct=round(readiness_pct, 1),
                blocked_by_queries=blocked_by_queries,
                blocked_by_adjudications=blocked_by_adj,
                blocked_by_signatures=blocked_by_sig,
                blocked_by_deviations=blocked_by_pd,
                blocked_by_sdv=blocked_by_sdv,
                most_common_blocker=most_common,
                avg_blockers_per_subject=round(avg_blockers, 1)
            ))

        # Sort by readiness % descending
        site_aggregates.sort(key=lambda x: x.readiness_pct, reverse=True)

        return site_aggregates

    def create_dashboard_summary(self, subjects: List[SubjectReadiness], sites: List[SiteAggregate]) -> DashboardSummary:
        """Create dashboard summary metrics"""
        if not subjects:
            return DashboardSummary(
                total_subjects=0,
                ready_count=0,
                blocked_count=0,
                readiness_pct=0,
                total_sites=0,
                sites_above_90_pct=0,
                sites_below_60_pct=0,
                blocked_by_queries=0,
                blocked_by_adjudications=0,
                blocked_by_signatures=0,
                blocked_by_deviations=0,
                blocked_by_sdv=0,
                blocked_by_mm_review=0,
                mm_ae_coverage_pct=100.0,
                actionable_blocked_count=0,
                data_quality_only_count=0,
                critical_adjudications=0,
                high_query_volume=0,
                data_quality_warnings=0,
                test_data_excluded=True,
                orphaned_subjects=0
            )

        # Overall metrics
        total_subjects = len(subjects)
        ready_count = sum(1 for s in subjects if s.ready_to_soft_lock)
        blocked_count = total_subjects - ready_count
        readiness_pct = (ready_count / total_subjects * 100) if total_subjects > 0 else 0

        # Site metrics
        total_sites = len(sites)
        sites_above_90 = sum(1 for s in sites if s.readiness_pct >= 90)
        sites_below_60 = sum(1 for s in sites if s.readiness_pct < 60)

        # Blocker distribution
        blocked_by_queries = sum(1 for s in subjects if not s.ready_ae_queries)
        blocked_by_adj = sum(1 for s in subjects if not s.ready_adjudication)
        blocked_by_sig = sum(1 for s in subjects if not s.ready_signature)
        blocked_by_pd = sum(1 for s in subjects if not s.ready_pd)
        blocked_by_sdv = sum(1 for s in subjects if not s.ready_sdv)
        blocked_by_mm = sum(1 for s in subjects if not s.ready_mm_ae)
        mm_ae_coverage_pct = ((total_subjects - blocked_by_mm) / total_subjects * 100) if total_subjects > 0 else 100.0

        # Subjects that are operationally ready but still carry data-quality warnings
        data_quality_only_count = sum(
            1 for s in subjects
            if s.ready_to_soft_lock and len(s.data_quality_flags) > 0
        )
        actionable_blocked_count = blocked_count

        # Critical issues
        critical_adj = sum(1 for s in subjects
                          if s.max_adjudication_days_open and s.max_adjudication_days_open > 90)
        high_query_volume = sum(1 for s in subjects if s.open_query_count > 10)

        # Data quality
        dq_warnings = sum(len(s.data_quality_flags) for s in subjects)

        return DashboardSummary(
            total_subjects=total_subjects,
            ready_count=ready_count,
            blocked_count=blocked_count,
            readiness_pct=round(readiness_pct, 1),
            total_sites=total_sites,
            sites_above_90_pct=sites_above_90,
            sites_below_60_pct=sites_below_60,
            blocked_by_queries=blocked_by_queries,
            blocked_by_adjudications=blocked_by_adj,
            blocked_by_signatures=blocked_by_sig,
            blocked_by_deviations=blocked_by_pd,
            blocked_by_sdv=blocked_by_sdv,
            blocked_by_mm_review=blocked_by_mm,
            mm_ae_coverage_pct=round(mm_ae_coverage_pct, 1),
            actionable_blocked_count=actionable_blocked_count,
            data_quality_only_count=data_quality_only_count,
            critical_adjudications=critical_adj,
            high_query_volume=high_query_volume,
            data_quality_warnings=dq_warnings,
            test_data_excluded=True,
            orphaned_subjects=0  # Would need full orphan detection
        )
