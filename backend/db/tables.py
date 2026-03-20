from sqlalchemy import (
    Column, String, Integer, Float, Date, DateTime , Time , Enum, ForeignKey , Boolean , Sequence , text
)
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

    # Basic Info
    DSR_BRANCH_CODE = Column(String(100))
    DSR_CNNO = Column(String(100))
    DSR_BOOKED_BY = Column(String(100))
    DSR_CUST_CODE = Column(String(100))

    # Weights
    CHARGEABLE_WEIGHT = Column(Float)
    VOLUMETRIC_WEIGHT = Column(Float)
    ACTUAL_WEIGHT = Column(Float)

    # Shipment Details
    DSR_CN_TYPE = Column(String(100))
    DSR_DEST = Column(String(100))
    DSR_MODE = Column(String(100))
    DSR_NO_OF_PIECES = Column(Integer)
    DSR_DEST_PIN = Column(String(100))

    # Dates & Times
    DSR_BOOKING_DATE = Column(Date)
    DSR_BOOKING_TIME = Column(Time)
    MOD_DATE = Column(Date)
    MOD_TIME = Column(Time)
    SOFTDATA_UPLOAD_DATE = Column(DateTime)

    # Financials
    DSR_AMT = Column(Float)
    DSR_SERVICE_TAX = Column(Float)
    DSR_SPL_DISC = Column(Float)
    DSR_VALUE = Column(Float)

    FREIGHT_CHARGES = Column(Float)
    FOD_COD_CHARGES = Column(Float)
    VAS_CHARGES = Column(Float)
    RISK_SURCHAGES = Column(Float)
    GST = Column(Float)
    TOTAL_AMOUNT = Column(Float)

    CASH_AMT = Column(Float)
    UPI_ONLINE_AMT = Column(Float)
    CREDIT_AMT = Column(Float)

    # Status & Flags
    DSR_STATUS = Column(String(100))
    DSR_POD_RECD = Column(String(100))
    TRANS_STATUS = Column(String(100))
    FR_STATUS = Column(String(100))

    # References
    DSR_TRANSMF_NO = Column(String(100))
    DSR_REFNO = Column(String(100))
    TRANSACTION_REF_NO = Column(String(100))
    PI_NO = Column(String(100))
    INVOICE_NO = Column(String(100))

    # Dates (More)
    PAYMENT_DATE = Column(Date)
    PI_DATE = Column(Date)
    INVOICE_DATE = Column(Date)
    EDD_DATE = Column(Date)
    DELIVERED_DATE = Column(Date)
    RTO_RECEIPT_DATE = Column(Date)
    RTO_DELIVERY_DATE = Column(Date)

    # Parties
    SENDER_NAME = Column(String(150))
    SENDER_ADDRESS = Column(String(255))
    SENDER_MOBILE = Column(String(15))
    SENDER_PIN = Column(String(15))

    RECEIVER_NAME = Column(String(150))
    RECEIVER_ADDRESS = Column(String(255))
    RECEIVER_PIN = Column(String(15))

    # Contact
    DSR_MOBILE = Column(String(15))
    DSR_EMAIL = Column(String(250))

    # Misc
    DSR_CONTENTS = Column(String(255))
    DSR_REMARKS = Column(String(255))
    LAST_STATUS_DESCRIPTION = Column(String(255))
    RECEIVED_BY = Column(String(250))

    # Logistics
    CARRIER_NAME = Column(String(250))
    CARRIER_AWB = Column(String(250))
    DESTINATION_BRANCH_NAME = Column(String(250))

    DISPATCH_MENIFEST_NO = Column(String(100))
    DELIVERY_MENIFEST_NO = Column(String(100))

    # Links
    POD_LINK = Column(String(255))
    SHPT_DOC_LINK = Column(String(255))

    # Extra Fields
    OFFICE_TYPE = Column(String(100))
    OFFICE_CODE = Column(String(100))
    NODEID = Column(String(100))
    USERID = Column(String(100))

    DSR_ACT_CUST_CODE = Column(String(100))
    DSR_NDX_PAPER = Column(String(100))
    DSR_PICKUP_TIME = Column(Time)
    DSR_ID_NUM = Column(String(100))
    FR_DP_CODE = Column(String(100))
    BKG_PINCODE = Column(String(100))
    BILL_TO = Column(String(100))

    FOD_COD_AMT = Column(Float)

    FR_CS_REMARK = Column(String(255))
    FR_SALES_OPS_BILLING_REMARK = Column(String(255))





class PaymentStatus(enum.Enum):
    pending = "pending"
    paid = "paid"
    cancled = "cancled"


class Invoice(Base):
    __tablename__ = "invoices"

    invoice_seq = Sequence('invoice_seq', start=1, increment=1, metadata=Base.metadata)

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_number = Column(String, unique=True, nullable=False, index=True, server_default=text("'INV-' || nextval('invoice_seq'::regclass)"))

    frenchise_id = Column(Integer, ForeignKey("frenchise.id"), nullable=False)
    client_id= Column(Integer)
    invoice_date = Column(DateTime)
    
    total_amount = Column(Float)
    gst_amount = Column(Float)
    other_charges = Column(Float)
    
    dsr_ids = Column(String(255))

    status = Column(Enum(PaymentStatus), nullable=False , default = "pending") 
