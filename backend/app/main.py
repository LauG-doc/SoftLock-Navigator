"""
FastAPI main application
Casebook Soft-Lock Navigator - Phase 4: File Upload Workflow
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import data, readiness, upload

app = FastAPI(
    title="Casebook Soft-Lock Navigator API",
    description="Clinical trial database lock readiness dashboard - File upload and auto-recalculation",
    version="4.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(data.router)
app.include_router(readiness.router)
app.include_router(upload.router)


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "Casebook Soft-Lock Navigator API",
        "version": "4.0.0",
        "phase": "Phase 4 - File Upload Workflow",
        "endpoints": {
            "validation": "/api/validation",
            "sources": "/api/sources",
            "data_quality": "/api/data-quality",
            "subjects": "/api/subjects",
            "subject_detail": "/api/subjects/{subject_id}",
            "sites": "/api/sites",
            "dashboard": "/api/dashboard/summary",
            "upload_validate": "/api/upload/validate",
            "upload_process": "/api/upload/process",
            "upload_required_files": "/api/upload/required-files"
        },
        "status": "operational"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}
