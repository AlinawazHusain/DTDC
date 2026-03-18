# Use Node + Python base image
FROM python:3.12-slim

# Install Node.js (needed for frontend build)
RUN apt-get update && apt-get install -y curl git build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy whole project
COPY . .

# ----------------------------
# Step 1: Build React frontend
# ----------------------------
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# ----------------------------
# Step 2: Install backend dependencies
# ----------------------------
WORKDIR /app/backend
RUN python -m pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install uvicorn[standard] fastapi

# ----------------------------
# Step 3: Run FastAPI
# ----------------------------
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]