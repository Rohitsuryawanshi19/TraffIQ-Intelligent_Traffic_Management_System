import os
import re
from pathlib import Path
from fastapi import HTTPException, UploadFile

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".mp4", ".avi", ".pdf"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit

def validate_uploaded_file(file: UploadFile, max_size_mb: int = 10) -> bool:
    # 1. Extension validation
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension '{ext}'. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. File size validation
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    max_bytes = max_size_mb * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum limit of {max_size_mb} MB"
        )

    return True

def sanitize_filename(filename: str) -> str:
    # Remove unsafe characters to prevent path traversal
    filename = Path(filename).name
    filename = re.sub(r'[^a-zA-Z0-9_\.-]', '_', filename)
    return filename
