from datetime import date 
from enum import Enum
from typing import Optional
from datetime import datetime, time

from bucket_utils import get_url_for_file, upload_inv_to_railway
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, validator
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import StreamingResponse
from sqlalchemy import or_, desc
from sqlalchemy.orm import selectinload

from utils import verify_token
from invoice_pdf_generator import generate_invoice
from db.db import get_async_db
from db.tables import Clients, DSRRecord, Frenchise, Invoice, RatePlan, RateSlab, TransportTypes, Users

invoice_router = APIRouter()




@invoice_router.post("/invoices/generate")
async def invoice_generate(data:dict,
                           db: AsyncSession = Depends(get_async_db) ,
                           user=Depends(verify_token)): 
    ids = data.get("booking_ids")
    invoice_type = data.get("invoice_type")
    query = (
        select(DSRRecord)
        .where(DSRRecord.id.in_(ids))
        .order_by(DSRRecord.id.asc())
    )
    result = await db.execute(query)
    bookings = result.scalars().all()

    data_for_invoice = []
    client_id = data.get("client_id")

    for booking in bookings:
        booking_date = booking.DSR_BOOKING_DATE
        description = f"{booking.DSR_MODE} - to {booking.DSR_DEST} ({booking.DSR_DEST_PIN})"

        this_booking = {
            "description": description,
            "dsr_cnno": booking.DSR_CNNO,
            "dsr_booking_date": booking_date.strftime("%d %b %Y"),
            "chargeable_weight":booking.CHARGEABLE_WEIGHT,
            "total_amount":booking.TOTAL_AMOUNT,
            "igst":booking.IGST,
            "cgst":booking.CGST,
            "sgst":booking.SGST
        }

        data_for_invoice.append(this_booking)

    
    result = await db.execute(
        select(Users).where(Users.email == user["email"])
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not db_user.frenchise_id:
        raise HTTPException(status_code=400, detail="User has no franchise assigned")

    result = await db.execute(
        select(Frenchise).where(Frenchise.id == db_user.frenchise_id)
    )
    frenchise = result.scalar_one_or_none()

    if not frenchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    



    franchise_data = {
        "frenchise_name":   frenchise.frenchise_name,
        "owner_name":        frenchise.owner_name,
        "phone_number":      frenchise.phone_number,
        "email":             frenchise.email,
        "gst_number":        frenchise.gst_number,
        "tan_number":        frenchise.tan_number,       
        "frenchise_code":    frenchise.frenchise_code,
        "city":              frenchise.city,
        "business_address":  frenchise.business_address,
        "website_url":       frenchise.website_url,
        "moto":              frenchise.moto
    }


    client_d = (await db.execute(select(Clients).where(Clients.id == client_id))).scalars().first()
    if not client_d:
        raise HTTPException(status_code=404, detail="Client not found")
    

    client_data = {
        "name":            client_d.name,
        "cin_number":      client_d.cin_number,                 # omitted — should not appear
        "phone_number":    client_d.phone_number,
        "email":           client_d.email,
        "pincode":         client_d.pincode,
        "gst_number":      client_d.gst_number,
        "pan_number":      client_d.pan_number,
        "tan_number":      client_d.tan_number,                 # omitted — should not appear
        "payment_term":    client_d.payment_term,
        "city":            client_d.city,
        "address":         client_d.address,
        "dsr_act_cust_code": client_d.dsr_act_cust_code
    }
    st = generate_invoice(
        franchise=franchise_data,
        client=client_data,
        bookings=data_for_invoice,
        is_proforma=invoice_type == 'proforma'
    )
    bfr = st.get("buffer")
    gt = st.get("gt")

    id_str = "_".join(str(i) for i in ids)
    filename = f"proforma_invoices/inv_{id_str}.pdf" if invoice_type == 'proforma' else f"invoices/inv_{id_str}.pdf"

    pdf_url = await upload_inv_to_railway(bfr, filename)


    new_invoice = Invoice(
        client_id=client_id,
        client_name=client_d.name,
        booking_count=len(ids),
        dsr_ids=ids,
        total_amount=gt,
        pdf_url=pdf_url,
        invoice_type = invoice_type,
        frenchise_id= client_d.frenchise_id
    )

    db.add(new_invoice)
    await db.commit()
    await db.refresh(new_invoice)

    return {
        "invoice_id": new_invoice.id,
        "invoice_url" : pdf_url
        }



@invoice_router.get("/invoices")
async def get_invoices(invoice_type:Optional[str] = None,
                       client_id: Optional[int] = None,
                       date_from: Optional[date] = None,
                       date_to:Optional[date] = None,
                       db: AsyncSession = Depends(get_async_db) ,
                       user=Depends(verify_token)):  
    
    if not client_id and not date_from:
        return []
    


    query = select(Invoice).where(
        Invoice.client_id == client_id
    )


# Convert date strings to datetime if needed
    if date_from:
        date_from = datetime.combine(date_from, time.min)  # 00:00:00
    if date_to:
        date_to = datetime.combine(date_to, time.max)      # 23:59:59

    if date_from and date_to:
        query = query.where(Invoice.created_at.between(date_from, date_to))

    elif date_from:
        query = query.where(Invoice.created_at >= date_from)

    elif date_to:
        query = query.where(Invoice.created_at <= date_to)

    if invoice_type:
        query = query.where(Invoice.invoice_type == invoice_type)

    query = query.order_by(desc(Invoice.id))

    result = await db.execute(query)

    all_invoices = result.scalars().all()

    return_data = []

   

    for inv in all_invoices:
        bd = inv.created_at
        this_inv = {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client_id": inv.client_id,
            "client_name": inv.client_name,
            "booking_count": inv.booking_count,
            "total_amount": inv.total_amount,
            "invoice_type" : inv.invoice_type,
            "created_at": bd.strftime("%d %b %Y"),
            "pdf_url": inv.pdf_url
        }

        return_data.append(this_inv)

    return return_data





import io, csv


@invoice_router.get("/invoices/export")
async def export_invoices(invoice_type: Optional[str] = Query(None),
                          client_id:    Optional[int]         = Query(None),
                          date_from:    Optional[date]        = Query(None),
                          date_to:      Optional[date]        = Query(None),
                          db: AsyncSession = Depends(get_async_db) ,
                          user=Depends(verify_token)):
      
    if not client_id and not date_from:
        raise HTTPException(status_code=404, detail="Client or date from not found")
    
    query = select(Invoice).where(
        Invoice.client_id == client_id
    )


    if date_from:
        date_from = datetime.combine(date_from, time.min)  # 00:00:00
    if date_to:
        date_to = datetime.combine(date_to, time.max)      # 23:59:59

    if date_from and date_to:
        query = query.where(Invoice.created_at.between(date_from, date_to))

    elif date_from:
        query = query.where(Invoice.created_at >= date_from)

    elif date_to:
        query = query.where(Invoice.created_at <= date_to)

    if invoice_type:
        query = query.where(Invoice.invoice_type == invoice_type)

    query = query.order_by(desc(Invoice.id))

    result = await db.execute(query)

    all_invoices = result.scalars().all()
    

    rows = [
        {
            "Invoice Number": inv.invoice_number or f"INV-{str(inv.id).zfill(5)}",
            "Type":           "Proforma" if inv.invoice_type == "proforma" else "Tax Invoice",
            "Client":         inv.client_name or "",
            "Bookings":       inv.booking_count or 0,
            "Total Amount":   float(inv.total_amount or 0),
            "Generated On":   inv.created_at.strftime("%d/%m/%Y") if inv.created_at else "",
            "PDF URL":        inv.pdf_url or "",
        }
        for inv in all_invoices
    ]

    return _export_csv(rows)


def _export_csv(rows: list) -> StreamingResponse:
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=invoices.csv"},
    )
