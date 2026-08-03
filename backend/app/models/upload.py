"""
File upload models and validation results
"""
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class FileValidationResult(BaseModel):
    """Validation result for a single uploaded file"""
    file_name: str
    expected: bool = Field(description="Is this file expected/required?")
    valid: bool = Field(description="Did validation pass?")
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    expected_columns: List[str] = Field(default_factory=list)
    found_columns: List[str] = Field(default_factory=list)
    missing_columns: List[str] = Field(default_factory=list)
    extra_columns: List[str] = Field(default_factory=list)
    subject_id_detected: bool = False
    site_id_detected: bool = False
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class UploadValidationResponse(BaseModel):
    """Response for file upload validation"""
    upload_id: str
    timestamp: str
    total_files_uploaded: int
    valid_files: int
    invalid_files: int
    files: List[FileValidationResult]
    can_proceed: bool = Field(description="All required files valid")
    missing_required_files: List[str] = Field(default_factory=list)


class DataRefreshResult(BaseModel):
    """Result of data refresh after upload"""
    success: bool
    timestamp: str
    subjects_calculated: int
    sites_calculated: int
    readiness_pct: float
    errors: List[str] = Field(default_factory=list)


class UploadCompleteResponse(BaseModel):
    """Response after successful upload and recalculation"""
    upload_id: str
    validation: UploadValidationResponse
    refresh: DataRefreshResult
    message: str
