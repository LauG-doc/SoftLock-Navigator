"""
Data API endpoints for validation and source information
"""
from fastapi import APIRouter, HTTPException
from app.models.data_source import ValidationSummary, SourcesResponse, DataQualityResponse
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/api", tags=["data"])

# Initialize ingestion service (singleton pattern)
ingestion_service = IngestionService()


@router.get("/validation", response_model=ValidationSummary)
async def get_validation_summary():
    """
    Get validation summary across all data sources

    Returns:
    - Total files expected vs loaded
    - Total rows ingested
    - Subject/Site ID format variations detected
    - Critical issues and warnings count
    - Test data contamination flag

    Based on DATA_DISCOVERY_REPORT.md findings
    """
    try:
        response = ingestion_service.get_sources()
        return response.summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.get("/sources", response_model=SourcesResponse)
async def get_data_sources():
    """
    Get detailed information about all data sources

    For each file returns:
    - File metadata (name, path, type, row count)
    - Sheet information (for Excel files)
    - Column information (names, missing data %)
    - Subject ID mapping (column, format, can map?)
    - Site ID mapping (columns, format, can map?)
    - Data quality issues specific to this file
    - Test data detection flag
    - Load status (success/failure)

    Based on DATA_DISCOVERY_REPORT.md Section 1 (File-by-File Analysis)
    """
    try:
        return ingestion_service.get_sources()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sources: {str(e)}")


@router.get("/data-quality", response_model=DataQualityResponse)
async def get_data_quality_report():
    """
    Get comprehensive data quality report

    Returns:
    - Issues grouped by severity (error/warning/info)
    - Issues grouped by file
    - Orphaned records (subjects in one source but not others)
    - Missing data summary (critical 100% missing fields)
    - Test data contamination files

    Based on DATA_DISCOVERY_REPORT.md Section 6 (Risks and Assumptions)
    """
    try:
        return ingestion_service.get_data_quality_report()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate data quality report: {str(e)}")
