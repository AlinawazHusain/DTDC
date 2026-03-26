from sqlalchemy import (
    Column, String, Integer, Float, Date, DateTime , Time , Enum, ForeignKey , Boolean , Sequence , text ,  UniqueConstraint , JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime
from db.base import Base
import enum



# Define allowed user types
class UserType(enum.Enum):
    owner = "owner"
    staff = "staff"


class Users(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    user_type = Column(Enum(UserType), nullable=False)
    is_disabled = Column(Boolean , default = False)
    frenchise_id = Column(Integer, ForeignKey("frenchise.id"), nullable=True)



class Frenchise(Base):
    __tablename__ = "frenchise"

    id = Column(Integer, primary_key=True, autoincrement=True)
    frenchise_name = Column(String(255))
    owner_name = Column(String(255))
    phone_number = Column(String(15))
    email = Column(String(255))
    gst_number = Column(String(50))
    frenchise_code = Column(String(50))
    city = Column(String(50))
    business_address = Column(String(255))


class Clients(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255))
    cin_number = Column(String(255))
    phone_number = Column(String(15))
    email = Column(String(255))
    pincode = Column(String(10))
    gst_number = Column(String(50))
    pan_number = Column(String(50))
    city = Column(String(50))
    dsr_cust_code = Column(String(50))
    address = Column(String(255))

    total_business = Column(Float , default = 0.0)
    due_payment = Column(Float , default = 0.0)

    frenchise_id = Column(Integer, ForeignKey("frenchise.id"), nullable=True)





class DSRRecord(Base):
    __tablename__ = "dsr_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    frenchise_id = Column(Integer, ForeignKey("frenchise.id"), nullable=True)

    DSR_BRANCH_CODE = Column(String(100))
    DSR_CNNO = Column(String(100))
    DSR_BOOKED_BY = Column(String(100))
    DSR_CUST_CODE = Column(String(100))

    CHARGEABLE_WEIGHT = Column(Float)
    DSR_CN_TYPE = Column(String(100))
    DSR_DEST = Column(String(100))
    DSR_MODE = Column(String(100))
    DSR_NO_OF_PIECES = Column(Integer)
    DSR_DEST_PIN = Column(String(100))

    DSR_BOOKING_DATE = Column(Date)
    DSR_AMT = Column(Float)
    DSR_STATUS = Column(String(100))
    DSR_POD_RECD = Column(String(100))
    DSR_TRANSMF_NO = Column(String(100))
    DSR_BOOKING_TIME = Column(Time)

    DSR_DOX = Column(String(100))

    DSR_SERVICE_TAX = Column(Float)
    DSR_SPL_DISC = Column(Float)
    DSR_CONTENTS = Column(String(255))
    DSR_REMARKS = Column(String(255))
    DSR_VALUE = Column(Float)

    DSR_INVNO = Column(String(100))
    DSR_INVDATE = Column(Date)

    MOD_DATE = Column(Date)
    OFFICE_TYPE = Column(String(100))
    OFFICE_CODE = Column(String(100))
    DSR_REFNO = Column(String(100))
    MOD_TIME = Column(Time)

    NODEID = Column(String(100))
    USERID = Column(String(100))
    TRANS_STATUS = Column(String(100))
    DSR_ACT_CUST_CODE = Column(String(100))

    DSR_MOBILE = Column(String(15))
    DSR_EMAIL = Column(String(250))
    DSR_NDX_PAPER = Column(String(100))
    DSR_PICKUP_TIME = Column(Time)

    VOLUMETRIC_WEIGHT = Column(Float)
    ACTUAL_WEIGHT = Column(Float)

    DSR_ID_NUM = Column(String(100))
    FR_DP_CODE = Column(String(100))
    BKG_PINCODE = Column(String(100))

    SOFTDATA_UPLOAD_DATE = Column(DateTime)

    BILL_TO_CUSTOMER_MOBILE_NUMBER = Column(String(15))
    BILL_TO_CUSTOMER_NAME = Column(String(150))
    BILL_TO_CUSTOMER_ADDRESS = Column(String(255))

    SENDER_MOBILE = Column(String(15))
    SENDER_NAME = Column(String(150))
    SENDER_ADDRESS = Column(String(255))
    SENDER_PIN = Column(String(15))

    RECEIVER_NAME = Column(String(150))
    RECEIVER_ADDRESS = Column(String(255))
    RECEIVER_PIN = Column(String(15))

    FOD_COD_AMT = Column(Float)

    CARRIER_NAME = Column(String(250))
    CARRIER_AWB = Column(String(250))

    FREIGHT_CHARGES = Column(Float)
    FOD_COD_CHARGES = Column(Float)
    VAS_CHARGES = Column(Float)
    RISK_SURCHAGES = Column(Float)

    IGST = Column(Float)
    CGST = Column(Float)
    SGST = Column(Float)

    TOTAL_AMOUNT = Column(Float)

    CASH_AMT = Column(Float)
    UPI_ONLINE_AMT = Column(Float)
    CREDIT_AMT = Column(Float)

    TRANSACTION_REF_NO = Column(String(100))

    PAYMENT_DATE = Column(Date)
    PI_NO = Column(String(100))
    PI_DATE = Column(Date)

    INVOICE_NO = Column(String(100))
    INVOICE_DATE = Column(Date)

    DESTINATION_BRANCH_NAME = Column(String(250))
    EDD_DATE = Column(Date)

    LAST_STATUS_DESCRIPTION = Column(String(255))
    DELIVERED_DATE = Column(Date)
    RECEIVED_BY = Column(String(250))

    RTO_RECEIPT_DATE = Column(Date)
    RTO_DELIVERY_DATE = Column(Date)

    DISPATCH_MENIFEST_NO = Column(String(100))
    DELIVERY_MENIFEST_NO = Column(String(100))

    POD_LINK = Column(String(255))
    SHPT_DOC_LINK = Column(String(255))

    FR_STATUS = Column(String(100))
    FR_CS_NAME = Column(String(150))
    FR_CS_REMARK = Column(String(255))
    FR_SALES_PERSON = Column(String(150))
    FR_OPS_PERSON = Column(String(150))
    FR_SALES_OPS_BILLING_REMARK = Column(String(255))





class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_no = Column(String(100), unique=True, nullable=False)
    invoice_date = Column(Date, default=datetime.now)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    frenchise_id = Column(Integer, ForeignKey("frenchise.id"), nullable=True)

    total_bookings = Column(Integer, nullable=False)
    subtotal = Column(Float, nullable=False, default=0.0)
    cgst = Column(Float, nullable=False, default=0.0)
    sgst = Column(Float, nullable=False, default=0.0)
    igst = Column(Float, nullable=False, default=0.0)
    grand_total = Column(Float, nullable=False, default=0.0)

    dsr_ids = Column(JSON, nullable=False)  # Store list of DSRRecord IDs

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Optional relationship
    client = relationship("Clients", backref="invoices")
    frenchise = relationship("Frenchise", backref="invoices")









class RatePlan(Base):
    """One plan per client. Upserted on save."""
    __tablename__ = "rate_plans"

    id         = Column(Integer, primary_key=True, index=True)
    client_id  = Column(Integer, nullable=False)
    name       = Column(String(120), nullable=True)          # e.g. "Sun Pharma – Standard"
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    slabs  = relationship(
        "RateSlab",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="RateSlab.min_weight",
    )


class RateSlab(Base):
    """
    Weight band → rate.

    Example rows for a plan:
      min=0,   max=1,    rate=5.0   →  0–1 kg   ₹5/kg
      min=1,   max=2,    rate=8.0   →  1–2 kg   ₹8/kg
      min=2,   max=None, rate=12.0  →  2 kg+    ₹12/kg
    """
    __tablename__ = "rate_slabs"

    id          = Column(Integer, primary_key=True, index=True)
    plan_id     = Column(Integer, ForeignKey("rate_plans.id", ondelete="CASCADE"), nullable=False)
    min_weight  = Column(Float, nullable=False)          # kg (inclusive)
    max_weight  = Column(Float, nullable=True)           # kg (exclusive); NULL = unlimited
    rate_per_kg = Column(Float, nullable=False)          # ₹ per kg within this band

    plan = relationship("RatePlan", back_populates="slabs")

    __table_args__ = (
        UniqueConstraint("plan_id", "min_weight", name="uq_plan_min_weight"),
    )

