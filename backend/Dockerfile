FROM python:3.12-slim

# System dependencies for PDF/Image/OCR processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    # PDF tools
    ghostscript \
    qpdf \
    poppler-utils \
    # OCR
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-ara \
    # LibreOffice for Word/Excel/PPT conversion
    libreoffice \
    libreoffice-writer \
    # Image processing
    libmagic1 \
    # Fonts
    fonts-liberation \
    fonts-dejavu \
    # Build tools
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Create upload directories
RUN mkdir -p uploads/temp uploads/processed uploads/originals

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
