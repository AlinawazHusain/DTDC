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






def generate_invoice(
    cgst: float,
    sgst: float,
    igst: float,
    chargeable_weight: float,
    slabs: list,
    same_state : bool
):
    """
    slabs format:
    [
        {"min": 0, "max": 100, "rate": 10},
        {"min": 101, "max": 500, "rate": 8},
        {"min": 501, "max": None, "rate": 6},  # None = infinite
    ]
    """

    # 1️⃣ Find slab (handle infinite max)
    slab = next(
        (
            s for s in slabs
            if chargeable_weight >= s["min"]
            and (s["max"] is None or chargeable_weight <= s["max"])
        ),
        None,
    )

    if not slab:
        raise ValueError("No slab found for given weight")

    # 2️⃣ Base cost
    base_cost = chargeable_weight * slab["rate"]

    # 3️⃣ GST logic
    if same_state:
        cgst_amt = base_cost * cgst / 100
        sgst_amt = base_cost * sgst / 100
        igst_amt = 0
    else:
        cgst_amt = 0
        sgst_amt = 0
        igst_amt = base_cost * igst / 100

    total_tax = cgst_amt + sgst_amt + igst_amt
    total_amount = base_cost + total_tax

    # 4️⃣ Return result
    return {
        "chargeable_weight": chargeable_weight,
        "rate_used": slab["rate"],
        "base_cost": round(base_cost, 2),
        "cgst": round(cgst_amt, 2),
        "sgst": round(sgst_amt, 2),
        "igst": round(igst_amt, 2),
        "total_tax": round(total_tax, 2),
        "total_amount": round(total_amount, 2),
    }