from typing import Optional

from bucket_utils import upload_file_to_railway
from utils import verify_owner_token, verify_token
from sqlalchemy.future import select
from fastapi import APIRouter , Depends , HTTPException , Query , Form , UploadFile , File
from pydantic import BaseModel
from db.tables import Clients, Frenchise, Users
from sqlalchemy.ext.asyncio import AsyncSession
from db.db import  get_async_db
from sqlalchemy import or_


client_router = APIRouter()



@client_router.get("/getClients")
async def get_clients(db: AsyncSession = Depends(get_async_db) ,user=Depends(verify_token)):  

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
            "dsr_act_cust_code": c.dsr_act_cust_code,
            "address": c.address,
            "tan_number" : c.tan_number,
            "payment_term" : c.payment_term,
            "kyc_id_number" : c.kyc_id_number,
            "kyc_doc_type" :c.kyc_doc_type,
            "kyc_doc" : c.kyc_doc,
            "agreement_doc" : c.agreement_doc
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
    dsr_act_cust_code:Optional[str] = ""
    city: Optional[str] = ""
    address : Optional[str] = ""
    tan_number : Optional[str] = ""
    payment_term : Optional[str] = ""
    kyc_id_number : Optional[str] = ""
    kyc_doc_type : Optional[str] = ""


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
        dsr_act_cust_code = data.dsr_act_cust_code,
        address = data.address,
        frenchise_id = db_user.frenchise_id,
        tan_number = data.tan_number,
        payment_term = data.payment_term,
        kyc_id_number = data.kyc_id_number,
        kyc_doc_type = data.kyc_doc_type,
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
        "dsr_act_cust_code": new_client.dsr_act_cust_code,
        "address": new_client.address,
        "tan_number" : new_client.tan_number,
        "payment_term" : new_client.payment_term,
        "kyc_id_number" : new_client.kyc_id_number,
        "kyc_doc_type" :new_client.kyc_doc_type,
        "kyc_doc" : new_client.kyc_doc,
        "agreement_doc" : new_client.agreement_doc

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
    dsr_act_cust_code:Optional[str] = ""
    city: Optional[str] = ""
    address : Optional[str] = ""
    tan_number : Optional[str] = ""
    payment_term : Optional[str] = ""
    kyc_id_number : Optional[str] = ""
    kyc_doc_type : Optional[str] = ""



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




@client_router.get("/searchClientsByName")
async def search_clients_by_name(search: str = Query("", description="Search client by name"),
                                 db: AsyncSession = Depends(get_async_db),
                                 user=Depends(verify_token)):
    
    result = await db.execute(
        select(Users).where(Users.email == user["email"])
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(Clients).where(Clients.frenchise_id == user.frenchise_id)

    if search:
        query = query.where(
            or_(
                Clients.name.ilike(f"%{search}%"),
            )
        )

    result = await db.execute(query)
    clients = result.scalars().all()


    return [
        {
            "id": c.id,
            "name": c.name,
            "phone": c.phone_number
        }
        for c in clients
    ]








@client_router.get("/searchClientsByPhone")
async def search_clients_by_phone(search: str = Query("", description="Search client by name"),
                                  db: AsyncSession = Depends(get_async_db),
                                  user=Depends(verify_token)
                                  ):
    result = await db.execute(
        select(Users).where(Users.email == user["email"])
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(Clients).where(Clients.frenchise_id == user.frenchise_id)

    if search:
        query = query.where(
            or_(
                Clients.phone_number.ilike(f"%{search}%"),
            )
        )

    result = await db.execute(query)
    clients = result.scalars().all()


    return [
        {
            "id": c.id,
            "name": c.name,
            "phone": c.phone_number
        }
        for c in clients
    ]



@client_router.post("/uploadClientDoc")
async def upload_file(
    client_id: int = Form(...),
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    user = Depends(verify_token)
):
    result = await db.execute(
        select(Clients).where(Clients.id == client_id)
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="User not found")
    
    url = await upload_file_to_railway(file, f"client_{client_id}_{doc_type}")
    setattr(client, doc_type, url)
    print(doc_type)
    # 5️⃣ Commit changes
    await db.commit()
    return {
        "url" : url
    }