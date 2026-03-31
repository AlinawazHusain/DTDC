import datetime
from typing import Any, Optional

from gst_calc_utils import calculate_final_amount, get_state_from_pincode
from sqlalchemy.future import select
from fastapi import APIRouter , Depends , HTTPException, status
from pydantic import BaseModel
from db.tables import Clients, Frenchise, GstPerClient, Invoice, RatePlan, RateSlab,  Users , DSRRecord
from sqlalchemy.ext.asyncio import AsyncSession
from db.db import  get_async_db
from utils import  coerce_value, parse_date, verify_token
from sqlalchemy import desc , delete, update
from sqlalchemy.orm import selectinload
from collections import defaultdict
from sqlalchemy import select



booking_router = APIRouter()




@booking_router.get("/bookings/filter")
async def bookings(client_id: Optional[int] = None,
                    date_from: Optional[datetime.date] = None,
                    date_to:Optional[datetime.date] = None,
                    db: AsyncSession = Depends(get_async_db) ,
                    user=Depends(verify_token)):
    result = await db.execute(
        select(Users).where(Users.email == user["email"])
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not db_user.frenchise_id:
        raise HTTPException(status_code=400, detail="User has no franchise assigned")
    

    query = select(DSRRecord).where(
        DSRRecord.frenchise_id == db_user.frenchise_id
    )

    client_name_map = {}


    if client_id:
        client_data = await db.execute(
            select(Clients)
            .where(Clients.id == client_id)
        )
        client_data = client_data.scalar_one_or_none()

        if not client_data:
            raise HTTPException(status_code=404, detail="Client not found")
        
        client_name_map = {client_data.dsr_act_cust_code: client_data.name}

        query = query.where(DSRRecord.DSR_ACT_CUST_CODE == client_data.dsr_act_cust_code)


    if date_from and date_to:
        query = query.where(DSRRecord.DSR_BOOKING_DATE.between(date_from, date_to))

    elif date_from:
        query = query.where(DSRRecord.DSR_BOOKING_DATE >= date_from)

    elif date_to:
        query = query.where(DSRRecord.DSR_BOOKING_DATE <= date_to)

    # 👉 ordering
    query = query.order_by(desc(DSRRecord.id))

    result = await db.execute(query)

    all_bookings = result.scalars().all()

    if not client_id:
        codes = {b.DSR_ACT_CUST_CODE for b in all_bookings if b.DSR_ACT_CUST_CODE}

        if codes:
            client_result = await db.execute(
                select(Clients).where(Clients.dsr_act_cust_code.in_(codes))
            )
            clients = client_result.scalars().all()

            # map: code -> name
            client_name_map = {
                c.dsr_act_cust_code: c.name for c in clients
            }


    bookings_list = [
    {
        **{
            k: (v.isoformat() if hasattr(v, "isoformat") else v)
            for k, v in b.__dict__.items()
            if not k.startswith("_")
        },
        "client_name": client_name_map.get(b.DSR_ACT_CUST_CODE)
    }
    for b in all_bookings
]
    return {"bookings": bookings_list}

    


from collections import defaultdict
from fastapi import HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

class BookingUploadPayload(BaseModel):
    data: list[dict[str, Any]]

@booking_router.post("/bookingUpload")
async def bookingUpload(
    payload: BookingUploadPayload,
    db: AsyncSession = Depends(get_async_db),
    user = Depends(verify_token)
):
    # ---------------- USER VALIDATION ----------------
    result = await db.execute(select(Users).where(Users.email == user["email"]))
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not db_user.frenchise_id:
        raise HTTPException(status_code=400, detail="User has no franchise assigned")

    frenchise_id = db_user.frenchise_id

    if not payload.data:
        return {"message": "No data provided", "saved": []}

    # ---------------- CLIENT + SLABS FETCH ----------------
    client_id = payload.data[0].get("CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=400, detail="CLIENT_ID missing")

    client = await db.get(Clients, client_id)

    cli_gsts = await db.execute(select(GstPerClient).where(GstPerClient.client_id == client_id))
    gsts = cli_gsts.scalar_one_or_none()

    rplans = await db.execute(select(RatePlan).where(RatePlan.client_id == client_id))
    rplans = rplans.scalars().all()
    rplans_ids = [p.id for p in rplans]

    stmt = (
        select(RateSlab, RatePlan.transport_type)
        .join(RatePlan, RateSlab.plan_id == RatePlan.id)
        .where(RateSlab.plan_id.in_(rplans_ids))
    )

    result = await db.execute(stmt)
    rows = result.all()

    slabs_dict = defaultdict(list)

    for slab, transport_type in rows:
        key = transport_type.strip().lower() if transport_type else "unknown"
        slabs_dict[key].append([
            slab.min_weight,
            slab.max_weight,
            slab.rate_per_kg
        ])

    for ttype in slabs_dict:
        slabs_dict[ttype].sort(key=lambda x: x[0])

    slabs_dict = dict(slabs_dict)

    # ---------------- COLUMN MAP ----------------
    col_map = {c.key: c for c in DSRRecord.__table__.columns}

    saved_records = []

    # ---------------- MAIN LOOP ----------------
    for row in payload.data:
        normalized = {k.upper(): v for k, v in row.items()}

        filtered = {}
        for k, v in normalized.items():
            if k in col_map:
                filtered[k] = coerce_value(col_map[k], v)

        filtered["frenchise_id"] = frenchise_id

        # ---------------- CALCULATION ----------------
        chargable_weight = float(filtered.get("CHARGEABLE_WEIGHT") or 0)
        ttype = (filtered.get("DSR_MODE") or "").strip().lower()

        slab = slabs_dict.get(ttype)
        if not slab:
            raise HTTPException(
                status_code=404,
                detail=f"No slab found for transport type: {ttype}"
            )

        # PINCODES
        client_pin = client.pincode
        dest_pin = filtered.get("BKG_PINCODE") or filtered.get("DSR_DEST_PIN")

        if not isvalid_pincode(client_pin) or not isvalid_pincode(dest_pin):
            raise HTTPException(status_code=400, detail="Invalid pincode")

        client_state = get_state_from_pincode(client_pin)
        dest_state = get_state_from_pincode(dest_pin)

        within_state = client_state == dest_state
        # TAX %
        sgst_percent = gsts.sgst
        cgst_percent = gsts.cgst
        igst_percent = gsts.igst

        final_amounts = calculate_final_amount(
            sgst_percent,
            cgst_percent,
            igst_percent,
            chargable_weight,
            slab,
            within_state
        )

        # Inject calculated fields
        filtered["CGST"] = final_amounts["cgst"]
        filtered["SGST"] = final_amounts["sgst"]
        filtered["IGST"] = final_amounts["igst"]
        filtered["TOTAL_AMOUNT"] = final_amounts["final_amount"]

        # ---------------- UPSERT ----------------
        existing = await db.execute(
            select(DSRRecord).where(
                DSRRecord.DSR_CNNO == filtered.get("DSR_CNNO"),
                DSRRecord.DSR_BOOKING_DATE == filtered.get("DSR_BOOKING_DATE")
            )
        )

        existing_record = existing.scalar_one_or_none()

        if existing_record:
            for k, v in filtered.items():
                setattr(existing_record, k, v if v != "" else None)
            record = existing_record
        else:
            record = DSRRecord(**{k: v if v != "" else None for k, v in filtered.items()})
            db.add(record)

        await db.flush()
        saved_records.append(record)

    # ---------------- COMMIT ----------------
    await db.commit()

    for record in saved_records:
        await db.refresh(record)

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




def isvalid_pincode(pincode: str) -> bool:
    # Check if length is 6
    if len(pincode) != 6:
        return False
    
    # Check if all characters are digits
    if not pincode.isdigit():
        return False
    
    # Check if it starts with 0
    if pincode[0] == '0':
        return False
    
    return True



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

    cli_gsts = await db.execute(select(GstPerClient).where(GstPerClient.client_id == client_id))
    gsts = cli_gsts.scalar_one_or_none()

    
    client = await db.get(Clients, client_id)
    rplans = select(RatePlan).where(RatePlan.client_id == client_id)
    rplans = await db.execute(rplans)
    rplans = rplans.scalars().all()
    rplans_ids = [p.id for p in rplans]



    stmt = (
        select(RateSlab, RatePlan.transport_type)
        .join(RatePlan, RateSlab.plan_id == RatePlan.id)
        .where(RateSlab.plan_id.in_(rplans_ids))
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Grouping
    slabs_dict = defaultdict(list)

    for slab, transport_type in rows:
        key = transport_type.lower() if transport_type else "unknown"
        slabs_dict[key].append([
            slab.min_weight,
            slab.max_weight,
            slab.rate_per_kg
        ])

    # Optional: sort slabs by min_weight for each transport type
    for ttype in slabs_dict:
        slabs_dict[ttype].sort(key=lambda x: x[0])

    slabs_dict = dict(slabs_dict)


    for booking in bookings:
        # Skip invalid DSR_CNNO
        if not booking.get("DSR_CNNO"):
            continue
        existing = await db.execute(
            select(DSRRecord).where(
                DSRRecord.DSR_CNNO == booking.get("DSR_CNNO"),
                DSRRecord.DSR_BOOKING_DATE == booking_date
            )
        )

        #else calculate igst , cgst . sgst and total and push in table
        cli_pin = client.pincode if isvalid_pincode(client.pincode) else booking.get("BKG_PINCODE")
        cli_state = get_state_from_pincode(client.pincode if isvalid_pincode(client.pincode) else booking.get("BKG_PINCODE"))
        dest_state = get_state_from_pincode(booking.get("BKG_PINCODE"))
        sgst_percent = gsts.sgst
        cgst_percent = gsts.cgst
        igst_percent = gsts.igst
        chargable_weight = float(booking.get("CHARGEABLE_WEIGHT") or 0)
        ttype = (booking.get("DSR_MODE") or "").strip().lower()
        slab = slabs_dict.get(ttype)
        if slab == None:
            raise HTTPException(status_code=404, detail="No valid Slab for this transport type with this client")
        within_state = cli_state == dest_state
        final_amounts = calculate_final_amount(sgst_percent , cgst_percent , igst_percent , chargable_weight , slab , within_state)

        existing_record = existing.scalar_one_or_none()
        if not existing_record:
            record = DSRRecord(
                frenchise_id=frenchise_id,
                DSR_CUST_CODE=client.dsr_act_cust_code,
                DSR_ACT_CUST_CODE = client.dsr_act_cust_code,
                DSR_CNNO=booking.get("DSR_CNNO"),
                DSR_MODE = booking.get("DSR_MODE"),

                DSR_DEST_PIN = cli_pin,

                BKG_PINCODE = booking.get("BKG_PINCODE"),
                DSR_REFNO=booking.get("DSR_REF_NO"),
                CHARGEABLE_WEIGHT=float(booking.get("CHARGEABLE_WEIGHT") or 0),
                RECEIVER_NAME=booking.get("RECEIVER_NAME") or "",
                RECEIVER_PIN=booking.get("RECEIVER_PIN") or "",
                CASH_AMT=float(booking.get("CASH_AMOUNT") or 0),
                UPI_ONLINE_AMT=float(booking.get("UPI_ONLINE_AMOUNT") or 0),
                CREDIT_AMT=float(booking.get("CREDIT_AMOUNT") or 0),
                TRANSACTION_REF_NO=booking.get("TRANSACTION_REFNO") or "",
                PAYMENT_DATE=booking.get("PAYMENT_DATE"),

                IGST  = final_amounts.get("igst"),
                CGST = final_amounts.get("cgst"),
                SGST = final_amounts.get("sgst"),


                TOTAL_AMOUNT=float(final_amounts.get("total")),

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



@booking_router.delete("/deleteBooking")
async def delete_booking(
    payload: dict, 
    db: AsyncSession = Depends(get_async_db),
    user: Users = Depends(verify_token)
):
    booking_id = payload.get("id")
    if not booking_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking ID is required"
        )

    # Perform delete
    stmt = delete(DSRRecord).where(DSRRecord.id == booking_id)
    result = await db.execute(stmt)

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    await db.commit()
    return {"status": "Success", "deleted_id": booking_id}



@booking_router.post("/generateInvoice")
async def generate_invoice(
    payload: dict, 
    db: AsyncSession = Depends(get_async_db),
    user: Users = Depends(verify_token)
):
    booking_ids = payload.get("booking_ids")
    if not booking_ids or not isinstance(booking_ids, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="booking_ids must be a non-empty list"
        )

    # Fetch DSR records
    stmt = select(DSRRecord).where(DSRRecord.id.in_(booking_ids))
    result = await db.execute(stmt)
    dsr_records = result.scalars().all()
    if not dsr_records:
        raise HTTPException(status_code=404, detail="No DSR records found for provided IDs")

    # Ensure all DSR records are for the same client
    client_codes = set(record.DSR_ACT_CUST_CODE for record in dsr_records)
    if len(client_codes) > 1:
        raise HTTPException(status_code=400, detail="All DSR records must belong to the same client")
    client_code = client_codes.pop()

    # Fetch client
    stmt_client = select(Clients).where(Clients.dsr_act_cust_code == client_code)
    client = (await db.execute(stmt_client)).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Fetch franchise info
    frenchise_id = dsr_records[0].frenchise_id
    stmt_frenchise = select(Frenchise).where(Frenchise.id == frenchise_id)
    frenchise = (await db.execute(stmt_frenchise)).scalar_one_or_none()
    if not frenchise:
        raise HTTPException(status_code=404, detail="Franchise not found")

    # Generate invoice number and date
    invoice_no = f"INV-{client.id}-{int(datetime.datetime.now().timestamp())}"
    invoice_date = datetime.datetime.now().date()

    # Calculate totals
    total_freight = sum((r.FREIGHT_CHARGES or 0) for r in dsr_records)
    total_fod = sum((r.FOD_COD_CHARGES or 0) for r in dsr_records)
    total_vas = sum((r.VAS_CHARGES or 0) for r in dsr_records)
    total_risk = sum((r.RISK_SURCHAGES or 0) for r in dsr_records)
    subtotal = total_freight + total_fod + total_vas + total_risk

    gst_amount = subtotal * 0.18
    cgst = sgst = gst_amount / 2
    igst = 0
    grand_total = subtotal + gst_amount

    # Create invoice in DB
    new_invoice = Invoice(
        invoice_no=invoice_no,
        invoice_date=invoice_date,
        client_id=client.id,
        frenchise_id=frenchise.id,
        total_bookings=len(dsr_records),
        subtotal=subtotal,
        cgst=cgst,
        sgst=sgst,
        igst=igst,
        grand_total=grand_total,
        dsr_ids=booking_ids  # store list of DSRRecord IDs
    )
    db.add(new_invoice)
    await db.commit()
    await db.refresh(new_invoice)

    # Update DSR records with invoice reference
    stmt_update = (
        update(DSRRecord)
        .where(DSRRecord.id.in_(booking_ids))
        .values(
            INVOICE_NO=invoice_no,
            INVOICE_DATE=invoice_date,
            TOTAL_AMOUNT=grand_total,
            CGST=cgst,
            SGST=sgst,
            IGST=igst
        )
    )
    await db.execute(stmt_update)
    await db.commit()

    return {
        "status": "success",
        "invoice_id": new_invoice.id,
        "invoice_no": invoice_no,
        "invoice_date": str(invoice_date),
        "client_name": client.name,
        "frenchise_name": frenchise.frenchise_name,
        "total_bookings": len(dsr_records),
        "subtotal": subtotal,
        "cgst": cgst,
        "sgst": sgst,
        "igst": igst,
        "grand_total": grand_total,
        "dsr_ids": booking_ids
    }