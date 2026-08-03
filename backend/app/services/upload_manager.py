"""
Upload manager - handles file upload, validation, and data refresh
"""
import shutil
from pathlib import Path
from typing import Dict, List
from datetime import datetime
import uuid

from app.models.upload import (
    UploadValidationResponse,
    DataRefreshResult,
    UploadCompleteResponse
)
from app.services.upload_validator import UploadValidator
from app.services.ingestion_service import IngestionService
from app.services.readiness_service import ReadinessService


class UploadManager:
    """Manages file upload workflow"""

    def __init__(self, context_dir: str = "../context"):
        self.context_dir = Path(context_dir)
        self.upload_dir = Path("../uploads")
        self.upload_dir.mkdir(exist_ok=True)

        self.validator = UploadValidator()

    def validate_upload(self, files: Dict[str, Path]) -> UploadValidationResponse:
        """
        Validate uploaded files without replacing existing data

        Args:
            files: Dict of original_filename -> temp_file_path

        Returns:
            UploadValidationResponse with validation results
        """
        upload_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().isoformat()

        # Validate each file
        validation_results = self.validator.validate_upload_batch(files)

        # Check completeness
        missing_required = self.validator.check_completeness(validation_results)

        # Count valid/invalid
        valid_count = sum(1 for r in validation_results.values() if r.valid)
        invalid_count = len(validation_results) - valid_count

        # Can proceed if all uploaded files are valid AND no required files missing
        can_proceed = invalid_count == 0 and len(missing_required) == 0

        return UploadValidationResponse(
            upload_id=upload_id,
            timestamp=timestamp,
            total_files_uploaded=len(files),
            valid_files=valid_count,
            invalid_files=invalid_count,
            files=list(validation_results.values()),
            can_proceed=can_proceed,
            missing_required_files=missing_required
        )

    def process_upload(
        self,
        files: Dict[str, Path],
        validation_response: UploadValidationResponse
    ) -> UploadCompleteResponse:
        """
        Process validated upload: replace data and recalculate

        Args:
            files: Dict of original_filename -> temp_file_path
            validation_response: Previous validation result

        Returns:
            UploadCompleteResponse with refresh results
        """
        if not validation_response.can_proceed:
            raise ValueError("Cannot process upload - validation failed or files missing")

        errors = []

        try:
            # Step 1: Backup existing files
            backup_dir = self._create_backup()

            try:
                # Step 2: Replace files in context directory
                self._replace_files(files)

                # Step 3: Recalculate readiness
                refresh_result = self._recalculate_readiness()

                # Step 4: Success - remove backup
                shutil.rmtree(backup_dir)

                return UploadCompleteResponse(
                    upload_id=validation_response.upload_id,
                    validation=validation_response,
                    refresh=refresh_result,
                    message="Upload successful - data refreshed and readiness recalculated"
                )

            except Exception as e:
                # Rollback - restore from backup
                errors.append(f"Upload failed: {str(e)}")
                self._restore_backup(backup_dir)
                errors.append("Rolled back to previous data")

                raise ValueError("; ".join(errors))

        except Exception as e:
            # Backup creation failed
            raise ValueError(f"Upload failed: {str(e)}")

    def _create_backup(self) -> Path:
        """Create backup of current context directory"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = self.upload_dir / f"backup_{timestamp}"
        backup_dir.mkdir(parents=True, exist_ok=True)

        # Copy all files from context to backup
        for file_path in self.context_dir.glob("*"):
            if file_path.is_file():
                shutil.copy2(file_path, backup_dir / file_path.name)

        return backup_dir

    def _restore_backup(self, backup_dir: Path):
        """Restore from backup directory"""
        # Remove current files
        for file_path in self.context_dir.glob("*"):
            if file_path.is_file():
                file_path.unlink()

        # Restore from backup
        for file_path in backup_dir.glob("*"):
            if file_path.is_file():
                shutil.copy2(file_path, self.context_dir / file_path.name)

        # Keep backup for safety
        # shutil.rmtree(backup_dir)

    def _replace_files(self, files: Dict[str, Path]):
        """Replace files in context directory"""
        for original_filename, temp_path in files.items():
            # Normalize filename to canonical form
            normalized_name = self.validator._normalize_filename(original_filename)

            # Copy to context directory
            target_path = self.context_dir / normalized_name
            shutil.copy2(temp_path, target_path)

    def _recalculate_readiness(self) -> DataRefreshResult:
        """Recalculate readiness engine with new data"""
        errors = []

        try:
            # Create fresh ingestion service (will reload files)
            ingestion_service = IngestionService(str(self.context_dir))

            # Load all files
            ingestion_service.ingest_all_files()

            # Create fresh readiness service
            readiness_service = ReadinessService(ingestion_service)

            # Calculate dashboard summary to trigger full calculation
            summary = readiness_service.get_dashboard_summary()

            return DataRefreshResult(
                success=True,
                timestamp=datetime.now().isoformat(),
                subjects_calculated=summary.total_subjects,
                sites_calculated=summary.total_sites,
                readiness_pct=summary.readiness_pct,
                errors=[]
            )

        except Exception as e:
            return DataRefreshResult(
                success=False,
                timestamp=datetime.now().isoformat(),
                subjects_calculated=0,
                sites_calculated=0,
                readiness_pct=0.0,
                errors=[str(e)]
            )
