"""
rates_router.py
Mount in main.py:  app.include_router(rates_router)
"""

from __future__ import annotations

from typing import List, Optional
from datetime import datetime

from utils import verify_token
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, validator
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.db import  get_async_db
from sqlalchemy import or_
from db.tables import Clients, RatePlan, RateSlab   # rate_models merged into models
from sqlalchemy.orm import selectinload
# ───────────────────────────────────────────────────────────────────────────

rate_router = APIRouter()


# ─────────────────────────── Pydantic schemas ───────────────────────────────

class SlabIn(BaseModel):
    min_weight:  float = Field(..., ge=0,   description="Band start in kg (inclusive)")
    max_weight:  Optional[float] = Field(None, description="Band end in kg (exclusive); null = unlimited")
    rate_per_kg: float = Field(..., gt=0,   description="₹ per kg within this band")

    @validator("max_weight")
    def max_gt_min(cls, v, values):
        if v is not None and "min_weight" in values and v <= values["min_weight"]:
            raise ValueError("max_weight must be greater than min_weight")
        return v


class RatePlanIn(BaseModel):
    client_id: int
    name:      Optional[str] = None
    slabs:     List[SlabIn]  = Field(..., min_items=1)


class SlabOut(BaseModel):
    id:          int
    min_weight:  float
    max_weight:  Optional[float]
    rate_per_kg: float

    class Config:
        orm_mode = True


class RatePlanOut(BaseModel):
    id:         int
    client_id:  int
    name:       Optional[str]
    updated_at: datetime
    slabs:      List[SlabOut]

    class Config:
        orm_mode = True


class ClientOut(BaseModel):
    id:    int
    name:  str
    phone_number: Optional[str]

    class Config:
        orm_mode = True


class CostRequest(BaseModel):
    client_id: int
    weight_kg: float = Field(..., gt=0)


class CostResponse(BaseModel):
    total_cost:   float
    breakdown:    List[dict]   # [{slab_label, weight_in_band, rate, cost}]
    weight_kg:    float


# ──────────────────────────── Helper ────────────────────────────────────────

def _calculate_cost(slabs: List[RateSlab], weight_kg: float) -> CostResponse:
    """
    Tiered / banded calculation.
    Slabs must be ordered by min_weight ascending (the ORM relationship already does this).
    """
    breakdown = []
    total = 0.0
    remaining = weight_kg

    for slab in slabs:
        if remaining <= 0:
            break

        band_start = slab.min_weight
        band_end   = slab.max_weight  # None = unlimited

        # how much weight falls inside this band
        if band_end is None:
            in_band = remaining
        else:
            in_band = min(remaining, band_end - band_start)

        if in_band <= 0:
            continue

        cost = round(in_band * slab.rate_per_kg, 2)
        total += cost
        remaining -= in_band

        label = (
            f"{band_start}–{band_end} kg"
            if band_end is not None
            else f"{band_start}+ kg"
        )
        breakdown.append({
            "slab_label":    label,
            "weight_in_band": round(in_band, 4),
            "rate_per_kg":   slab.rate_per_kg,
            "cost":          cost,
        })

    if remaining > 0:
        raise HTTPException(
            status_code=422,
            detail=f"{remaining} kg of weight not covered by any slab. Add an open-ended slab.",
        )

    return CostResponse(
        total_cost=round(total, 2),
        breakdown=breakdown,
        weight_kg=weight_kg,
    )


# ──────────────────────────── Routes ────────────────────────────────────────

@rate_router.get("/rates/clients/search", response_model=List[ClientOut])
async def search_clients(
    q: str = Query("", description="Search by name or phone"),
    db: AsyncSession = Depends(get_async_db),
    user=Depends(verify_token)
):
    """Full-text search clients by name OR phone number."""
    query = select(Clients)
    # query = select(Clients).where(Clients.frenchise_id == user.frenchise_id)
    if q:
        query = query.where(
            or_(
                Clients.name.ilike(f"%{q}%"),
                Clients.phone_number.ilike(f"%{q}%")
            )
        )

    result = await db.execute(query)
    clients = result.scalars().all()
    return clients



@rate_router.get("/rates/plan/{client_id}", response_model=RatePlanOut)
async def get_rate_plan(client_id: int, db: AsyncSession = Depends(get_async_db),user=Depends(verify_token)):
    query = (
        select(RatePlan)
        .options(selectinload(RatePlan.slabs))  # ✅ important for async
        .where(RatePlan.client_id == client_id)
    )

    result = await db.execute(query)
    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="No rate plan found")

    return plan


@rate_router.post("/rates/plan", response_model=RatePlanOut )
async def upsert_rate_plan(
    data: RatePlanIn,
    db: AsyncSession = Depends(get_async_db),
    user=Depends(verify_token)
):
    # ✅ Check client exists
    client_result = await db.execute(
        select(Clients).where(Clients.id == data.client_id)
    )
    client = client_result.scalars().first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # ✅ Check existing plan
    result = await db.execute(
        select(RatePlan)
        .options(selectinload(RatePlan.slabs))
        .where(RatePlan.client_id == data.client_id)
    )
    plan = result.scalars().first()

    if plan is None:
        plan = RatePlan(
            client_id=data.client_id,
            name=data.name or f"Rate Plan – {client.name}",
        )
        db.add(plan)
        await db.flush()  # ✅ get plan.id
    else:
        if data.name:
            plan.name = data.name

        plan.updated_at = datetime.utcnow()

        # ❗ Delete old slabs
        await db.execute(
            RateSlab.__table__.delete().where(RateSlab.plan_id == plan.id)
        )

    # ✅ Insert new slabs
    for s in data.slabs:
        db.add(RateSlab(
            plan_id=plan.id,
            min_weight=s.min_weight,
            max_weight=s.max_weight,
            rate_per_kg=s.rate_per_kg,
        ))

    await db.commit()

    # ✅ Reload with slabs
    result = await db.execute(
        select(RatePlan)
        .options(selectinload(RatePlan.slabs))
        .where(RatePlan.id == plan.id)
    )
    return result.scalars().first()

@rate_router.delete("/rates/plan/{client_id}", status_code=204)
async def delete_rate_plan(client_id: int, db: AsyncSession = Depends(get_async_db) , user=Depends(verify_token)):
    result = await db.execute(
        select(RatePlan).where(RatePlan.client_id == client_id)
    )
    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="Rate plan not found")

    await db.delete(plan)
    await db.commit()


@rate_router.post("/rates/calculate", response_model=CostResponse)
async def calculate_cost(
    req: CostRequest,
    db: AsyncSession = Depends(get_async_db),
    user=Depends(verify_token)
):
    result = await db.execute(
        select(RatePlan)
        .options(selectinload(RatePlan.slabs))  # ✅ critical
        .where(RatePlan.client_id == req.client_id)
    )

    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="No rate plan for this client")

    return _calculate_cost(plan.slabs, req.weight_kg)