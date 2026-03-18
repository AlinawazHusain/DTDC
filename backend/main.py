from fastapi import FastAPI, UploadFile, File , HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
from pydantic import BaseModel
import jwt
import datetime
import pandas as pd

app = FastAPI()

# Path to React build folder
# frontend_build_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")

# Serve the /assets folder correctly
frontend_build_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
app.mount("/assets", StaticFiles(directory=os.path.join(frontend_build_path, "assets")), name="assets")

# Serve favicon if you have one
favicon_path = os.path.join(frontend_build_path, "favicon.svg")
if os.path.exists(favicon_path):
    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(favicon_path)

# ----------------- Frontend ROUTES -----------------
@app.get("/{full_path:path}")
async def serve_react(full_path: str):
    if full_path.startswith("api"):
        return {"detail": "Not Found"}  # or 404
    index_file = os.path.join(frontend_build_path, "index.html")
    return FileResponse(index_file)




#--------------- Backend API------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    df = pd.read_excel(file.file)
    results = []

    for _, row in df.iterrows():
        weight = row.get("WEIGHT", 5)
        zone = row.get("ZONE", "metro")
        awb = row.get("AWB", "ABC")
        amount = 500
        results.append({
            "awb": awb,
            "weight": weight,
            "zone": zone,
            "amount": amount
        })
    return {"rows": results}

@app.post("/api/invoice")
def generate_invoice(data: list):
    total = sum(item["amount"] for item in data)
    return {"total": total, "items": data}

# ----------------- CATCH ALL ROUTE FOR REACT -----------------






SECRET_KEY = "your_super_secret_key"

class LoginData(BaseModel):
    email: str
    password: str

@app.post("/api/login")
def login(data: LoginData):
    # Dummy validation — replace with DB check
    if data.email == "admin@example.com" and data.password == "password123":
        token = jwt.encode(
            {"email": data.email, "exp": datetime.datetime.now() + datetime.timedelta(hours=2)},
            SECRET_KEY,
            algorithm="HS256"
        )
        return {"token": token}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")