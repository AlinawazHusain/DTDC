from fastapi import APIRouter
from .auth_api import auth_router
from .setting_api import setting_router
from .client_api import client_router
from .booking_api import booking_router
from .rates_api import rate_router
from .invoice_api import invoice_router

api_router = APIRouter()


api_router.include_router(auth_router, tags = ["Auth router"])
api_router.include_router(setting_router, tags = ["Setting router"])
api_router.include_router(client_router, tags = ["Client router"])
api_router.include_router(booking_router, tags = ["Booking router"])
api_router.include_router(rate_router, tags = ["Rate router"])
api_router.include_router(invoice_router, tags = ["Invoice router"])