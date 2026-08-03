"""
Data source models based on DATA_DISCOVERY_REPORT.md findings
"""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class ColumnInfo(BaseModel):
    """Column metadata"""
    name: str
    missing_count: int
    missing_pct: float
    total_rows: int
    data_type: Optional[str] = None


class SheetInfo(BaseModel):
    """Excel sheet metadata"""
    name: str
    row_count: int
    columns: List[str]


class SubjectIDMapping(BaseModel):
    """Subject ID mapping metadata"""
    column_name: str
    format_pattern: str
    example_values: List[str]
    can_map: bool
    transformation_required: Optional[str] = None


class SiteIDMapping(BaseModel):
    """Site ID mapping metadata"""
    column_names: List[str]
    format_pattern: str
    example_values: List[str]
    can_map: bool
    transformation_required: Optional[str] = None


class DataQualityIssue(BaseModel):
    """Data quality issue"""
    severity: str = Field(..., pattern="^(error|warning|info)$")
    category: str
    description: str
    affected_rows: Optional[int] = None
    affected_columns: Optional[List[str]] = None


class DataSourceInfo(BaseModel):
    """Complete data source information"""
    file_name: str
    file_path: str
    file_type: str = Field(..., pattern="^(csv|xlsx|xls)$")
    row_count: int
    sheets: Optional[List[SheetInfo]] = None
    columns: List[ColumnInfo]
    subject_id_mapping: Optional[SubjectIDMapping] = None
    site_id_mapping: Optional[SiteIDMapping] = None
    data_quality_issues: List[DataQualityIssue]
    test_data_detected: bool = False
    is_loaded: bool = True
    load_error: Optional[str] = None


class ValidationSummary(BaseModel):
    """Overall validation summary"""
    total_files: int
    loaded_files: int
    failed_files: int
    total_rows: int
    total_subjects: int
    total_sites: int
    subject_id_formats: List[str]
    site_id_formats: List[str]
    critical_issues: int
    warnings: int
    test_data_contamination: bool


class SourcesResponse(BaseModel):
    """Response for /sources endpoint"""
    sources: List[DataSourceInfo]
    summary: ValidationSummary


class DataQualityResponse(BaseModel):
    """Response for /data-quality endpoint"""
    issues_by_severity: Dict[str, List[Dict[str, Any]]]
    issues_by_file: Dict[str, List[DataQualityIssue]]
    orphaned_records: List[Dict[str, Any]]
    missing_data_summary: List[Dict[str, Any]]
    test_data_files: List[str]
