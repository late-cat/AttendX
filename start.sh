#!/bin/bash
# Render startup script for AttendX Backend

# Set Python to unbuffered mode for better logging
export PYTHONUNBUFFERED=1

# Add the project root to PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Create necessary directories
mkdir -p data/embeddings
mkdir -p data/known_faces
mkdir -p backend/temp_uploads

# Navigate to backend directory and start the server
cd backend
exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
