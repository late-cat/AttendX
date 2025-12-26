# Hugging Face Spaces Dockerfile for AttendX Backend
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and TensorFlow
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for Docker layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# OPTIMIZATION: Pre-download DeepFace models during build
# This saves ~100MB download at runtime and speeds up startup
RUN python3 -c "from deepface import DeepFace; p = DeepFace.build_model('ArcFace'); print('✅ ArcFace model downloaded successfully')"

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p temp_uploads data/embeddings data/known_faces

# Hugging Face Spaces uses port 7860
EXPOSE 7860

# Set environment variable for port
ENV PORT=7860

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
