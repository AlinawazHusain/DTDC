from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
)
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm


def generate_professional_invoice_pdf(
    invoice_items,
    seller,
    buyer,
    meta,
    filename="invoice.pdf",
):
    """
    invoice_items: list of dicts
        [{"description": "Item1", "qty": 2, "rate": 100, "cgst": 9, "sgst": 9, "igst": 18}, ...]
    seller/buyer: dicts with 'name', 'address', 'gstin'
    meta: dict with 'invoice_no', 'date', 'from_state', 'to_state'
    """

    styles = getSampleStyleSheet()
    normal_style = styles["Normal"]
    bold_style = ParagraphStyle('Bold', parent=normal_style, fontName='Helvetica-Bold')
    doc = SimpleDocTemplate(filename, pagesize=A4, rightMargin=20, leftMargin=20, topMargin=30, bottomMargin=30)
    elements = []

    # ===== Header =====
    elements.append(Paragraph("<b>TAX INVOICE</b>", styles["Title"]))
    elements.append(Spacer(1, 12))

    # Seller & Buyer
    header_data = [
        [
            Paragraph(f"<b>{seller['name']}</b><br/>{seller['address']}<br/>GSTIN: {seller['gstin']}", normal_style),
            Paragraph(f"<b>Bill To:</b><br/>{buyer['name']}<br/>{buyer['address']}<br/>GSTIN: {buyer.get('gstin','-')}", normal_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[270, 270])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 12))

    # Invoice Meta
    meta_table_data = [
        ["Invoice No", meta["invoice_no"], "Date", meta["date"]],
        ["From State", meta["from_state"], "To State", meta["to_state"]],
    ]
    meta_table = Table(meta_table_data, colWidths=[100, 170, 100, 170])
    meta_table.setStyle(TableStyle([
        ("GRID", (0,0), (-1,-1), 1, colors.black),
        ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 16))

    # ===== Item Table =====
    item_table_data = [
        ["S.No", "Description", "Qty", "Rate", "CGST", "SGST", "IGST", "Amount"]
    ]

    total_base = total_cgst = total_sgst = total_igst = 0

    for idx, item in enumerate(invoice_items, start=1):
        amount = item["qty"] * item["rate"]
        cgst_amt = amount * item.get("cgst", 0)/100
        sgst_amt = amount * item.get("sgst", 0)/100
        igst_amt = amount * item.get("igst", 0)/100
        total_base += amount
        total_cgst += cgst_amt
        total_sgst += sgst_amt
        total_igst += igst_amt

        item_table_data.append([
            idx,
            item["description"],
            item["qty"],
            f"{item['rate']:.2f}",
            f"{cgst_amt:.2f}",
            f"{sgst_amt:.2f}",
            f"{igst_amt:.2f}",
            f"{amount:.2f}"
        ])

    # Add totals row
    total_amount = total_base + total_cgst + total_sgst + total_igst
    item_table_data.append([
        "", "TOTAL", "", "", f"{total_cgst:.2f}", f"{total_sgst:.2f}", f"{total_igst:.2f}", f"{total_amount:.2f}"
    ])

    item_table = Table(item_table_data, colWidths=[30, 180, 50, 60, 60, 60, 60, 60])
    item_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.black),
        ('BACKGROUND', (0,0), (-1,0), colors.grey),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (2,1), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,-1), (-1,-1), colors.lightgrey),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
    ]))
    elements.append(item_table)
    elements.append(Spacer(1, 20))

    # ===== Footer =====
    elements.append(Paragraph("Amount in words: " + number_to_words(total_amount), normal_style))
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Authorized Signatory", normal_style))

    # ===== Build PDF =====
    doc.build(elements)
    print(f"Professional invoice PDF generated: {filename}")


# ===== Helper to convert number to words =====
# Simple version
def number_to_words(amount):
    try:
        from num2words import num2words
        return num2words(amount, to='currency', lang='en_IN')
    except ImportError:
        return f"₹ {amount:.2f}"
    

if __name__ == "__main__":
    invoice_items = [
        {"description": "Freight Charges", "qty": 120, "rate": 8, "cgst": 9, "sgst": 9, "igst": 0},
        {"description": "Handling Charges", "qty": 1, "rate": 100, "cgst": 9, "sgst": 9, "igst": 0},
    ]

    seller = {
        "name": "ABC Logistics Pvt Ltd",
        "address": "Delhi, India",
        "gstin": "07ABCDE1234F1Z5",
    }

    buyer = {
        "name": "XYZ Traders",
        "address": "Lucknow, UP",
        "gstin": "09ABCDE5678G1Z2",
    }

    meta = {
        "invoice_no": "INV-002",
        "date": "30-03-2026",
        "from_state": "DL",
        "to_state": "UP",
    }

    generate_professional_invoice_pdf(invoice_items, seller, buyer, meta, "professional_invoice.pdf")