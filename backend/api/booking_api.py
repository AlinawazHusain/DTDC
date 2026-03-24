import datetime
from typing import Any

from sqlalchemy.future import select
from fastapi import APIRouter , Depends , HTTPException
from pydantic import BaseModel
from db.tables import Clients, Frenchise,  Users , DSRRecord
from sqlalchemy.ext.asyncio import AsyncSession
from db.db import  get_async_db
from utils import  coerce_value, create_access_token, create_refresh_token, parse_date, verify_token
from sqlalchemy import desc



booking_router = APIRouter()




@booking_router.get("/bookings")
async def bookings(db: AsyncSession = Depends(get_async_db) ,user=Depends(verify_token)):
    result = await db.execute(
        select(Users).where(Users.email == user["email"])
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not db_user.frenchise_id:
        raise HTTPException(status_code=400, detail="User has no franchise assigned")
    
    result = await db.execute(
        select(DSRRecord)
        .where(DSRRecord.frenchise_id == db_user.frenchise_id)
        .order_by(desc(DSRRecord.id))
    )

    all_bookings = result.scalars().all()

    bookings_list = [
        {k: (v.isoformat() if hasattr(v, "isoformat") else v) 
         for k, v in b.__dict__.items() if not k.startswith("_")}
        for b in all_bookings
    ]
    return {"bookings": bookings_list}

    


class BookingUploadPayload(BaseModel):
    data: list[dict[str, Any]]

@booking_router.post("/bookingUpload")
async def bookingUpload(payload: BookingUploadPayload,db: AsyncSession = Depends(get_async_db),user = Depends(verify_token)):
    result = await db.execute(
        select(Users).where(Users.email == user["email"])
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not db_user.frenchise_id:
        raise HTTPException(status_code=400, detail="User has no franchise assigned")
    
    frenchise_id = db_user.frenchise_id
    if not payload.data:
        return {"message": "No data provided", "saved": []}

    # All column names on DSRRecords model — used to filter out unknown keys
    col_map = {c.key: c for c in DSRRecord.__table__.columns}

    saved_records = []

    for row in payload.data:
        # Normalize incoming keys to UPPERCASE (already done on frontend, but be safe)
        normalized = {k.upper(): v for k, v in row.items()}

        # Only keep keys that exist in the table, coerce to correct types
        filtered = {}
        for k, v in normalized.items():
            if k in col_map:
                filtered[k] = coerce_value(col_map[k], v)

        # Always set franchise_id = 1
        filtered["frenchise_id"] = frenchise_id

        # Check if record already exists by DSR_CNNO to avoid duplicates
        # Match on both DSR_CNNO + DSR_BOOKING_DATE — same combo means same row
        existing = await db.execute(
            select(DSRRecord).where(
                DSRRecord.DSR_CNNO == filtered.get("DSR_CNNO"),
                DSRRecord.DSR_BOOKING_DATE == filtered.get("DSR_BOOKING_DATE")
            )
        )
        existing_record = existing.scalar_one_or_none()

        if existing_record:
            # Row exists — update every field in place, preserving its id
            for k, v in filtered.items():
                setattr(existing_record, k, v if v != "" else None)
            record = existing_record
        else:
            # Genuinely new row — insert
            record = DSRRecord(**{k: v if v != "" else None for k, v in filtered.items()})
            db.add(record)

        await db.flush()  # get the id before commit
        saved_records.append(record)

    await db.commit()

    # Refresh all to get final state with ids
    for record in saved_records:
        await db.refresh(record)

    # Build response — all fields + id, matching what frontend expects
    response_rows = [
        {
            k: (v.isoformat() if hasattr(v, "isoformat") else v)
            for k, v in r.__dict__.items()
            if not k.startswith("_")
        }
        for r in saved_records
    ]

    return {
        "message": f"{len(response_rows)} records saved successfully.",
        "data": response_rows
    }



class BookingUpdatePayload(BaseModel):
    data: dict[str, Any]


@booking_router.put("/bookingUpdate")
async def bookingUpdate(payload: BookingUpdatePayload, db: AsyncSession = Depends(get_async_db), user=Depends(verify_token)):
    if not payload.data:
        return {"message": "No data provided", "updated": []}

    col_map = {c.key: c for c in DSRRecord.__table__.columns}

    row_id = None
    normalized = {}
    for k, v in payload.data.items():
        if k.lower() == 'id':
            row_id = v
        else:
            normalized[k.upper()] = v

    if not row_id:
        raise HTTPException(status_code=400, detail="id is required")

    existing = await db.execute(
        select(DSRRecord).where(DSRRecord.id == row_id)
    )
    record = existing.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail=f"Record with id {row_id} not found")

    for k, v in normalized.items():
        if k in col_map:
            setattr(record, k, coerce_value(col_map[k], v))

    await db.flush()
    await db.commit()
    await db.refresh(record)

    response_row = {
        k: (v.isoformat() if hasattr(v, "isoformat") else v)
        for k, v in record.__dict__.items()
        if not k.startswith("_")
    }

    return {
        "message": "Record updated successfully.",
        "data": response_row
    }








@booking_router.post("/addBooking")
async def add_booking(
    payload: dict, 
    db: AsyncSession = Depends(get_async_db),
    user: Users = Depends(verify_token)
):
    result = await db.execute(
        select(Users).where(Users.email == user["email"])
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not db_user.frenchise_id:
        raise HTTPException(status_code=400, detail="User has no franchise assigned")
    
    frenchise_id = db_user.frenchise_id


    dsr_records_to_add = []
    client_id = payload["client_id"]
    bookings = payload["bookings"]
    booking_date = parse_date(payload["booking_date"])

    
    client = await db.get(Clients, client_id)

    for booking in bookings:
        # Skip invalid DSR_CNNO
        if not booking.get("DSR_CNNO"):
            continue

        record = DSRRecord(
            frenchise_id=frenchise_id,
            DSR_CUST_CODE=client.dsr_cust_code,
            DSR_CNNO=booking.get("DSR_CNNO"),
            DSR_REFNO=booking.get("DSR_REF_NO"),
            CHARGEABLE_WEIGHT=float(booking.get("CHARGEABLE_WEIGHT") or 0),
            RECEIVER_NAME=booking.get("RECEIVER_NAME") or "",
            RECEIVER_PIN=booking.get("RECEIVER_PIN") or "",
            CASH_AMT=float(booking.get("CASH_AMOUNT") or 0),
            UPI_ONLINE_AMT=float(booking.get("UPI_ONLINE_AMOUNT") or 0),
            CREDIT_AMT=float(booking.get("CREDIT_AMOUNT") or 0),
            TRANSACTION_REF_NO=booking.get("TRANSACTION_REFNO") or "",
            PAYMENT_DATE=booking.get("PAYMENT_DATE"),
            TOTAL_AMOUNT=float(booking.get("TOTAL_AMOUNT") or 0),
            DSR_REMARKS=booking.get("REMARK") or "",
            DSR_BOOKING_DATE = booking_date,
            SOFTDATA_UPLOAD_DATE=datetime.datetime.now()
        )

        dsr_records_to_add.append(record)

    if not dsr_records_to_add:
        raise HTTPException(status_code=400, detail="No valid DSR records to insert")

    db.add_all(dsr_records_to_add)
    await db.commit()

    return {"message": f"{len(dsr_records_to_add)} DSR records added successfully."}
