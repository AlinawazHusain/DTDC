#!/bin/bash

# Exit immediately if any command fails
set -e

# Step 1: Build React frontend
echo "Building React frontend..."
cd frontend
npm install
npm run build

# Step 2: Move back to project root
cd ..

# Step 3: Activate Python virtual environment
echo "Activating backend virtual environment..."
source backend/venv/bin/activate  # Linux/Mac
# For Windows PowerShell, use:
# backend\venv\Scripts\Activate.ps1

# Step 4: Install backend dependencies (optional, first time only)
# pip install -r backend/requirements.txt

# Step 5: Start FastAPI server
echo "Starting FastAPI server..."
cd backend
uvicorn main:app --reload