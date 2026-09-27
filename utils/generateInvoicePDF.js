const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// Helper to convert logo to base64 for reliable Puppeteer rendering
function getLogoBase64() {
    try {
        const logoPath = path.resolve(__dirname, "../assets/logo.png");
        if (fs.existsSync(logoPath)) {
            const fileData = fs.readFileSync(logoPath);
            return `data:image/png;base64,${fileData.toString("base64")}`;
        }
    } catch (e) {
        console.error("Error reading logo file:", e);
    }
    return "";
}

async function generateInvoicePDF(invoice) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--font-render-hinting=medium",
        ],
    });

    try {
        const page = await browser.newPage();

        await page.setViewport({
            width: 794,
            height: 1123,
            deviceScaleFactor: 2,
        });

        const logoBase64 = getLogoBase64();

        // Calculate values safely
        const products = Array.isArray(invoice.products) ? invoice.products : [];
        const subtotal = products.reduce((acc, p) => acc + (Number(p.qty || 0) * Number(p.price || 0)), 0);
        const taxRate = Number(invoice.tax || 0);
        const calculatedTotal = invoice.total !== undefined ? Number(invoice.total) : (subtotal + (subtotal * taxRate / 100));

        // Format dates cleanly
        let formattedDate = "";
        if (invoice.createdAt) {
            try {
                const d = new Date(invoice.createdAt);
                if (!isNaN(d.getTime())) {
                    formattedDate = d.toISOString().split("T")[0];
                } else {
                    formattedDate = String(invoice.createdAt);
                }
            } catch (err) {
                formattedDate = String(invoice.createdAt);
            }
        }

        const invoiceNumber = invoice.id || invoice._id?.toString() || "";

        // Generate product rows
        const itemsHTML = products
            .map(
                (item, index) => `
          <tr>
            <td class="col-num">${index + 1}</td>
            <td class="col-desc">${escapeHTML(item.name || "")}</td>
            <td class="col-qty">${item.qty ?? ""}</td>
            <td class="col-price">${item.price !== undefined ? Number(item.price).toFixed(2) : ""}</td>
            <td class="col-total">${(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}</td>
          </tr>
        `
            )
            .join("");

        const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة مبيعات</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap');

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          @page {
            size: A4;
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
            width: 210mm;
            min-height: 297mm;
            background: #ffffff;
            font-family: 'Cairo', 'Tajawal', Tahoma, Arial, sans-serif;
            color: #111827;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .invoice-container {
            width: 210mm;
            min-height: 297mm;
            position: relative;
            padding: 0 16mm 16mm 16mm;
            background: #ffffff;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }

          /* =========================
             Top & Bottom Color Bars
          ========================= */
          .top-bar {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 9mm;
            background-color: #135d66;
          }

          .bottom-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 9mm;
            background-color: #135d66;
          }

          /* =========================
             Header Section
          ========================= */
          .header {
            padding-top: 14mm;
            width: 100%;
          }

          .logo-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 2mm;
          }

          .logo-img {
            max-width: 38mm;
            max-height: 28mm;
            object-fit: contain;
          }

          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 2mm;
            direction: ltr; /* LTR container so left is Left and right is Right */
          }

          /* Left: Title */
          .invoice-title {
            direction: rtl;
            color: #135d66;
            font-size: 34pt;
            font-weight: 800;
            line-height: 1.1;
            letter-spacing: -0.5px;
            margin-top: 2mm;
          }

          /* Right: Metadata */
          .invoice-meta {
            direction: rtl;
            text-align: right;
            font-size: 13pt;
            font-weight: 600;
            line-height: 1.85;
            color: #1a1a1a;
          }

          .meta-item {
            display: flex;
            align-items: baseline;
            gap: 6px;
            white-space: nowrap;
          }

          .meta-label {
            font-weight: 700;
            color: #222;
          }

          .meta-value {
            font-weight: 600;
            color: #333;
          }

          /* =========================
             Items Table
          ========================= */
          .table-container {
            margin-top: 6mm;
            width: 100%;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            direction: rtl;
            font-size: 12pt;
          }

          .items-table thead {
            background-color: #d6b374;
          }

          .items-table th {
            height: 11mm;
            padding: 2mm 3mm;
            font-size: 13pt;
            font-weight: 800;
            color: #111;
            text-align: center;
            border: none;
          }

          .items-table td {
            height: 10.5mm;
            padding: 1.5mm 3mm;
            text-align: center;
            border-bottom: 1.2px solid #2b2b2b;
            font-size: 12pt;
            font-weight: 600;
            color: #222;
          }

          .col-num {
            width: 8%;
          }

          .col-desc {
            width: 44%;
            text-align: center;
          }

          .col-qty {
            width: 16%;
          }

          .col-price {
            width: 16%;
          }

          .col-total {
            width: 16%;
          }

          /* =========================
             Summary & Middle Area
          ========================= */
          .middle-section {
            margin-top: 6mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            direction: ltr; /* Left side has Summary, Right side has Thanks */
          }

          /* Left summary box */
          .summary-box {
            width: 65mm;
            direction: rtl;
            display: flex;
            flex-direction: column;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2.5mm 3mm;
            font-size: 12.5pt;
            font-weight: 700;
            color: #1a1a1a;
          }

          .summary-label-stacked {
            text-align: center;
            line-height: 1.15;
            font-size: 11.5pt;
            font-weight: 700;
          }

          .summary-row-total {
            background-color: #d6b374;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3mm 4mm;
            font-size: 13.5pt;
            font-weight: 800;
            color: #111;
            margin-top: 1mm;
          }

          /* Center/Right "شكرا لكم..." */
          .thanks-message {
            direction: rtl;
            color: #135d66;
            font-size: 26pt;
            font-weight: 700;
            margin-top: 14mm;
            margin-right: 22mm;
            letter-spacing: -0.5px;
          }

          /* =========================
             Notes Section
          ========================= */
          .notes-section {
            margin-top: 8mm;
            direction: rtl;
            text-align: right;
            padding-right: 2mm;
          }

          .notes-heading {
            color: #135d66;
            font-size: 14pt;
            font-weight: 800;
            margin-bottom: 2mm;
          }

          .notes-list {
            list-style-type: none;
            padding: 0;
            margin: 0;
            font-size: 10.5pt;
            font-weight: 600;
            color: #222;
          }

          .notes-list li {
            position: relative;
            padding-right: 14px;
          }

          .notes-list li::before {
            content: "•";
            position: absolute;
            right: 0;
            color: #222;
            font-size: 14pt;
            line-height: 1;
            top: -1px;
          }

          /* =========================
             Footer Section
          ========================= */
          .footer-section {
            position: absolute;
            bottom: 14mm;
            right: 16mm;
            direction: rtl;
            display: flex;
            flex-direction: column;
            gap: 2mm;
            align-items: flex-start;
          }

          .footer-contact-row {
            display: flex;
            align-items: center;
            gap: 2.5mm;
            direction: rtl;
          }

          .footer-icon-box {
            width: 5.5mm;
            height: 5.5mm;
            background-color: #135d66;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 1px;
            flex-shrink: 0;
          }

          .footer-icon-box svg {
            width: 3.5mm;
            height: 3.5mm;
            fill: #ffffff;
          }

          .footer-text {
            font-size: 10pt;
            font-weight: 700;
            color: #222222;
            font-family: 'Cairo', Tahoma, sans-serif;
            direction: ltr; /* keeps phone number and email direction correct */
            text-align: right;
          }

        </style>
      </head>

      <body>
        <div class="invoice-container">
          <div class="top-bar"></div>

          <!-- HEADER -->
          <div class="header">
            <div class="logo-wrapper">
              ${logoBase64
                ? `<img class="logo-img" src="${logoBase64}" alt="Logo" />`
                : `<div style="font-size: 22pt; font-weight: bold; color: #135d66;">الوفاء للمستلزمات</div>`
            }
            </div>

            <div class="header-row">
              <div class="invoice-title">
                فاتورة مبيعات
              </div>

              <div class="invoice-meta">
                <div class="meta-item">
                  <span class="meta-label">رقم الفاتورة :</span>
                  <span class="meta-value">${escapeHTML(invoiceNumber)}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">اسم العميل :</span>
                  <span class="meta-value">${escapeHTML(invoice.name || "")}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">التاريخ:</span>
                  <span class="meta-value">${escapeHTML(formattedDate)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ITEMS TABLE -->
          <div class="table-container">
            <table class="items-table">
              <thead>
                <tr>
                  <th class="col-num">م</th>
                  <th class="col-desc">البيــــــــان</th>
                  <th class="col-qty">الكمية</th>
                  <th class="col-price">السعر</th>
                  <th class="col-total">الاجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
          </div>

          <!-- MIDDLE AREA (SUMMARY + THANKS) -->
          <div class="middle-section">
            <div class="summary-box">
              <div class="summary-row">
                <div class="summary-label-stacked">
                  <div>الـاجمالي</div>
                  <div>السعر</div>
                </div>
                <div class="summary-val">${subtotal.toFixed(2)}</div>
              </div>

              <div class="summary-row">
                <div class="summary-label">الضريبة</div>
                <div class="summary-val">${taxRate ? `% ${taxRate}` : "% 0"}</div>
              </div>

              <div class="summary-row-total">
                <div class="summary-label-stacked">
                  <div>الإجمالي</div>
                  <div>العام</div>
                </div>
                <div class="summary-val">${calculatedTotal.toFixed(2)}</div>
              </div>
            </div>

            <div class="thanks-message">
              شكرا لكم...
            </div>
          </div>

          <!-- NOTES -->
          <div class="notes-section">
            <div class="notes-heading">ملاحظات</div>
            <ul class="notes-list">
              <li>التأكد من استلام جميع بنود الفاتورة</li>
            </ul>
          </div>

          <!-- FOOTER -->
          <div class="footer-section">
            <div class="footer-contact-row">
              <div class="footer-icon-box">
                <svg viewBox="0 0 24 24">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </div>
              <div class="footer-text">0582076406</div>
            </div>

            <div class="footer-contact-row">
              <div class="footer-icon-box">
                <svg viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <div class="footer-text">elwafaa.company1@gmail.com</div>
            </div>
          </div>

          <div class="bottom-bar"></div>
        </div>
      </body>
      </html>
    `;

        await page.setContent(html, {
            waitUntil: "domcontentloaded",
        });

        await page.evaluateHandle("document.fonts.ready");

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: "0",
                right: "0",
                bottom: "0",
                left: "0",
            },
        });

        return pdf;
    } finally {
        await browser.close();
    }
}

// Helpers
// function createEmptyRows(count) {
//     return Array.from(
//         { length: count },
//         () => `
//       <tr>
//         <td class="col-num">&nbsp;</td>
//         <td class="col-desc"></td>
//         <td class="col-qty"></td>
//         <td class="col-price"></td>
//         <td class="col-total"></td>
//       </tr>
//     `
//     ).join("");
// }

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

module.exports = generateInvoicePDF;