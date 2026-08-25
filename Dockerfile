# ─── Stage 1: Build React Leaflet Frontend ───
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Python Production Environment ───
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU and Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend, data, and model logic
COPY api/ ./api/
COPY data/ ./data/
COPY model/ ./model/

# Copy built frontend assets for single-port static serving
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Configure port (Hugging Face Spaces default: 7860, Render: 10000, standard: 8000)
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV PORT=7860

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
