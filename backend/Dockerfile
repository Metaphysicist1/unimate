FROM python:3.11-slim

WORKDIR /app

# 1. Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy the entry point and the application logic
# This copies main.py into /app/main.py
COPY main.py . 
# This copies the directory 'app' into /app/app/
COPY ./app ./app 

EXPOSE 8000

# 4. Run using the filename 'main' because it's in the root of /app
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}