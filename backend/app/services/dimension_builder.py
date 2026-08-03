"""
Subject Fact Table and Site Crosswalk Builder
"""
from typing import Dict, List, Set, Tuple
import pandas as pd
from app.utils.id_mapper import IDMapper


class DimensionBuilder:
    """Builds Subject Fact Table and Site Crosswalk"""

    def __init__(self, id_mapper: IDMapper):
        self.id_mapper = id_mapper

    def build_subject_dimension(self, dataframes: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """
        Build unified subject dimension table across all sources
        Returns DataFrame with: subject_id, site_code, subject_number, id_prefix
        """
        subject_records = []

        for file_name, df in dataframes.items():
            # Skip if empty or test data
            if df.empty or 'test' in file_name.lower():
                continue

            # Detect subject column
            subject_info = self.id_mapper.detect_subject_id_column(df, file_name)

            if subject_info and subject_info['can_map']:
                col_name = subject_info['column_name']

                # Extract unique non-null subject IDs
                unique_ids = df[col_name].dropna().astype(str).unique()

                for sub_id in unique_ids:
                    # Clean ID
                    clean_id = sub_id.strip()

                    # Extract components
                    if '-' in clean_id:
                        parts = clean_id.split('-')
                        if len(parts) >= 3:
                            site_code = f"{parts[0]}-{parts[1]}"
                            sub_num = parts[2]
                            prefix = parts[0]

                            subject_records.append({
                                'subject_id': clean_id,
                                'site_code': site_code,
                                'subject_number': sub_num,
                                'id_prefix': prefix,
                                'source_file': file_name
                            })

        # Create DataFrame and deduplicate
        if not subject_records:
            return pd.DataFrame(columns=['subject_id', 'site_code', 'subject_number', 'id_prefix'])

        dim_df = pd.DataFrame(subject_records)

        # Keep first appearance (source_file) for each subject
        dim_df = dim_df.drop_duplicates(subset=['subject_id'], keep='first')

        return dim_df

    def build_site_crosswalk(self, dataframes: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """
        Build site crosswalk (DUM-XXXXX <-> Numeric Org No.)
        Based on subject overlap between AE Listing (DUM) and Signature (Org No)
        """
        crosswalk_records = []

        # Find mapping from Signature Worksheet (has both DUM/CON subject ID and numeric Org No)
        sig_file = None
        for file_name in dataframes.keys():
            if 'signature list' in file_name.lower():
                sig_file = file_name
                break

        if sig_file:
            df = dataframes[sig_file]
            if 'Patient No.' in df.columns and 'Org. No.' in df.columns:
                # Extract site prefix from Patient No
                mapping_df = df[['Patient No.', 'Org. No.']].dropna().copy()

                for _, row in mapping_df.iterrows():
                    patient_no = str(row['Patient No.']).strip()
                    org_no = str(row['Org. No.']).strip()

                    site_code = self.id_mapper.extract_site_from_subject_id(patient_no)

                    if site_code and org_no:
                        crosswalk_records.append({
                            'site_code': site_code,
                            'org_no': org_no
                        })

        if not crosswalk_records:
            return pd.DataFrame(columns=['site_code', 'org_no'])

        crosswalk_df = pd.DataFrame(crosswalk_records)
        crosswalk_df = crosswalk_df.drop_duplicates()

        # Handle Protocol Deviations (AAA-000XX format)
        # We can't definitively map these without a master list,
        # but we can collect them to track orphans
        pd_file = None
        for file_name in dataframes.keys():
            if 'protocol deviation' in file_name.lower():
                pd_file = file_name
                break

        if pd_file:
            pd_df = dataframes[pd_file]
            if 'Clinical Site: Site Number' in pd_df.columns:
                pd_sites = pd_df['Clinical Site: Site Number'].dropna().astype(str).unique()
                for site in pd_sites:
                    # Add as unmapped site code
                    if site not in crosswalk_df['site_code'].values:
                        crosswalk_df = pd.concat([
                            crosswalk_df,
                            pd.DataFrame([{'site_code': site, 'org_no': None}])
                        ], ignore_index=True)

        return crosswalk_df

    def get_subject_site_mapping(self, dim_subject: pd.DataFrame, crosswalk: pd.DataFrame) -> Dict[str, Dict]:
        """
        Create fast lookup dictionary for subject -> site mappings
        Returns: { 'subject_id': {'site_code': 'DUM-10001', 'org_no': '10001'} }
        """
        mapping = {}

        if dim_subject.empty:
            return mapping

        # Left join crosswalk to dimension
        if not crosswalk.empty:
            merged = pd.merge(dim_subject, crosswalk, on='site_code', how='left')
        else:
            merged = dim_subject.copy()
            merged['org_no'] = None

        for _, row in merged.iterrows():
            sub_id = row['subject_id']
            mapping[sub_id] = {
                'site_code': row['site_code'],
                'org_no': row['org_no'] if pd.notna(row['org_no']) else None
            }

        return mapping
