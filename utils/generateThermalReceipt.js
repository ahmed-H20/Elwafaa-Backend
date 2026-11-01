import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Builds a 55mm thermal receipt HTML string matching the exact receipt layout:
 * - مؤسسة الوفاء الخضراء
 * - 057484102 / 311058365400003
 * - INVOICE No & Date
 * - Customer Name
 * - Product / Quantity / Rate / Amount table
 * - Base Amount, Total, Paid, Balance
 * - Payment Detail & Account No
 * - Signature
 * - Thank you! Happy Business!
 * - QR code
 *
 * @param {Object} invoice
 * @param {Object} [options]
 * @param {boolean} [options.autoPrint=false]
 * @returns {string} Complete HTML document string
 */
function buildThermalReceiptHTML(invoice, options = {}) {
    const { autoPrint = false } = options;
    const logoBase64 = getLogoBase64();

    // Normalize items
    const rawItems = Array.isArray(invoice.products)
        ? invoice.products
        : (Array.isArray(invoice.items) ? invoice.items : []);

    const products = rawItems.map((p) => ({
        name: p.name || "",
        qty: p.qty !== undefined ? p.qty : (p.quantity !== undefined ? p.quantity : 1),
        price: Number(p.price || 0),
    }));

    const subtotal = products.reduce(
        (acc, p) => acc + Number(p.qty || 0) * Number(p.price || 0),
        0
    );
    const calculatedTotal =
        invoice.total !== undefined ? Number(invoice.total) : subtotal;
    const paid = Number(invoice.paid || 0);
    const balance = calculatedTotal - paid;

    // Date formatted as "23 Oct 2026"
    let formattedDate = "";
    try {
        const d = new Date(invoice.createdAt || invoice.date || Date.now());
        if (!isNaN(d.getTime())) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            formattedDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } else {
            formattedDate = String(invoice.createdAt || invoice.date || "");
        }
    } catch {
        formattedDate = String(invoice.createdAt || invoice.date || "");
    }

    const invoiceNumber = invoice.invoiceNumber || invoice.id || invoice._id?.toString() || "1";
    const clientName = invoice.name || invoice.clientName || "";
    const invoiceId = invoice._id?.toString() || invoice.id || "";

    // QR code URL — encodes a link to the invoice view page
    const invoiceViewUrl = `${process.env.BASE_URL_PROD || "https://elwafaabackend.vercel.app"}/api/v1/invoices/${invoiceId}/view`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(invoiceViewUrl)}`;

    // Product rows
    const itemsHTML = products
        .map(
            (item) => `
      <tr>
        <td class="col-name">${escapeHTML(item.name)}</td>
        <td class="col-qty">${item.qty}</td>
        <td class="col-price">${Number(item.price).toFixed(2)}</td>
        <td class="col-total">${(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}</td>
      </tr>`
        )
        .join("");

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاتورة حرارية #${escapeHTML(invoiceNumber)} - مؤسسة الوفاء الخضراء</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background: #f1f5f9;
      font-family: 'Courier New', Courier, monospace, Tahoma, Arial, sans-serif;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Action bar — screen only */
    .action-bar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: linear-gradient(135deg, #0d3b41 0%, #135d66 100%);
      color: #fff;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,.18);
      border-bottom: 2px solid #d6b374;
      font-family: Tahoma, Arial, sans-serif;
    }

    .action-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .action-title {
      font-size: 14px;
      font-weight: 800;
    }

    .action-client {
      font-size: 12px;
      font-weight: 600;
      color: #e0f2fe;
      background: rgba(255,255,255,.12);
      padding: 3px 10px;
      border-radius: 999px;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .act-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 13px;
      border-radius: 6px;
      font-family: Tahoma, Arial, sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      white-space: nowrap;
      text-decoration: none;
      transition: all .2s;
    }

    .btn-thermal {
      background-color: #d6b374;
      color: #111827;
      box-shadow: 0 2px 5px rgba(214,179,116,0.4);
    }
    .btn-thermal:hover { background-color: #c49f5c; transform: translateY(-1px); }

    .btn-a4 {
      background-color: #ffffff;
      color: #135d66;
    }
    .btn-a4:hover { background-color: #f0fdf4; transform: translateY(-1px); }

    .btn-whatsapp {
      background-color: #25d366;
      color: #fff;
    }
    .btn-whatsapp:hover { background-color: #20bd5a; transform: translateY(-1px); }

    .btn-close {
      background-color: rgba(255,255,255,.15);
      color: #fff;
    }
    .btn-close:hover { background-color: rgba(255,255,255,.25); }

    /* Screen preview viewport */
    .page-viewport {
      display: flex;
      justify-content: center;
      padding: 24px 12px 60px;
      min-height: 100vh;
    }

    /* Receipt Ticket Container (55mm standard) */
    .receipt {
      width: 55mm;
      max-width: 55mm;
      background: #fff;
      padding: 6mm 4mm 8mm;
      box-shadow: 0 6px 24px rgba(0,0,0,.12);
      border-radius: 2px;
      font-size: 9.5px;
      line-height: 1.35;
      color: #000;
      box-sizing: border-box;
      direction: rtl;
    }

    /* Header */
    .r-company {
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      line-height: 1.4;
      margin-bottom: 4px;
    }

    .r-company .r-phone {
      font-size: 10px;
      font-weight: normal;
      letter-spacing: 0.5px;
    }

    .r-company .r-vat {
      font-size: 9.5px;
      font-weight: normal;
      letter-spacing: 0.5px;
    }

    .r-title {
      text-align: center;
      font-size: 12px;
      font-weight: bold;
      margin: 6px 0 4px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .r-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 9px;
      margin-bottom: 4px;
      direction: ltr; /* Keeps invoice no left, date right */
    }

    .r-meta-row .inv-no {
      font-weight: bold;
    }

    .r-client-section {
      text-align: right;
      margin-top: 4px;
      margin-bottom: 6px;
      font-size: 9.5px;
    }

    .r-client-label {
      font-weight: bold;
      margin-bottom: 1px;
    }

    .r-client-name {
      font-weight: normal;
      padding-right: 2px;
    }

    .r-divider {
      border: none;
      border-top: 1px dashed #444;
      margin: 5px 0;
    }

    /* Items Table */
    .r-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      font-size: 8.5px;
      direction: ltr; /* English table headers align LTR */
    }

    .r-table thead tr {
      border-top: 1px dashed #444;
      border-bottom: 1px dashed #444;
    }

    .r-table th {
      padding: 3px 1px;
      text-align: center;
      font-weight: bold;
      font-size: 8px;
    }

    .r-table td {
      padding: 3px 1px;
      text-align: center;
      font-size: 8px;
      vertical-align: top;
      word-break: break-word;
    }

    .col-name {
      text-align: right !important;
      direction: rtl !important;
      width: 44%;
    }
    .col-qty  { width: 14%; }
    .col-price { width: 21%; text-align: right !important; }
    .col-total { width: 21%; text-align: right !important; }

    /* Summary */
    .r-summary {
      margin-top: 4px;
      font-size: 9px;
      direction: ltr;
    }

    .r-summary-row {
      display: flex;
      justify-content: space-between;
      padding: 1.5px 0;
    }

    .r-summary-row span:last-child {
      direction: rtl;
    }

    /* Payment Details */
    .r-payment {
      margin-top: 5px;
      font-size: 8px;
      line-height: 1.45;
      direction: rtl;
      text-align: right;
    }

    .r-payment-title {
      font-weight: bold;
      font-size: 8.5px;
      margin-bottom: 2px;
      direction: ltr;
      text-align: left;
    }

    .r-payment-line {
      word-break: break-all;
    }

    /* Signature */
    .r-sig-wrapper {
      margin-top: 10px;
      text-align: right;
      direction: ltr;
      font-size: 8.5px;
      padding-top: 4px;
    }

    /* Footer & QR */
    .r-footer {
      margin-top: 8px;
      text-align: center;
    }

    .r-thanks {
      font-size: 9.5px;
      font-weight: bold;
      margin-bottom: 6px;
      letter-spacing: 0.2px;
    }

    .r-footer img.qr {
      width: 80px;
      height: 80px;
      margin: 0 auto;
      display: block;
    }

    /* ========================
       PRINT STYLES (55mm - 58mm)
    ======================== */
    @media print {
      @page {
        size: 58mm auto;
        margin: 0;
      }

      html, body {
        background: #fff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 58mm !important;
      }

      .no-print, .action-bar, header.action-bar {
        display: none !important;
      }

      .page-viewport {
        padding: 0 !important;
        margin: 0 !important;
        min-height: unset !important;
        display: block !important;
        width: 100% !important;
      }

      .receipt {
        width: 100% !important;
        max-width: 58mm !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 2mm 2.5mm 6mm !important;
        margin: 0 auto !important;
        font-size: 9px !important;
      }
    }
  </style>
</head>
<body>

  <!-- ACTION BAR (screen only) -->
  <header class="action-bar no-print">
    <div class="action-info">
      <span class="action-title">🧾 فاتورة حرارية #${escapeHTML(invoiceNumber)}</span>
      ${clientName ? `<span class="action-client">${escapeHTML(clientName)}</span>` : ""}
    </div>
    <div class="action-buttons">
      <button class="act-btn btn-thermal" onclick="window.print()" title="طباعة فورية للطابعة الحرارية">
        🖨️ طباعة حرارية
      </button>
      <button class="act-btn btn-a4" onclick="openA4()" title="عرض الفاتورة بالحجم الكبير A4">
        📄 عرض A4
      </button>
      <button class="act-btn btn-whatsapp" onclick="handleWhatsApp()">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.053-2.128-.538-1.748-.724-2.885-2.502-2.973-2.617-.087-.116-.708-.94-0.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.392-12.416c-5.523 0-10 4.477-10 10 0 1.767.459 3.428 1.261 4.872l-1.341 4.897 5.01-1.314c1.4 0.748 2.99 1.175 4.68 1.175 5.523 0 10-4.477 10-10s-4.477-10-10-10z"/>
        </svg>
        <span>واتساب</span>
      </button>
      <button class="act-btn btn-close" onclick="window.close()">إغلاق ✕</button>
    </div>
  </header>

  <!-- RECEIPT BODY -->
  <div class="page-viewport">
    <div class="receipt">

      <!-- Company Header -->
      <div class="r-company">
        مؤسسة الوفاء الخضراء<br>
        <div class="r-phone">057484102</div>
        <div class="r-vat">311058365400003</div>
      </div>

      <div class="r-title">INVOICE</div>

      <div class="r-meta-row">
        <div class="inv-no">INVOICE No ${escapeHTML(invoiceNumber)}</div>
        <div>${formattedDate}</div>
      </div>

      <div class="r-client-section">
        <div class="r-client-label">العميل</div>
        <div class="r-client-name">${escapeHTML(clientName || "عميل نقدي")}</div>
      </div>

      <!-- Items Table -->
      <table class="r-table">
        <thead>
          <tr>
            <th class="col-name">Product</th>
            <th class="col-qty">Quantity</th>
            <th class="col-price">Rate</th>
            <th class="col-total">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <hr class="r-divider">

      <!-- Summary -->
      <div class="r-summary">
        <div class="r-summary-row">
          <span>Base Amount</span>
          <span>${subtotal.toFixed(2)} ر.س.</span>
        </div>
        <div class="r-summary-row" style="font-weight: bold;">
          <span>Total</span>
          <span>${calculatedTotal.toFixed(2)} ر.س.</span>
        </div>
        <div class="r-summary-row">
          <span>Paid</span>
          <span>${paid.toFixed(2)} ر.س.</span>
        </div>
        <div class="r-summary-row" style="font-weight: bold;">
          <span>Balance</span>
          <span>${balance.toFixed(2)} ر.س.</span>
        </div>
      </div>

      <hr class="r-divider">

      <!-- Payment Details -->
      <div class="r-payment">
        <div class="r-payment-title">Payment Detail</div>
        <div class="r-payment-line">مؤسسة الوفاء الخضراء : مؤسسة الوفاء الخضراء</div>
        <div class="r-payment-line">Account No : SA3430100949000013389245</div>
        <div class="r-payment-line" style="margin-top: 3px; font-weight: bold;">Other Details :</div>
        <div class="r-payment-line">SA7680000205608016618095</div>
      </div>

      <!-- Signature -->
      <div class="r-sig-wrapper">
        <span>Signature</span>
      </div>

      <!-- Footer & QR -->
      <div class="r-footer">
        <div class="r-thanks">Thank you! Happy Business!</div>
        <img class="qr" src="${qrApiUrl}" alt="QR Code" onerror="this.style.display='none'" />
      </div>

    </div>
  </div>

  <script>
    var invoiceViewUrl = ${JSON.stringify(invoiceViewUrl)};
    var invoiceA4Url   = ${JSON.stringify(`${process.env.BASE_URL_PROD || "https://elwafaabackend.vercel.app"}/api/v1/invoices/${invoiceId}/view`)};
    var invoiceNumber  = ${JSON.stringify(invoiceNumber)};
    var clientName     = ${JSON.stringify(clientName)};
    var total          = ${JSON.stringify(calculatedTotal.toFixed(2))};

    function openA4() {
      window.open(invoiceA4Url, "_blank");
    }

    function handleWhatsApp() {
      var text =
        "*فاتورة مبيعات - مؤسسة الوفاء الخضراء*" +
        "\\n\\n" +
        "📄 رقم الفاتورة: #" + invoiceNumber +
        "\\n" +
        "👤 العميل: " + (clientName || "—") +
        "\\n" +
        "💰 الإجمالي: " + total + " ريال" +
        "\\n" +
        "🔗 رابط عرض الفاتورة:\\n" +
        invoiceViewUrl;

      if (navigator.share) {
        navigator.share({ title: "فاتورة #" + invoiceNumber, text: text })
          .catch(function(e) {
            if (e && e.name !== "AbortError") {
              window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
            }
          });
        return;
      }
      window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
    }

    ${autoPrint ? `
    window.addEventListener("load", function() {
      setTimeout(function() { window.print(); }, 400);
    });
    ` : ""}
  </script>
</body>
</html>`;
}

export { buildThermalReceiptHTML };
