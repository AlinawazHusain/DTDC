from __future__ import annotations
from typing import List, Optional
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

rate_router = APIRouter()

# ─────────────────────────── Pydantic Schemas ─────────────────────────────

class SlabIn(BaseModel):
    min_weight: float = Field(..., ge=0)
    max_weight: Optional[float] = Field(None)
    rate_per_kg: float = Field(..., gt=0)

    @validator("max_weight")
    def max_gt_min(cls, v, values):
        if v is not None and "min_weight" in values and v <= values["min_weight"]:
            raise ValueError("max_weight must be greater than min_weight")
        return v

class RatePlanIn(BaseModel):
    client_id: int
    transport_type: Optional[str] = None
    slabs: List[SlabIn] = Field(..., min_items=1)

class SlabOut(BaseModel):
    id: int
    min_weight: float
    max_weight: Optional[float]
    rate_per_kg: float

    class Config:
        from_attributes = True

class RatePlanOut(BaseModel):
    id: int
    client_id: int
    transport_type: Optional[str]
    updated_at: datetime
    slabs: List[SlabOut]

    class Config:
        from_attributes = True

class ClientOut(BaseModel):
    id: int
    name: str
    phone_number: Optional[str]

    class Config:
        from_attributes = True

class CostRequest(BaseModel):
    client_id: int
    weight_kg: float = Field(..., gt=0)

class CostResponse(BaseModel):
    total_cost: float
    breakdown: List[dict]
    weight_kg: float

# ─────────────────────────── Helper ───────────────────────────────────────

def _calculate_cost(slabs: List[RateSlab], weight_kg: float) -> CostResponse:
    breakdown = []
    total = 0.0
    remaining = weight_kg

    for slab in slabs:
        if remaining <= 0:
            break

        band_start = slab.min_weight
        band_end = slab.max_weight

        in_band = remaining if band_end is None else min(remaining, band_end - band_start)
        if in_band <= 0:
            continue

        cost = round(in_band * slab.rate_per_kg, 2)
        total += cost
        remaining -= in_band

        label = f"{band_start}–{band_end} kg" if band_end is not None else f"{band_start}+ kg"
        breakdown.append({
            "slab_label": label,
            "weight_in_band": round(in_band, 4),
            "rate_per_kg": slab.rate_per_kg,
            "cost": cost
        })

    if remaining > 0:
        raise HTTPException(
            status_code=422,
            detail=f"{remaining} kg not covered by any slab. Add an open-ended slab."
        )

    return CostResponse(total_cost=round(total, 2), breakdown=breakdown, weight_kg=weight_kg)

# ─────────────────────────── Routes ───────────────────────────────────────

@rate_router.get("/rates/clients/search", response_model=List[ClientOut])
async def search_clients(
    q: str = Query("", description="Search by name or phone"),
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_async_db),
    user=Depends(verify_token)
):
    query = select(Clients)
    if q:
        query = query.where(or_(
            Clients.name.ilike(f"%{q}%"),
            Clients.phone_number.ilike(f"%{q}%")
        ))
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()

@rate_router.get("/rates/plans/{client_id}")
async def get_rate_plan(client_id: int, db: AsyncSession = Depends(get_async_db), user=Depends(verify_token)):
    result = await db.execute(
        select(RatePlan).options(selectinload(RatePlan.slabs)).where(RatePlan.client_id == client_id)
    )
    plan = result.scalars().all()
    if not plan:
        raise HTTPException(status_code=404, detail="Rate plan not found")
    return plan

@rate_router.post("/rates/plan", response_model=RatePlanOut)
async def upsert_rate_plan(data: RatePlanIn, db: AsyncSession = Depends(get_async_db), user=Depends(verify_token)):
    # check client exists
    client = (await db.execute(select(Clients).where(Clients.id == data.client_id))).scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # check existing plan
    plan = (await db.execute(
        select(RatePlan).options(selectinload(RatePlan.slabs)).where(RatePlan.client_id == data.client_id)
    )).scalars().first()

    if plan is None:
        plan = RatePlan(client_id=data.client_id, transport_type=data.transport_type)
        db.add(plan)
        await db.flush()
    else:
        plan.transport_type = data.transport_type or plan.transport_type
        plan.updated_at = datetime.now()
        await db.execute(RateSlab.__table__.delete().where(RateSlab.plan_id == plan.id))

    for s in data.slabs:
        db.add(RateSlab(plan_id=plan.id, min_weight=s.min_weight, max_weight=s.max_weight, rate_per_kg=s.rate_per_kg))

    await db.commit()
    return (await db.execute(
        select(RatePlan).options(selectinload(RatePlan.slabs)).where(RatePlan.id == plan.id)
    )).scalars().first()

@rate_router.delete("/rates/plan/{plan_id}", status_code=204)
async def delete_rate_plan(plan_id: int, db: AsyncSession = Depends(get_async_db), user=Depends(verify_token)):
    plan = (await db.execute(select(RatePlan).where(RatePlan.id == plan_id))).scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Rate plan not found")
    await db.delete(plan)
    await db.commit()

@rate_router.post("/rates/calculate", response_model=CostResponse)
async def calculate_cost(req: CostRequest, db: AsyncSession = Depends(get_async_db), user=Depends(verify_token)):
    plan = (await db.execute(select(RatePlan).options(selectinload(RatePlan.slabs))
                             .where(RatePlan.client_id == req.client_id))).scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="No rate plan for this client")
    return _calculate_cost(plan.slabs, req.weight_kg)



@rate_router.get("/rates/transport-types")
async def transport_types(db: AsyncSession = Depends(get_async_db), user=Depends(verify_token)):
    types = (await db.execute(select(TransportTypes).order_by(desc(TransportTypes.id)))).scalars().all()
    return {"types": [t.transport_type for t in types]}



@rate_router.post("/rates/add-transport-types")
async def add_transport_types(data: dict, db: AsyncSession = Depends(get_async_db), user=Depends(verify_token)):
    name = data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Transport type name required")
    existing = (await db.execute(select(TransportTypes).where(TransportTypes.transport_type == name))).scalars().first()
    if existing:
        raise HTTPException(status_code=409, detail="Transport type already exists")
    new_type = TransportTypes(transport_type=name)
    db.add(new_type)
    await db.commit()
    return {"type": name}




@rate_router.get("/rates/gst/{client_id}")
async def get_gst(client_id: int,
                    db: AsyncSession = Depends(get_async_db),
                     user=Depends(verify_token)):
    print("here")
    return {"id" : 1, "client_id" : 1, "cgst" : 9, "sgst" : 9, "igst" : 9 }




@rate_router.post("/rates/gst")
async def add_gst(data: dict, db: AsyncSession = Depends(get_async_db), user=Depends(verify_token)):
    return { "id":1 , "client_id" : data["client_id"], "cgst" : data["cgst"], "sgst" : data["sgst"], "igst" : data["igst"] }