from bucket_utils import upload_file_to_railway
from sqlalchemy.future import select
from fastapi import APIRouter , Depends , HTTPException , Form , File , UploadFile
from pydantic import BaseModel
from db.tables import Frenchise,  Users
from sqlalchemy.ext.asyncio import AsyncSession
from db.db import  get_async_db
from utils import  create_access_token, create_refresh_token, verify_owner_token, verify_token



setting_router = APIRouter()



@setting_router.get("/settings")
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
        select(Frenchise).where(Frenchise.id == db_user.frenchise_id)
    )
    frenchise = result.scalar_one_or_none()

    if not frenchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    

    result = await db.execute(
        select(Users).where(Users.frenchise_id == db_user.frenchise_id)
    )

    all_users = result.scalars().all()

    user_data = {"name" : db_user.name , "email" : db_user.email , "password" : db_user.password}
    frenchise_data = {
            "frenchise_name": frenchise.frenchise_name,
            "owner_name": frenchise.owner_name,
            "phone_number": frenchise.phone_number,
            "owner_email": frenchise.email,
            "business_address": frenchise.business_address,
            "city" : frenchise.city,
            "gst_number": frenchise.gst_number,
            "frenchise_code": frenchise.frenchise_code,
            "tan_number" : frenchise.tan_number,
            "kyc_id_number" : frenchise.kyc_id_number,
            "kyc_doc_type" : frenchise.kyc_doc_type,
            "kyc_doc" : frenchise.kyc_doc,
            "agreement_doc" : frenchise.agreement_doc,
            "website_url" : frenchise.website_url,
            "moto" : frenchise.moto
        }
    
    users_list = []
    for u in all_users:
        status = "Active" if not u.is_disabled else "Inactive"
        this_user = {"id" : u.id , "name" : u.name , "email" : u.email ,"password" : u.password, "role" : u.user_type , "status" : status}
        users_list.append(this_user)

    # 5️⃣ Commit changes
    await db.commit()

    return {
        "franchiseProfile": frenchise_data,
        "personalProfile": user_data,
        "users": users_list
    }





class updateFrenchiseProfileUpdates(BaseModel):

    frenchise_name : str
    owner_name :str
    phone_number :str
    owner_email :str
    gst_number :str
    frenchise_code : str
    city :str
    business_address : str
    tan_number : str
    kyc_id_number : str
    kyc_doc_type : str
    website_url : str
    moto : str

@setting_router.put("/updateFrenchiseProfile")
async def updateFrenchiseProfile(data: updateFrenchiseProfileUpdates , db: AsyncSession = Depends(get_async_db), user=Depends(verify_owner_token)): 
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

    # 4️⃣ Update fields (only if provided)
    update_data = data.dict(exclude_unset=True)


    for key, value in update_data.items():
        if hasattr(frenchise, key):
            setattr(frenchise, key, value)

    # 5️⃣ Commit changes
    await db.commit()
    await db.refresh(frenchise)

    return {
        "message": "Franchise profile updated successfully",
        "data": update_data
    }



class updatePersonalProfileUpdates(BaseModel):
    email:str
    name:str
    password:str



@setting_router.put("/updatePersonalProfile")
async def updatePersonalProfile(data: updatePersonalProfileUpdates , db: AsyncSession = Depends(get_async_db), user=Depends(verify_token)): 

    result = await db.execute(
        select(Users).where(Users.email == user["email"])
    )
    db_user = result.scalar_one_or_none()

 
    # 4️⃣ Update fields (only if provided)
    update_data = data.dict(exclude_unset=True)


    for key, value in update_data.items():
        if hasattr(db_user, key):
            setattr(db_user, key, value)

    # 5️⃣ Commit changes
    await db.commit()
    await db.refresh(db_user)


    token_data = {
        "email": data.email,
        "user_type": user["user_type"]
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return {
        "message": "Personal profile updated successfully",
        "data": update_data,
        "access_token" : access_token,
        "refresh_token" : refresh_token
    }





class addNewUserData(BaseModel):
    name:str
    email:str
    password: str
    role:str

@setting_router.post("/addNewUser")
async def addNewUser(data:addNewUserData ,  db: AsyncSession = Depends(get_async_db), user=Depends(verify_owner_token)):
    
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
    
    frenchise_id = frenchise.id

    new_user = Users(
        name=data.name,
        email=data.email,
        password=data.password,
        user_type=data.role,
        frenchise_id=frenchise_id,
        is_disabled=False
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    this_user = {"id" : new_user.id , "name" : new_user.name , "email" : new_user.email ,"password" : new_user.password, "role" : new_user.user_type , "status" : "Active"}

    return {
        "message": "New User created",
        "data": this_user,
    }




class editUserData(BaseModel):
    id : int
    name : str
    email : str
    password : str
    role : str
    status : str



@setting_router.put("/editUser")
async def editUser(data:editUserData ,  db: AsyncSession = Depends(get_async_db), user=Depends(verify_owner_token)):
    result = await db.execute(
        select(Users).where(Users.email == data.email)
    )
    db_user = result.scalar_one_or_none()


    update_data = data.dict(exclude_unset=True)
    update_data["is_disabled"] = False if data.status == "Active" else True
    update_data["user_type"] = data.role


    for key, value in update_data.items():
        if hasattr(db_user, key):
            setattr(db_user, key, value)

    await db.commit()
    await db.refresh(db_user)
    status = "Active" if not db_user.is_disabled else "Inactive"

    this_user = {"id" : db_user.id , "name" : db_user.name , "email" : db_user.email ,"password" : db_user.password, "role" : db_user.user_type , "status" : status}

    return {
        "message": "set data edited",
        "data": this_user,
    }




@setting_router.post("/uploadFrenchiseDoc")
async def upload_file(
    name: str = Form(...),  # 'kyc_doc' or 'agreement_doc'
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    user=Depends(verify_owner_token)
):
    url = await upload_file_to_railway(file, name)
    print(url)
    return {"url" : url}
    
