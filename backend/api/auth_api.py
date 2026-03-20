from typing import Optional
import jwt
from sqlalchemy.future import select
from fastapi import APIRouter , Depends , HTTPException , status
from pydantic import BaseModel
from db.tables import Frenchise, UserType, Users
from sqlalchemy.ext.asyncio import AsyncSession
from db.db import  get_async_db
from utils import ALGORITHM, JWT_SECRET_KEY, create_access_token , create_refresh_token



auth_router = APIRouter()





class LoginData(BaseModel):
    email: str
    password: str

@auth_router.post("/login")
async def login(data: LoginData , db: AsyncSession = Depends(get_async_db)):
    
    result = await db.execute(select(Users).where(Users.email == data.email))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Email do not exist , Signup")
    
    if not data.password == user.password:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    token_data = {
        "email": user.email,
        "user_type": user.user_type.value,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return {
        "access_token": access_token,
        "refresh_token" : refresh_token,
        "user_type": user.user_type.value
    }





class SignupData(BaseModel):
    name: str
    email: str
    phone_number: str
    password: str
    frenchise_name: str
    city: str
    dtdc_frenchise_code: str
    gst_number : Optional[str] = None


@auth_router.post("/signup")
async def signup(data: SignupData , db: AsyncSession = Depends(get_async_db)):

    result = await db.execute(select(Users).where(Users.email == data.email))
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(status_code=401, detail="User already exists with this email, please login")
    

    new_frenchise = Frenchise(
        frenchise_name=data.frenchise_name,
        owner_name=data.name,
        phone_number=data.phone_number,
        email=data.email,
        gst_number=data.gst_number,
        frenchise_code=data.dtdc_frenchise_code,
        city=data.city,
        business_address=""
    )
    db.add(new_frenchise)
    await db.commit() 
    await db.refresh(new_frenchise)
    
   
    

    new_user = Users(
        name=data.name,
        email=data.email,
        password=data.password,
        user_type=UserType.owner,
        frenchise_id=new_frenchise.id,
        is_disabled=False
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token_data = {
        "email": new_user.email,
        "user_type": new_user.user_type.value,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user_type": new_user.user_type.value
    }



class refreshAccessTokenData(BaseModel):
    refresh_token : str

@auth_router.post("/refreshAccessToken")
async def refreshAccessToken(data: refreshAccessTokenData):

    try:
        print(data.refresh_token)
        payload = jwt.decode(data.refresh_token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        print(payload)
        user_email: str = payload.get("email")
        if user_email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        token_data = {
        "email": payload["email"],
        "user_type": payload["user_type"]
        }

        access_token = create_access_token(token_data)

        return {
            "access_token" : access_token
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

