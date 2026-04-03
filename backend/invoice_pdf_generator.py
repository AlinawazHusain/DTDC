"""
invoice_generator.py
--------------------
Generates a professional GST-compliant invoice PDF from
Franchise, Client, and Booking data.

Usage:
    from invoice_generator import generate_invoice

    generate_invoice(
        franchise=franchise_obj,   # Frenchise SQLAlchemy instance (or dict)
        client=client_obj,         # Clients SQLAlchemy instance (or dict)
        bookings=booking_list,     # List of booking dicts / objects
        output_path="invoice.pdf"
    )
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Union
import os
from io import BytesIO



from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER


# ── Colour palette ────────────────────────────────────────────────────────────
PRIMARY   = colors.HexColor("#1A3C6E")   # deep navy
ACCENT    = colors.HexColor("#2D7DD2")   # sky blue
LIGHT_BG  = colors.HexColor("#F0F4FA")   # very light blue-grey
BORDER    = colors.HexColor("#C8D6E8")
TEXT_DARK = colors.HexColor("#1C1C2E")
TEXT_MID  = colors.HexColor("#5A6478")
WHITE     = colors.white
GREEN     = colors.HexColor("#1B8A5A")


# ── Helper: access obj or dict uniformly ─────────────────────────────────────
def _get(obj, key, default=""):
    if isinstance(obj, dict):
        return obj.get(key, default) or default
    return getattr(obj, key, default) or default


def _fmt_currency(value) -> str:
    return f"{float(value):,.2f}"


def _safe_float(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


# ── Main generator ────────────────────────────────────────────────────────────
def generate_invoice(
    franchise,
    client,
    bookings: List,
    invoice_number: Optional[str] = None,
    invoice_date: Optional[str] = None
) -> str:
    """
    Generate a professional invoice PDF.

    Parameters
    ----------
    franchise       : Frenchise model instance or equivalent dict
    client          : Clients model instance or equivalent dict
    bookings        : list of booking dicts with keys:
                        - description        (str)  booking/shipment description
                        - chargeable_weight  (float) in kg
                        - rate               (float) rate per kg
                        - total_amount       (float)
                        - igst               (float) amount in ₹
                        - cgst               (float) amount in ₹
                        - sgst               (float) amount in ₹
    invoice_number  : auto-generated if not provided
    invoice_date    : today if not provided
    output_path     : destination file path

    Returns
    -------
    str : path to generated PDF
    """
    if not invoice_number:
        ts = datetime.now().strftime("%Y%m%d%H%M%S")
        fc = (_get(franchise, "frenchise_code") or "INV").upper()
        invoice_number = f"{fc}-{ts}"

    if not invoice_date:
        invoice_date = datetime.now().strftime("%d %b %Y")
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15*mm,
        rightMargin=15*mm,
        topMargin=12*mm,
        bottomMargin=15*mm,
    )

    styles = _build_styles()
    story  = []

    # ── 1. Header band ────────────────────────────────────────────────────────
    story += _header_section(franchise, invoice_number, invoice_date, styles)

    # ── 2. Bill-from / Bill-to ────────────────────────────────────────────────
    story += _parties_section(franchise, client, styles)

    story.append(Spacer(1, 6*mm))

    # ── 3. Booking line-items table ───────────────────────────────────────────
    story += _bookings_table(bookings, styles)

    story.append(Spacer(1, 4*mm))

    # ── 4. Tax summary + grand total ──────────────────────────────────────────
    ts = _tax_summary(bookings, styles)
    story += ts.get("tbl")
    gt = ts.get("st")

    story.append(Spacer(1, 8*mm))

    # ── 5. Footer ─────────────────────────────────────────────────────────────
    story += _footer_section(franchise, styles)

    doc.build(story)
    buffer.seek(0)
    return {"buffer" : buffer , "gt" : gt}



# ── Style builder ─────────────────────────────────────────────────────────────
def _build_styles():
    base = getSampleStyleSheet()
    custom = {}

    def add(name, **kwargs):
        custom[name] = ParagraphStyle(name=name, **kwargs)

    add("InvoiceTitle",
        fontSize=22, leading=26, textColor=WHITE,
        fontName="Helvetica-Bold", alignment=TA_LEFT)

    add("InvoiceSubtitle",
        fontSize=9, leading=13, textColor=colors.HexColor("#B0C8E8"),
        fontName="Helvetica", alignment=TA_LEFT)

    add("InvoiceLabel",
        fontSize=7.5, leading=11, textColor=TEXT_MID,
        fontName="Helvetica-Bold", alignment=TA_RIGHT, spaceAfter=1)

    add("InvoiceValue",
        fontSize=8.5, leading=12, textColor=TEXT_DARK,
        fontName="Helvetica", alignment=TA_RIGHT)

    add("SectionHead",
        fontSize=8, leading=10, textColor=WHITE,
        fontName="Helvetica-Bold", alignment=TA_LEFT)

    add("PartyLabel",
        fontSize=7.5, leading=10, textColor=TEXT_MID,
        fontName="Helvetica-Bold", spaceAfter=1)

    add("PartyValue",
        fontSize=8.5, leading=12, textColor=TEXT_DARK,
        fontName="Helvetica")

    add("PartyName",
        fontSize=11, leading=14, textColor=PRIMARY,
        fontName="Helvetica-Bold", spaceAfter=3)

    add("ColHead",
        fontSize=8, leading=10, textColor=WHITE,
        fontName="Helvetica-Bold", alignment=TA_CENTER)

    add("CellNormal",
        fontSize=8, leading=11, textColor=TEXT_DARK,
        fontName="Helvetica", alignment=TA_LEFT)

    add("CellRight",
        fontSize=8, leading=11, textColor=TEXT_DARK,
        fontName="Helvetica", alignment=TA_RIGHT)

    add("CellCenter",
        fontSize=8, leading=11, textColor=TEXT_DARK,
        fontName="Helvetica", alignment=TA_CENTER)

    add("TotalLabel",
        fontSize=9, leading=12, textColor=TEXT_DARK,
        fontName="Helvetica-Bold", alignment=TA_RIGHT)

    add("TotalValue",
        fontSize=9, leading=12, textColor=TEXT_DARK,
        fontName="Helvetica", alignment=TA_RIGHT)

    add("GrandLabel",
        fontSize=11, leading=14, textColor=WHITE,
        fontName="Helvetica-Bold", alignment=TA_RIGHT)

    add("GrandValue",
        fontSize=11, leading=14, textColor=WHITE,
        fontName="Helvetica-Bold", alignment=TA_RIGHT)

    add("FooterText",
        fontSize=7.5, leading=11, textColor=TEXT_MID,
        fontName="Helvetica", alignment=TA_CENTER)

    add("FooterBold",
        fontSize=8, leading=11, textColor=PRIMARY,
        fontName="Helvetica-Bold", alignment=TA_CENTER)

    return custom


# ── Section builders ──────────────────────────────────────────────────────────

def _header_section(franchise, inv_no, inv_date, styles):
    """Top navy band with company name + invoice meta."""
    company_name = _get(franchise, "frenchise_name") or "Company Name"
    moto         = _get(franchise, "moto") or ""
    website      = _get(franchise, "website_url") or ""
    gst          = _get(franchise, "gst_number") or ""

    # Left cell: company identity
    left_content = [
        Paragraph(company_name, styles["InvoiceTitle"]),
        Paragraph(moto, styles["InvoiceSubtitle"]),
    ]
    if website:
        left_content.append(Paragraph(website, styles["InvoiceSubtitle"]))
    if gst:
        left_content.append(
            Paragraph(f"GSTIN: {gst}", styles["InvoiceSubtitle"])
        )

    # Right cell: invoice meta
    right_content = [
        Paragraph("TAX INVOICE", ParagraphStyle(
            "BigInv", fontSize=16, fontName="Helvetica-Bold",
            textColor=colors.HexColor("#B0C8E8"), alignment=TA_RIGHT)),
        Spacer(1, 4*mm),
        Paragraph("Invoice No.", styles["InvoiceLabel"]),
        Paragraph(inv_no, styles["InvoiceValue"]),
        Spacer(1, 2*mm),
        Paragraph("Invoice Date", styles["InvoiceLabel"]),
        Paragraph(inv_date, styles["InvoiceValue"]),
    ]

    header_table = Table(
        [[left_content, right_content]],
        colWidths=["60%", "40%"],
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, -1), PRIMARY),
        ("VALIGN",      (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",  (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING",(0,0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (0,  -1), 12),
        ("RIGHTPADDING",(1, 0), (1,  -1), 12),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
    ]))

    return [header_table, Spacer(1, 5*mm)]


def _parties_section(franchise, client, styles):
    """Two-column card: Billed By (franchise) | Billed To (client)."""
    page_w = A4[0] - 30*mm   # usable width

    def _lv(label, value):
        """Label + value pair."""
        if not value:
            return []
        return [
            Paragraph(label, styles["PartyLabel"]),
            Paragraph(str(value), styles["PartyValue"]),
            Spacer(1, 1.5*mm),
        ]

    # ── Franchise (Billed By) ─────────────────────────────────────────────
    from_items = [
        Paragraph("BILLED BY", ParagraphStyle(
            "BillByHead", fontSize=7, fontName="Helvetica-Bold",
            textColor=ACCENT, spaceAfter=3)),
        Paragraph(_get(franchise, "frenchise_name"), styles["PartyName"]),
    ]
    for lbl, key in [
        ("Owner",   "owner_name"),
        ("Address", "business_address"),
        ("City",    "city"),
        ("Phone",   "phone_number"),
        ("Email",   "email"),
        ("GSTIN",   "gst_number"),
        ("TAN",     "tan_number"),
        ("Frenchise Code",    "frenchise_code"),
    ]:
        from_items += _lv(lbl, _get(franchise, key))

    # ── Client (Billed To) ────────────────────────────────────────────────
    to_items = [
        Paragraph("BILLED TO", ParagraphStyle(
            "BillToHead", fontSize=7, fontName="Helvetica-Bold",
            textColor=ACCENT, spaceAfter=3)),
        Paragraph(_get(client, "name"), styles["PartyName"]),
    ]
    for lbl, key in [
        ("Address",      "address"),
        ("City",         "city"),
        ("Pincode",      "pincode"),
        ("Phone",        "phone_number"),
        ("Email",        "email"),
        ("GSTIN",        "gst_number"),
        ("PAN",          "pan_number"),
        ("TAN",          "tan_number"),
        ("CIN",          "cin_number"),
        ("Payment Term", "payment_term"),
        ("DSR Code",     "dsr_act_cust_code"),
    ]:
        to_items += _lv(lbl, _get(client, key))

    parties = Table(
        [[from_items, to_items]],
        colWidths=[page_w * 0.48, page_w * 0.48],
        hAlign="LEFT",
    )
    parties.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, -1), LIGHT_BG),
        ("BACKGROUND",   (1, 0), (1, -1), colors.HexColor("#FFF8F0")),
        ("VALIGN",       (0, 0), (-1,-1), "TOP"),
        ("TOPPADDING",   (0, 0), (-1,-1), 8),
        ("BOTTOMPADDING",(0, 0), (-1,-1), 8),
        ("LEFTPADDING",  (0, 0), (-1,-1), 10),
        ("RIGHTPADDING", (0, 0), (-1,-1), 10),
        ("BOX",          (0, 0), (0, -1), 0.5, BORDER),
        ("BOX",          (1, 0), (1, -1), 0.5, BORDER),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))

    return [parties]


def _bookings_table(bookings, styles):
    """Line-items table for all bookings."""
    # Header row
    headers = ["#", "Description", "DSR CN No.", "Booking\nDate",
               "Ch. Wt\n(kg)",  "Amount", "IGST", "CGST", "SGST"]
    col_widths = [7*mm, 42*mm, 25*mm, 20*mm, 16*mm, 16*mm, 20*mm, 17*mm, 17*mm, 17*mm]

    header_row = [Paragraph(h, styles["ColHead"]) for h in headers]
    rows = [header_row]

    for i, bk in enumerate(bookings, start=1):
        desc     = _get(bk, "description") or f"Shipment {i}"
        cn_no    = _get(bk, "dsr_cnno") or "-"
        bk_date  = _get(bk, "dsr_booking_date") or "-"
        cw       = _safe_float(_get(bk, "chargeable_weight"))
        total    = _safe_float(_get(bk, "total_amount"))
        igst     = _safe_float(_get(bk, "igst"))
        cgst     = _safe_float(_get(bk, "cgst"))
        sgst     = _safe_float(_get(bk, "sgst"))

        rows.append([
            Paragraph(str(i),               styles["CellCenter"]),
            Paragraph(desc,                 styles["CellNormal"]),
            Paragraph(cn_no,                styles["CellCenter"]),
            Paragraph(bk_date,              styles["CellCenter"]),
            Paragraph(f"{cw:.3f}",          styles["CellCenter"]),
            Paragraph(_fmt_currency(total), styles["CellRight"]),
            Paragraph(_fmt_currency(igst),  styles["CellRight"]),
            Paragraph(_fmt_currency(cgst),  styles["CellRight"]),
            Paragraph(_fmt_currency(sgst),  styles["CellRight"]),
        ])

    tbl = Table(rows, colWidths=col_widths, repeatRows=1)

    # Base style
    ts = TableStyle([
        # Header
        ("BACKGROUND",    (0, 0), (-1, 0),  PRIMARY),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("TOPPADDING",    (0, 0), (-1, 0),  6),
        ("BOTTOMPADDING", (0, 0), (-1, 0),  6),
        # Body
        ("TOPPADDING",    (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        # Grid
        ("LINEBELOW",     (0, 0), (-1, -1), 0.4, BORDER),
        ("LINEAFTER",     (0, 0), (-1, -1), 0.4, BORDER),
        ("BOX",           (0, 0), (-1, -1), 0.8, BORDER),
    ])

    # Zebra stripe
    for i in range(1, len(rows)):
        if i % 2 == 0:
            ts.add("BACKGROUND", (0, i), (-1, i), LIGHT_BG)

    tbl.setStyle(ts)
    return [tbl]


def _tax_summary(bookings, styles):
    """Right-aligned totals block with sub-totals and grand total."""
    subtotal = sum(_safe_float(_get(b, "total_amount")) for b in bookings)
    total_igst = sum(_safe_float(_get(b, "igst")) for b in bookings)
    total_cgst = sum(_safe_float(_get(b, "cgst")) for b in bookings)
    total_sgst = sum(_safe_float(_get(b, "sgst")) for b in bookings)
    grand = subtotal + total_igst + total_cgst + total_sgst

    rows = [
        ["Subtotal (before tax)", _fmt_currency(subtotal)],
        ["IGST",                  _fmt_currency(total_igst)],
        ["CGST",                  _fmt_currency(total_cgst)],
        ["SGST",                  _fmt_currency(total_sgst)],
    ]

    body_rows = [
        [Paragraph(r[0], styles["TotalLabel"]),
         Paragraph(r[1], styles["TotalValue"])]
        for r in rows
    ]

    grand_row = [
        Paragraph("GRAND TOTAL", styles["GrandLabel"]),
        Paragraph(_fmt_currency(grand), styles["GrandValue"]),
    ]

    all_rows = body_rows + [grand_row]

    page_w = A4[0] - 30*mm
    tbl = Table(all_rows, colWidths=[page_w * 0.7, page_w * 0.3], hAlign="RIGHT")
    tbl.setStyle(TableStyle([
        # All body rows
        ("BACKGROUND",    (0, 0), (-1, len(body_rows)-1), LIGHT_BG),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("LINEBELOW",     (0, 0), (-1, len(body_rows)-1), 0.4, BORDER),
        ("BOX",           (0, 0), (-1, len(body_rows)-1), 0.6, BORDER),
        # Grand total
        ("BACKGROUND",    (0, len(body_rows)), (-1, -1), GREEN),
        ("TEXTCOLOR",     (0, len(body_rows)), (-1, -1), WHITE),
        ("BOX",           (0, len(body_rows)), (-1, -1), 0.8, GREEN),
        ("TOPPADDING",    (0, len(body_rows)), (-1, -1), 7),
        ("BOTTOMPADDING", (0, len(body_rows)), (-1, -1), 7),
    ]))

    return {"tbl" : [tbl] , "st" : grand}


def _footer_section(franchise, styles):
    """Bank / signature / terms footer."""
    phone   = _get(franchise, "phone_number")
    email   = _get(franchise, "email")
    website = _get(franchise, "website_url")
    name    = _get(franchise, "frenchise_name")

    contact_parts = [p for p in [phone, email, website] if p]
    contact_str   = "   |   ".join(contact_parts)

    return [
        HRFlowable(width="100%", thickness=0.5, color=BORDER),
        Spacer(1, 3*mm),
        Paragraph(
            "This is a computer-generated invoice and does not require a physical signature.",
            styles["FooterText"]
        ),
        Spacer(1, 1.5*mm),
        Paragraph(
            "For queries, please contact:  " + contact_str,
            styles["FooterText"]
        ),
        Spacer(1, 1.5*mm),
        Paragraph(
            f"© {datetime.now().year} {name}. All rights reserved.",
            styles["FooterBold"]
        ),
    ]


# ── Demo / quick-test ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Simulate model instances as dicts
    franchise = {
        "frenchise_name":    "SwiftMove Logistics Pvt. Ltd.",
        "owner_name":        "Rajesh Kumar",
        "phone_number":      "+91-98765-43210",
        "email":             "billing@swiftmove.in",
        "gst_number":        "07AAECS1234F1ZX",
        "tan_number":        None,               # omitted — should not appear
        "frenchise_code":    "SML-DEL",
        "city":              "New Delhi",
        "business_address":  "Plot 45, Sector 18, Gurugram, Haryana - 122015",
        "website_url":       "www.swiftmove.in",
        "moto":              "Speed • Safety • Reliability",
    }

    client = {
        "name":            "Acme Technologies Ltd.",
        "cin_number":      None,                 # omitted — should not appear
        "phone_number":    "+91-11-40123456",
        "email":           "accounts@acmetech.in",
        "pincode":         "110001",
        "gst_number":      "07AACCA1234B1ZC",
        "pan_number":      "AACCA1234B",
        "tan_number":      None,                 # omitted — should not appear
        "payment_term":    "Net 30 Days",
        "city":            "New Delhi",
        "address":         "12th Floor, Connaught Place, New Delhi - 110001",
        "dsr_act_cust_code": "ACME-ND-001",
    }

    bookings = [
        {
            "description":       "Air Freight – Mumbai to Delhi (Fragile)",
            "dsr_cnno":          "DSR-MUM-2024-00123",
            "dsr_booking_date":  "15 Mar 2025",
            "chargeable_weight": 125.500,
            "rate":              18.00,
            "total_amount":      2259.00,
            "igst":              406.62,
            "cgst":              0.00,
            "sgst":              0.00,
        },
        {
            "description":       "Surface Freight – Bangalore to Chennai",
            "dsr_cnno":          "DSR-BLR-2024-00456",
            "dsr_booking_date":  "18 Mar 2025",
            "chargeable_weight": 340.000,
            "rate":              8.50,
            "total_amount":      2890.00,
            "igst":              0.00,
            "cgst":              260.10,
            "sgst":              260.10,
        },
        {
            "description":       "Express Courier – Pune to Hyderabad",
            "dsr_cnno":          None,           # missing CN — shows "-"
            "dsr_booking_date":  "20 Mar 2025",
            "chargeable_weight": 15.750,
            "rate":              45.00,
            "total_amount":      708.75,
            "igst":              127.58,
            "cgst":              0.00,
            "sgst":              0.00,
        },
    ]

    generate_invoice(
        franchise=franchise,
        client=client,
        bookings=bookings,
        output_path="/mnt/user-data/outputs/invoice_sample.pdf",
    )
