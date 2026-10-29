from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfgen import canvas

# --- Функция для добавления футера на каждую страницу ---
def add_page_decorations(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.grey)
    canvas.drawString(inch, 0.5 * inch, "Altexera Security Review — Independent Researcher Moritz Schneider")
    canvas.drawRightString(A4[0] - inch, 0.5 * inch, f"Page {doc.page}")
    canvas.restoreState()

# --- Настройка стилей ---
styles = getSampleStyleSheet()
title_style = ParagraphStyle(name='Title', parent=styles['Heading1'], fontSize=24, spaceAfter=20, alignment=TA_CENTER, textColor=colors.HexColor("#0F172A"))
subtitle_style = ParagraphStyle(name='Subtitle', parent=styles['Heading2'], fontSize=14, spaceAfter=10, alignment=TA_CENTER, textColor=colors.HexColor("#3B82F6"))
heading_style = ParagraphStyle(name='Heading', parent=styles['Heading2'], fontSize=16, spaceBefore=15, spaceAfter=10, textColor=colors.HexColor("#0F172A"))
body_style = ParagraphStyle(name='Body', parent=styles['Normal'], fontSize=11, spaceAfter=10, leading=16)
bold_style = ParagraphStyle(name='Bold', parent=body_style, fontName='Helvetica-Bold')
link_style = ParagraphStyle(name='Link', parent=body_style, textColor=colors.blue, underline=True)

# --- Документ ---
doc = SimpleDocTemplate("Altexera_Security_Audit.pdf", pagesize=A4, rightMargin=inch, leftMargin=inch, topMargin=inch, bottomMargin=inch)
story = []

# --- Титульная страница ---
try:
    logo = Image("logo.png", width=2*inch, height=2*inch)
    logo.hAlign = 'CENTER'
    story.append(logo)
    story.append(Spacer(1, 0.5 * inch))
except:
    story.append(Spacer(1, 1 * inch))

story.append(Paragraph("Security Review — Altexera Smart Contract", title_style))
story.append(Paragraph("Independent Technical Audit Report", subtitle_style))
story.append(Spacer(1, 0.5 * inch))

# Блок с метаданными
meta_data = [
    ["Auditor:", "Moritz Schneider (Independent Web3 Security Researcher)"],
    ["Location:", "Munich, Germany"],
    ["Contact:", "moritz.schneider.sec@proton.me"],
    ["Target:", "Pre-deployment Smart Contract Code (BSC)"],
    ["Compiler:", "Solidity 0.8.24"],
    ["Status:", "PASSED (No Critical/High Vulnerabilities)"]
]
meta_table = Table(meta_data, colWidths=[1.5*inch, 4.5*inch])
meta_table.setStyle(TableStyle([
    ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
    ('FONTNAME', (1,0), (1,-1), 'Helvetica'),
    ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor("#334155")),
    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
]))
story.append(meta_table)
story.append(PageBreak())

# --- Раздел 1: Executive Summary ---
story.append(Paragraph("1. Executive Summary", heading_style))
story.append(Paragraph("This document provides an independent security review of the Altexera smart contract. The objective of this review was to analyze the smart contract's architecture, mathematical logic, and access control, specifically focusing on concerns regarding developer backdoors (Rug Pull) and external attack vectors.", body_style))
story.append(Paragraph("<b>Result:</b> Within the scope of this review, <b>no Critical or High severity vulnerabilities</b> were found. The contract does not contain administrative functions to withdraw user funds, and the core mathematical invariants hold.", body_style))
story.append(Spacer(1, 0.2 * inch))

# --- Раздел 2: Scope & Limitations ---
story.append(Paragraph("2. Scope & Methodology", heading_style))
story.append(Paragraph("The audit was conducted using the following methodology:", body_style))
story.append(Paragraph("• <b>Manual Code Review:</b> Analysis of access control, business logic, and external integrations.", body_style))
story.append(Paragraph("• <b>Static Analysis:</b> Running Slither (by Trail of Bits) to detect common smart contract vulnerabilities.", body_style))
story.append(Paragraph("• <b>Unit Testing (Hardhat):</b> Simulating attack scenarios and verifying mathematical invariants.", body_style))
story.append(Spacer(1, 0.2 * inch))

story.append(Paragraph("<b>What was NOT reviewed (Limitations):</b>", body_style))
story.append(Paragraph("• <b>Economic Model:</b> This review does not validate the sustainability or economic viability of the yield/referral model.", body_style))
story.append(Paragraph("• <b>Third-Party Risk:</b> The security of external protocols (Aave V3, Chainlink, PancakeSwap) was not audited.", body_style))
story.append(PageBreak())

# --- Раздел 3: Findings Table ---
story.append(Paragraph("3. Findings & Tested Vectors", heading_style))
story.append(Paragraph("The following vectors were tested within the provided source code:", body_style))
story.append(Spacer(1, 0.1 * inch))

table_data = [
    ["ID", "Vector Checked", "Severity", "Status"],
    ["C-01", "Admin Drain (Rug Pull)", "Critical", "Passed"],
    ["H-01", "Access Control (Theft)", "High", "Passed"],
    ["H-02", "Fake Profit Injection", "High", "Passed"],
    ["M-01", "Early Withdrawal", "Medium", "Passed"],
    ["M-02", "Reentrancy", "Medium", "Passed"],
    ["L-01", "Integer Overflow", "Low", "Passed"],
    ["I-01", "Oracle Manipulation", "Info", "Passed"],
]

table = Table(table_data, colWidths=[0.8*inch, 2.5*inch, 1.2*inch, 1.2*inch])
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 12),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 1), (-1, -1), 10),
    ('TEXTCOLOR', (2, 1), (2, -1), colors.HexColor("#DC2626")),
    ('TEXTCOLOR', (3, 1), (3, -1), colors.HexColor("#16A34A")),
]))
story.append(table)
story.append(PageBreak())

# --- Раздел 4: Proof & Verification ---
story.append(Paragraph("4. Test Execution Proof", heading_style))
story.append(Paragraph("The contract was tested using a Hardhat suite. All 10 security tests passed successfully.", body_style))

try:
    img = Image("test1.jpg", width=6.5*inch, height=3.5*inch)
    img.hAlign = 'CENTER'
    story.append(img)
    story.append(Paragraph("<i>Figure 1: Hardhat test results proving 10 security invariants.</i>", ParagraphStyle(name='Caption', parent=body_style, alignment=TA_CENTER, fontSize=9, textColor=colors.grey)))
except:
    story.append(Paragraph("[Screenshot test1.jpg not found]", body_style))

story.append(Spacer(1, 0.3 * inch))
story.append(Paragraph("How to Independently Verify This Contract", heading_style))
story.append(Paragraph("You do not need to trust this report. You can clone the repository and run the test suite yourself.", body_style))
story.append(Paragraph("<b>Step 1: Clone the repository</b>", body_style))
story.append(Paragraph("<code>git clone https://github.com/moritz-sec/Altexera-Smart-Contract-Audit.git</code>", link_style))
story.append(Paragraph("<code>cd Altexera-Smart-Contract-Audit</code>", link_style))
story.append(Spacer(1, 0.1 * inch))
story.append(Paragraph("<b>Step 2: Install dependencies</b>", body_style))
story.append(Paragraph("<code>npm install</code>", link_style))
story.append(Spacer(1, 0.1 * inch))
story.append(Paragraph("<b>Step 3: Run the security tests</b>", body_style))
story.append(Paragraph("<code>npx hardhat test</code>", link_style))
story.append(Spacer(1, 0.1 * inch))
story.append(Paragraph("Expected output: <code>10 passing (1s)</code>", bold_style))

# --- Раздел 5: Conclusion ---
story.append(Spacer(1, 0.3 * inch))
story.append(Paragraph("5. Conclusion", heading_style))
story.append(Paragraph("The Altexera smart contract is designed to be non-custodial. Within the scope of this review, no vectors were found that would allow developers to steal user funds or external attackers to bypass access controls.", body_style))

# --- Контакты (кнопки-ссылки) ---
story.append(Spacer(1, 0.4 * inch))
story.append(Paragraph("Contact & Custom Audits", heading_style))
story.append(Paragraph("If you are a project founder or an investor and require a similar independent security review for your smart contracts, feel free to reach out.", body_style))

contact_data = [
    ["Platform", "Link"],
    ["GitHub", "<a href='https://github.com/moritz-sec/Altexera-Smart-Contract-Audit'>github.com/moritz-sec</a>"],
    ["Cantina", "<a href='https://cantina.xyz/u/moritzsec'>cantina.xyz/u/moritzsec</a>"],
    ["Telegram", "<a href='https://t.me/moritz_sec'>@moritz_sec</a>"],
    ["Email", "<a href='mailto:moritz.schneider.sec@proton.me'>moritz.schneider.sec@proton.me</a>"]
]

contact_table = Table(contact_data, colWidths=[1.5*inch, 4.5*inch])
contact_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
]))

story.append(contact_table)

# --- Генерация ---
doc.build(story, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)
print("PDF успешно создан: Altexera_Security_Audit.pdf")
