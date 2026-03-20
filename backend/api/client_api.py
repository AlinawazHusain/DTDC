from typing import Optional

from utils import verify_owner_token, verify_token
from sqlalchemy.future import select
from fastapi import APIRouter , Depends , HTTPException
from pydantic import BaseModel
from db.tables import Clients, Frenchise, Users
from sqlalchemy.ext.asyncio import AsyncSession
from db.db import  get_async_db



client_router = APIRouter()



@client_router.get("/getClients")
async def get_settings(db: AsyncSession = Depends(get_async_db) ,user=Depends(verify_token)):  

    result = await db.execute(
        select(Users).where(Users.email == user["email"])
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not db_user.frenchise_id:
        raise HTTPException(status_code=400, detail="User has no franchise assigned")


    result = await db.execute(
        select(Clients).where(Clients.frenchise_id == db_user.frenchise_id)
    )

    all_clients = result.scalars().all()

    response_data = []

    for c in all_clients:
        this_client = {
            "id": c.id,
            "name": c.name,
            "cin_number": c.cin_number,
            "phone_number": c.phone_number,
            "email": c.email,
            "pincode": c.pincode,
            "city": c.city,
            "gst_number": c.gst_number,
            "pan_number": c.pan_number,
            "dsr_cust_code": c.dsr_cust_code,
            "address": c.address,
            "total_business": c.total_business,
            "due_payment": c.due_payment
        }
        response_data.append(this_client)

    return {
        "data": response_data
        }






class addNewClientData(BaseModel):
    name: str
    cin_number: Optional[str] = ""
    phone_number: Optional[str] = ""
    email: Optional[str] = ""
    pincode: Optional[str] = ""
    gst_number: Optional[str] = ""
    pan_number: Optional[str] = ""
    dsr_cust_code:Optional[str] = ""
    city: Optional[str] = ""
    address : Optional[str] = ""


@client_router.post("/addNewClient")
async def addNewClient(data: addNewClientData , db: AsyncSession = Depends(get_async_db) ,user=Depends(verify_token)): 
    result = await db.execute(
        select(Users).where(Users.email == user["email"])
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not db_user.frenchise_id:
        raise HTTPException(status_code=400, detail="User has no franchise assigned")
    
    new_client = Clients(
        name = data.name,
        cin_number = data.cin_number,
        phone_number = data.phone_number,
        email = data.email,
        pincode = data.pincode,
        gst_number = data.gst_number,
        pan_number = data.pan_number,
        city = data.city,
        dsr_cust_code = data.dsr_cust_code,
        address = data.address,
        frenchise_id = db_user.frenchise_id

        )
    db.add(new_client)
    await db.commit()
    await db.refresh(new_client)
    return {
            "id": new_client.id,
            "name": new_client.name,
            "cin_number": new_client.cin_number,
            "phone_number": new_client.phone_number,
            "email": new_client.email,
            "pincode": new_client.pincode,
            "city": new_client.city,
            "gst_number": new_client.gst_number,
            "pan_number": new_client.pan_number,
            "dsr_cust_code": new_client.dsr_cust_code,
            "address": new_client.address,
            "total_business": new_client.total_business,
            "due_payment": new_client.due_payment
            }






class updateClientData(BaseModel):
    id : int
    name: str
    cin_number: Optional[str] = ""
    phone_number: Optional[str] = ""
    email: Optional[str] = ""
    pincode: Optional[str] = ""
    gst_number: Optional[str] = ""
    pan_number: Optional[str] = ""
    dsr_cust_code:Optional[str] = ""
    city: Optional[str] = ""
    address : Optional[str] = ""



@client_router.put("/updateClient")
async def updateClient(data: updateClientData , db: AsyncSession = Depends(get_async_db) ,user=Depends(verify_owner_token)): 

    result = await db.execute(
        select(Clients).where(Clients.id == data.id)
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = data.dict(exclude_unset=True)


    for key, value in update_data.items():
        if hasattr(client, key):
            setattr(client, key, value)

    # 5️⃣ Commit changes
    await db.commit()
    await db.refresh(client)

    return update_data