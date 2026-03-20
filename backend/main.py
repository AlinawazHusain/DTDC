from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
from api import api_router
from db.db import create_db_and_tables
from contextlib import asynccontextmanager




@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown logic.""" 
    await create_db_and_tables()
    
    yield




app = FastAPI(
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],   # ← make sure this is * not a specific list
)




# Path to React build folder
frontend_build_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
app.mount("/assets", StaticFiles(directory=os.path.join(frontend_build_path, "assets")), name="assets")



app.include_router(api_router , prefix = "/api")




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