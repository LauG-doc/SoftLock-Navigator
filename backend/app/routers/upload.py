"""
File upload API endpoints
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import List
from pathlib import Path
import tempfile
import shutil

from app.models.upload import UploadValidationResponse, UploadCompleteResponse
from app.services.upload_manager import UploadManager

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Initialize upload manager
upload_manager = UploadManager()


@router.post("/validate", response_model=UploadValidationResponse)
async def validate_files(files: List[UploadFile] = File(...)):
    """
    Validate uploaded files without replacing existing data

    Steps:
    1. Save uploaded files to temporary directory
    2. Validate each file (structure, columns, data quality)
    3. Check if all required files are present
    4. Return validation results

    Does NOT replace existing data - use /upload/process after validation passes
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    temp_files = {}
    temp_dir = None

    try:
        # Create temp directory
        temp_dir = Path(tempfile.mkdtemp())

        # Save uploaded files
        for uploaded_file in files:
            temp_path = temp_dir / uploaded_file.filename
            with open(temp_path, 'wb') as f:
                shutil.copyfileobj(uploaded_file.file, f)
            temp_files[uploaded_file.filename] = temp_path

        # Validate
        validation_response = upload_manager.validate_upload(temp_files)

        return validation_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

    finally:
        # Cleanup temp files
        if temp_dir and temp_dir.exists():
            shutil.rmtree(temp_dir)


@router.post("/process", response_model=UploadCompleteResponse)
async def process_upload(files: List[UploadFile] = File(...)):
    """
    Process uploaded files: validate, replace data, and recalculate

    Steps:
    1. Validate uploaded files
    2. Check validation passes and all required files present
    3. Backup existing data
    4. Replace files in context directory
    5. Recalculate readiness engine
    6. Return results

    On error:
    - Rolls back to previous data
    - Returns error message

    This is a DESTRUCTIVE operation - previous data will be replaced!
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    temp_files = {}
    temp_dir = None

    try:
        # Create temp directory
        temp_dir = Path(tempfile.mkdtemp())

        # Save uploaded files
        for uploaded_file in files:
            temp_path = temp_dir / uploaded_file.filename
            with open(temp_path, 'wb') as f:
                shutil.copyfileobj(uploaded_file.file, f)
            temp_files[uploaded_file.filename] = temp_path

        # Validate first
        validation_response = upload_manager.validate_upload(temp_files)

        if not validation_response.can_proceed:
            # Return validation errors
            error_details = []
            for file_result in validation_response.files:
                if not file_result.valid:
                    error_details.append(f"{file_result.file_name}: {', '.join(file_result.errors)}")

            if validation_response.missing_required_files:
                error_details.append(f"Missing required files: {', '.join(validation_response.missing_required_files)}")

            raise HTTPException(
                status_code=400,
                detail=f"Validation failed: {'; '.join(error_details)}"
            )

        # Process upload (replace data and recalculate)
        result = upload_manager.process_upload(temp_files, validation_response)

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    finally:
        # Cleanup temp files
        if temp_dir and temp_dir.exists():
            shutil.rmtree(temp_dir)


@router.get("/required-files")
async def get_required_files():
    """
    Get list of required files for upload

    Returns file names and expected columns for each file
    """
    return {
        "required_files": [
            {
                "file_name": file_name,
                "expected_columns": columns,
                "description": _get_file_description(file_name)
            }
            for file_name, columns in upload_manager.validator.EXPECTED_FILES.items()
        ]
    }


def _get_file_description(file_name: str) -> str:
    """Get human-readable description of file"""
    descriptions = {
        'Adjudication Queries.csv': 'Adjudication event queries and inquiry status',
        'EDC_AE Query Report.xlsx': 'EDC adverse event queries',
        'Medical Monitor AE Listing.xlsx': 'Medical Monitor adverse event review listing',
        'Medical Monitor Lab Parameters Review.csv': 'Medical Monitor lab parameters review',
        'Protocol Deviations Report.xlsx': 'Protocol deviations and acknowledgements',
        'SDV Key Fields Report.csv': 'Source data verification status by key field',
        'Signature List EDC Report (2).xlsx': 'EDC signature list and completion status'
    }
    return descriptions.get(file_name, '')
