from fpdf import FPDF
from io import BytesIO
from datetime import datetime

def generate_quote_pdf(
    client_name: str,
    client_address: str,
    line_items: list[dict],
    total: float,
    tax_rate: float,
    notes: str = "",
    business_name: str = "ArborSuite",
    business_phone: str = "",
) -> bytes:
    """Generate a professional quote PDF. Returns PDF bytes."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Header
    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 10, business_name, ln=True)
    pdf.set_font("Helvetica", "", 10)
    if business_phone:
        pdf.cell(0, 5, business_phone, ln=True)
    pdf.ln(5)

    # Quote info
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "QUOTE", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 5, f"Date: {datetime.now().strftime('%B %d, %Y')}", ln=True)
    pdf.cell(0, 5, f"Client: {client_name}", ln=True)
    if client_address:
        pdf.cell(0, 5, f"Address: {client_address}", ln=True)
    pdf.ln(10)

    # Line items table
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(34, 139, 34)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(140, 8, "Description", border=1, fill=True)
    pdf.cell(50, 8, "Amount", border=1, fill=True, align="R")
    pdf.ln()

    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 10)
    subtotal = 0
    for item in line_items:
        desc = item.get("description", "")
        amount = item.get("amount", 0)
        subtotal += amount
        pdf.cell(140, 7, desc, border=1)
        pdf.cell(50, 7, f"${amount:,.2f}", border=1, align="R")
        pdf.ln()

    # Totals
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(140, 7, "Subtotal", align="R")
    pdf.cell(50, 7, f"${subtotal:,.2f}", align="R")
    pdf.ln()

    if tax_rate > 0:
        tax = subtotal * tax_rate
        pdf.cell(140, 7, f"Tax ({tax_rate*100:.1f}%)", align="R")
        pdf.cell(50, 7, f"${tax:,.2f}", align="R")
        pdf.ln()

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(140, 8, "Total", align="R")
    pdf.cell(50, 8, f"${total:,.2f}", align="R")
    pdf.ln(15)

    # Notes
    if notes:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 7, "Notes:", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, notes)

    return pdf.output()


def generate_invoice_pdf(
    client_name: str,
    client_address: str,
    line_items: list[dict],
    total: float,
    tax_rate: float,
    invoice_id: int,
    status: str = "unpaid",
    business_name: str = "ArborSuite",
    business_phone: str = "",
) -> bytes:
    """Generate a professional invoice PDF. Returns PDF bytes."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Header
    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 10, business_name, ln=True)
    pdf.set_font("Helvetica", "", 10)
    if business_phone:
        pdf.cell(0, 5, business_phone, ln=True)
    pdf.ln(5)

    # Invoice info
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, f"INVOICE #{invoice_id}", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 5, f"Date: {datetime.now().strftime('%B %d, %Y')}", ln=True)
    pdf.cell(0, 5, f"Status: {status.upper()}", ln=True)
    pdf.cell(0, 5, f"Client: {client_name}", ln=True)
    if client_address:
        pdf.cell(0, 5, f"Address: {client_address}", ln=True)
    pdf.ln(10)

    # Line items
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(34, 139, 34)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(140, 8, "Description", border=1, fill=True)
    pdf.cell(50, 8, "Amount", border=1, fill=True, align="R")
    pdf.ln()

    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 10)
    subtotal = 0
    for item in line_items:
        desc = item.get("description", "")
        amount = item.get("amount", 0)
        subtotal += amount
        pdf.cell(140, 7, desc, border=1)
        pdf.cell(50, 7, f"${amount:,.2f}", border=1, align="R")
        pdf.ln()

    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(140, 8, "Total Due", align="R")
    pdf.cell(50, 8, f"${total:,.2f}", align="R")

    return pdf.output()
