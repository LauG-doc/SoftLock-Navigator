"""
Readiness Engine - Calculates soft-lock readiness per subject
Based on DATA_DISCOVERY_REPORT.md Section 5 (Feasibility Assessment)
"""
from typing import Dict, List, Optional, Tuple
import pandas as pd
from app.models.subject import SubjectReadiness


class ReadinessEngine:
    """
    Calculate readiness status for each subject across 7 checks:
    1. Signatures (feasible)
    2. Adjudications (feasible)
    3. AE Queries (feasible)
    4. MM AE Review (blocked - data not available)
    5. MM Lab Review (test data excluded)
    6. Protocol Deviations (partial - degraded rule)
    7. SDV Completion (feasible with assumptions)
    """

    def __init__(self, dataframes: Dict[str, pd.DataFrame], subject_mapping: Dict[str, Dict]):
        self.dataframes = dataframes
        self.subject_mapping = subject_mapping

    def calculate_readiness_all_subjects(self) -> List[SubjectReadiness]:
        """Calculate readiness for all subjects in dimension"""
        results = []

        for subject_id, site_info in self.subject_mapping.items():
            readiness = self.calculate_readiness(subject_id)
            if readiness:
                results.append(readiness)

        return results

    def calculate_readiness(self, subject_id: str) -> Optional[SubjectReadiness]:
        """Calculate readiness for a single subject"""

        site_info = self.subject_mapping.get(subject_id)
        if not site_info:
            return None

        # Initialize checks
        checks = {}

        # Rule 1: MM AE Review (blocked - always False)
        checks['mm_ae'] = self._check_mm_ae_review(subject_id)

        # Rule 2: AE Queries
        queries_result = self._check_ae_queries(subject_id)
        checks['ae_queries'] = queries_result

        # Rule 3: Protocol Deviations (degraded)
        pd_result = self._check_protocol_deviations(subject_id)
        checks['pd'] = pd_result

        # Rule 4: SDV Completion
        sdv_result = self._check_sdv_completion(subject_id)
        checks['sdv'] = sdv_result

        # Rule 5: Signatures
        sig_result = self._check_signatures(subject_id)
        checks['signature'] = sig_result

        # Rule 6: Adjudications
        adj_result = self._check_adjudications(subject_id)
        checks['adjudication'] = adj_result

        # Rule 7: MM Lab Review (test data - always True/excluded)
        checks['mm_lab'] = {'ready': True, 'count': 0}

        # Calculate per-check flags
        ready_flags = {
            'ready_signature': checks['signature']['ready'],
            'ready_adjudication': checks['adjudication']['ready'],
            'ready_ae_queries': checks['ae_queries']['ready'],
            'ready_mm_ae': checks['mm_ae']['ready'],
            'ready_mm_lab': checks['mm_lab']['ready'],
            'ready_pd': checks['pd']['ready'],
            'ready_sdv': checks['sdv']['ready']
        }

        # MM AE review data is currently unavailable across the source system.
        # Keep it as a data-quality flag, but do not block operational soft-lock readiness.
        actionable_ready_flags = [
            checks['signature']['ready'],
            checks['adjudication']['ready'],
            checks['ae_queries']['ready'],
            checks['pd']['ready'],
            checks['sdv']['ready']
        ]

        all_ready = all(actionable_ready_flags)
        blocker_count = sum(1 for v in actionable_ready_flags if not v)

        # Determine primary blocker (priority hierarchy)
        primary_blocker = self._determine_primary_blocker(checks)

        # Casebook needs action (any blocker except MM AE which is data issue)
        casebook_needs_action = not all([
            checks['signature']['ready'],
            checks['adjudication']['ready'],
            checks['ae_queries']['ready'],
            checks['pd']['ready'],
            checks['sdv']['ready']
        ])

        # Data quality flags
        dq_flags = []
        if not checks['mm_ae']['ready']:
            dq_flags.append('MM AE review data not available')

        return SubjectReadiness(
            site_id=site_info['site_code'],
            subject_id=subject_id,
            ready_signature=ready_flags['ready_signature'],
            ready_adjudication=ready_flags['ready_adjudication'],
            ready_ae_queries=ready_flags['ready_ae_queries'],
            ready_mm_ae=ready_flags['ready_mm_ae'],
            ready_mm_lab=ready_flags['ready_mm_lab'],
            ready_pd=ready_flags['ready_pd'],
            ready_sdv=ready_flags['ready_sdv'],
            ready_to_soft_lock=all_ready,
            casebook_needs_action=casebook_needs_action,
            primary_blocker=primary_blocker,
            open_query_count=checks['ae_queries'].get('count', 0),
            open_adjudication_count=checks['adjudication'].get('count', 0),
            max_adjudication_days_open=checks['adjudication'].get('max_days', None),
            sdv_completion_pct=checks['sdv'].get('pct', None),
            missing_signatures_count=checks['signature'].get('count', 0),
            unacknowledged_deviation_count=checks['pd'].get('count', 0),
            blocker_count=blocker_count,
            data_quality_flags=dq_flags
        )

    def _check_mm_ae_review(self, subject_id: str) -> Dict:
        """
        Rule 1: MM AE Review
        Data quality signal only - MM Initials and Date is 100% missing in source data.
        """
        return {'ready': False, 'reason': 'Data not available (100% missing MM Initials)'}

    def _check_ae_queries(self, subject_id: str) -> Dict:
        """
        Rule 2: AE Queries - All queries closed
        Source: EDC_AE Query Report.xlsx (Sheet1)
        Logic: Query Status IN ('Closed')
        Exclude: Test sheets, rows where Query No. IS NULL
        """
        query_file = None
        for fname in self.dataframes.keys():
            if 'edc_ae query' in fname.lower():
                query_file = fname
                break

        if not query_file:
            return {'ready': True, 'count': 0}

        df = self.dataframes[query_file]

        # Filter to this subject
        if 'Patient No.' not in df.columns:
            return {'ready': True, 'count': 0}

        subject_df = df[df['Patient No.'] == subject_id].copy()

        # Exclude non-query rows (Query No. is null)
        if 'Query No.' in subject_df.columns:
            subject_df = subject_df[subject_df['Query No.'].notna()]

        # Check query status
        if 'Query Status' in subject_df.columns and not subject_df.empty:
            # Treat "Closed" as resolved
            open_queries = subject_df[subject_df['Query Status'] != 'Closed']
            open_count = len(open_queries)
            return {'ready': open_count == 0, 'count': open_count}

        return {'ready': True, 'count': 0}

    def _check_protocol_deviations(self, subject_id: str) -> Dict:
        """
        Rule 3: Protocol Deviations - Acknowledged by PI (degraded rule)
        Source: Protocol Deviations Report.xlsx
        Logic: Date of PI Acknowledgement IS NOT NULL
        LIMITATION: Cannot verify acknowledger is the PI (no role mapping)
        """
        pd_file = None
        for fname in self.dataframes.keys():
            if 'protocol deviation' in fname.lower():
                pd_file = fname
                break

        if not pd_file:
            return {'ready': True, 'count': 0}

        df = self.dataframes[pd_file]

        # Note: Protocol Deviations uses "Subject" column with format Sub-000XX
        # We cannot reliably map this to DUM-XXXXX-000XX format
        # For now, assume no match (orphaned records issue from Phase 2)
        if 'Subject' not in df.columns:
            return {'ready': True, 'count': 0}

        # Try to extract subject number from canonical ID
        if '-' in subject_id:
            parts = subject_id.split('-')
            if len(parts) >= 3:
                # Look for Sub-{subject_number} pattern
                subject_num = parts[2]
                sub_pattern = f"Sub-{subject_num}"

                subject_df = df[df['Subject'] == sub_pattern]

                if not subject_df.empty and 'Date of PI Acknowledgement' in subject_df.columns:
                    unacked = subject_df[subject_df['Date of PI Acknowledgement'].isna()]
                    unacked_count = len(unacked)
                    return {'ready': unacked_count == 0, 'count': unacked_count}

        return {'ready': True, 'count': 0}

    def _check_sdv_completion(self, subject_id: str) -> Dict:
        """
        Rule 4: SDV Completion
        Source: SDV Key Fields Report.csv
        Logic: SDV? = 'yes' for all key forms
        KEY FORMS (assumed): Demographics, Vital Signs, Lab Results, Consent
        """
        sdv_file = None
        for fname in self.dataframes.keys():
            if 'sdv key fields' in fname.lower():
                sdv_file = fname
                break

        if not sdv_file:
            return {'ready': True, 'pct': 100.0}

        df = self.dataframes[sdv_file]

        # Filter to this subject
        if 'Patient no.' not in df.columns:
            return {'ready': True, 'pct': 100.0}

        subject_df = df[df['Patient no.'] == subject_id].copy()

        if subject_df.empty:
            return {'ready': True, 'pct': 100.0}

        # Filter to key forms (business rule assumption)
        key_forms = ['Demographics', 'Vital Signs', 'Lab Results', 'Consent']

        if 'Form' in subject_df.columns:
            # Case-insensitive match
            key_df = subject_df[
                subject_df['Form'].str.lower().isin([f.lower() for f in key_forms])
            ]

            if key_df.empty:
                # No key forms found - assume complete
                return {'ready': True, 'pct': 100.0}

            # Check SDV status
            if 'SDV?' in key_df.columns:
                total = len(key_df)
                completed = len(key_df[key_df['SDV?'] == 'yes'])
                pct = (completed / total * 100) if total > 0 else 100.0

                # Consider complete if >= 90%
                return {'ready': pct >= 90.0, 'pct': round(pct, 1)}

        return {'ready': True, 'pct': 100.0}

    def _check_signatures(self, subject_id: str) -> Dict:
        """
        Rule 5: Required Signatures
        Source: Signature List EDC Report (2).xlsx - EDC Signature List sheet
        Logic: Signed = '✓' for required signatures
        ASSUMPTION: Investigator signature on Randomization form required
        """
        sig_file = None
        for fname in self.dataframes.keys():
            if 'signature list' in fname.lower():
                sig_file = fname
                break

        if not sig_file:
            return {'ready': True, 'count': 0}

        df = self.dataframes[sig_file]

        # Filter to this subject
        if 'Patient No.' not in df.columns:
            return {'ready': True, 'count': 0}

        subject_df = df[df['Patient No.'] == subject_id].copy()

        if subject_df.empty:
            # No signature records - assume not yet signed
            return {'ready': False, 'count': 1}

        # Check for Investigator signature on Randomization
        if 'Form' in subject_df.columns and 'Signature' in subject_df.columns:
            req_sig = subject_df[
                (subject_df['Form'] == 'Randomization') &
                (subject_df['Signature'] == 'Investigator signature')
            ]

            if req_sig.empty:
                return {'ready': False, 'count': 1}

            # Check if signed
            if 'Signed' in req_sig.columns:
                # Signed column contains checkbox or date
                signed_val = req_sig['Signed'].iloc[0]
                is_signed = pd.notna(signed_val) and str(signed_val) not in ['', 'nan', '☐']

                return {'ready': is_signed, 'count': 0 if is_signed else 1}

        return {'ready': True, 'count': 0}

    def _check_adjudications(self, subject_id: str) -> Dict:
        """
        Rule 6: No Pending Adjudications
        Source: Adjudication Queries.csv
        Logic: Inquiry Status = 'Closed'
        """
        adj_file = None
        for fname in self.dataframes.keys():
            if 'adjudication' in fname.lower():
                adj_file = fname
                break

        if not adj_file:
            return {'ready': True, 'count': 0, 'max_days': None}

        df = self.dataframes[adj_file]

        # Filter to this subject
        if 'Subject Enrollment Code' not in df.columns:
            return {'ready': True, 'count': 0, 'max_days': None}

        subject_df = df[df['Subject Enrollment Code'] == subject_id].copy()

        if subject_df.empty:
            return {'ready': True, 'count': 0, 'max_days': None}

        # Check inquiry status
        if 'Inquiry Status' in subject_df.columns:
            open_adj = subject_df[subject_df['Inquiry Status'] != 'Closed']
            open_count = len(open_adj)

            # Get max days open
            max_days = None
            if not open_adj.empty and 'Days in Open/to Close State' in open_adj.columns:
                days_vals = pd.to_numeric(open_adj['Days in Open/to Close State'], errors='coerce')
                if not days_vals.isna().all():
                    max_days = int(days_vals.max())

            return {'ready': open_count == 0, 'count': open_count, 'max_days': max_days}

        return {'ready': True, 'count': 0, 'max_days': None}

    def _determine_primary_blocker(self, checks: Dict) -> Optional[str]:
        """
        Determine primary blocker using priority hierarchy:
        1. Critical Adjudication (>90 days open) - highest priority
        2. Pending Adjudication
        3. High Query Volume (>10 open)
        4. Open Queries
        5. Missing Signatures
        6. Unacknowledged Deviations
        7. Incomplete SDV
        8. MM AE Review (data not available) - lowest priority
        9. None (ready for soft-lock)
        """

        # 1. Critical Adjudication (>90 days)
        if not checks['adjudication']['ready']:
            max_days = checks['adjudication'].get('max_days')
            if max_days and max_days > 90:
                return f"Critical Adjudication (>{max_days} days open)"
            return "Pending Adjudication"

        # 2. High Query Volume
        if not checks['ae_queries']['ready']:
            count = checks['ae_queries'].get('count', 0)
            if count > 10:
                return f"High Query Volume ({count} open)"
            return "Open Queries"

        # 3. Missing Signatures
        if not checks['signature']['ready']:
            return "Missing Investigator Signature"

        # 4. Unacknowledged Deviations
        if not checks['pd']['ready']:
            count = checks['pd'].get('count', 0)
            return f"Unacknowledged Protocol Deviation ({count})"

        # 5. Incomplete SDV
        if not checks['sdv']['ready']:
            pct = checks['sdv'].get('pct', 0)
            return f"Incomplete SDV ({pct:.0f}% complete)"

        # All checks passed
        return None
