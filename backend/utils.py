from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import date, time, datetime
from sqlalchemy import Date, Time, DateTime, Integer, Float, Numeric


JWT_SECRET_KEY = "asdfghjkl!@#$%^&*()LKJHGFDSA)(*&^%$#@!)"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
REFRESH_TOKEN_EXPIRE_MINUTES = 60 * 24 *7

bearer_scheme = HTTPBearer()

# ── Create token (call this on login) ─────────────────────────────────────────
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp())})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp())})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)



# ── Decode & validate token ────────────────────────────────────────────────────
def verify_owner_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = credentials.credentials  # extracts the token after "Bearer "

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_type: str = payload.get("user_type")
        if user_type is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if user_type != "owner":
            raise HTTPException(status_code=401, detail="Only owner have this access")
        return payload  # return full payload so routes can use it
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = credentials.credentials  # extracts the token after "Bearer "

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_email: str = payload.get("email")
        if user_email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload  # return full payload so routes can use it
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    








def coerce_value(column, value):
    """Convert a raw string value to the correct Python type for the column."""
    if value is None or value == '' or value == '-':
        return None

    col_type = type(column.type)

    try:
        if col_type is Date:
            if isinstance(value, date):
                return value
            # Handle DD-MM-YYYY and YYYY-MM-DD
            for fmt in ('%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d'):
                try:
                    return datetime.strptime(str(value), fmt).date()
                except ValueError:
                    continue
            return None

        elif col_type is Time:
            if isinstance(value, time):
                return value
            for fmt in ('%H:%M:%S', '%H:%M'):
                try:
                    return datetime.strptime(str(value), fmt).time()
                except ValueError:
                    continue
            return None

        elif col_type is DateTime:
            if isinstance(value, datetime):
                return value
            for fmt in ('%d-%m-%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%d-%m-%Y', '%Y-%m-%d'):
                try:
                    return datetime.strptime(str(value), fmt)
                except ValueError:
                    continue
            return None

        elif col_type in (Integer,):
            return int(float(str(value)))

        elif col_type in (Float, Numeric):
            return float(str(value))

        else:
            return str(value) if value != '' else None

    except (ValueError, TypeError):
        return None
    




def parse_date(date_str):
    """Convert a string YYYY-MM-DD to a datetime.date object, or return None if empty"""
    if not date_str:
        return None
    if isinstance(date_str, date):
        return date_str  # already a date
    return datetime.strptime(date_str, "%Y-%m-%d").date()