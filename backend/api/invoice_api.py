from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, validator
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, desc
from sqlalchemy.orm import selectinload

from utils import verify_token
from db.db import get_async_db
from db.tables import Clients, RatePlan, RateSlab, TransportTypes

invoice_router = APIRouter()




@invoice_router.post("/invoices/generate")
async def invoice_generate(data:dict,
                           db: AsyncSession = Depends(get_async_db) ,
                           user=Depends(verify_token)):  
    
    return {
        "invoice_id": 45,
        "invoice_number": "INV-00045",
        "client_id": 7,
        "client_name": "Rahul Enterprises",
        "total_amount": 12450.00,
        "booking_count": 3,
        "status": "Generated",
        "created_at": "2026-03-29"
        }



@invoice_router.get("/invoices")
async def invoice_generate(db: AsyncSession = Depends(get_async_db) ,
                           user=Depends(verify_token)):  
    

    return [
        {
            "id": 45,
            "invoice_number": "INV-00045",
            "client_id": 7,
            "client_name": "Rahul Enterprises",
            "booking_count": 3,
            "total_amount": 12450.00,
            "created_at": "2026-03-29",
            "pdf_url": "https://your-s3-bucket.../INV-00045.pdf"
        },
        {
            "id": 44,
            "invoice_number": "INV-00044",
            "client_id": 12,
            "client_name": "Sharma Logistics",
            "booking_count": 6,
            "total_amount": 28900.00,
            "created_at": "2026-03-27",
            "pdf_url": "https://your-s3-bucket.../INV-00045.pdf"
        }
        ]
