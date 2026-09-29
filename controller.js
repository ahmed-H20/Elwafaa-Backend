import Invoice from "./model.js";
import crypto from "crypto";
import { generateInvoicePDF, buildInvoiceHTML } from "./utils/generateInvoicePDF.js";

const createNewInvoice = async (req, res) => {
    try {
        const { name, tax, products, invoiceNumber } = req.body;
        const taxRate = Number(tax || 0);
        const safeProducts = Array.isArray(products) ? products : [];
        const priceBeforeTax = safeProducts.reduce((acc, product) => acc + (Number(product.price || 0) * Number(product.qty || 0)), 0);
        const total = priceBeforeTax + (priceBeforeTax * taxRate / 100);

        const invoice = await Invoice.create({
            name,
            invoiceNumber,
            tax: taxRate,
            total,
            products: safeProducts.map(p => ({
                name: p.name,
                qty: Number(p.qty || 1),
                price: Number(p.price || 0)
            }))
        });
        res.status(201).json({ message: "تم اضافه الفاتورة بنجاح", invoice });
    } catch (err) {
        res.status(500).json({ message: "فشل اضافه الفاتورة", error: err.message });
    }
}

const getAllInvoice = async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ createdAt: -1 });
        res.status(200).json(invoices);
    } catch (err) {
        res.status(500).json({ message: "فشل الحصول علي الفواتير", error: err.message });
    }
}

const getSingleInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: "الفاتورة غير موجودة" });
        }
        res.status(200).json(invoice);
    } catch (err) {
        res.status(500).json({ message: "فشل الحصول علي الفاتورة", error: err.message });
    }
}

const updateInvoice = async (req, res) => {
    try {
        const { name, tax, products, invoiceNumber } = req.body;
        const currentDoc = await Invoice.findById(req.params.id);
        if (!currentDoc) {
            return res.status(404).json({ message: "الفاتورة غير موجودة" });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
        if (tax !== undefined) updateData.tax = Number(tax || 0);
        if (products !== undefined && Array.isArray(products)) {
            updateData.products = products.map(p => ({
                name: p.name,
                qty: Number(p.qty || 1),
                price: Number(p.price || 0)
            }));
        }

        // Recalculate total if products or tax changed
        const effectiveTax = updateData.tax !== undefined ? updateData.tax : Number(currentDoc.tax || 0);
        const effectiveProducts = updateData.products !== undefined ? updateData.products : currentDoc.products;
        const priceBeforeTax = effectiveProducts.reduce((acc, product) => acc + (Number(product.price || 0) * Number(product.qty || 0)), 0);
        updateData.total = priceBeforeTax + (priceBeforeTax * effectiveTax / 100);

        const invoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        res.status(200).json({ message: "تم تحديث الفاتورة بنجاح", invoice });
    } catch (err) {
        res.status(500).json({ message: "فشل تحديث الفاتورة", error: err.message });
    }
}

const deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByIdAndDelete(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: "الفاتورة غير موجودة" });
        }
        res.status(200).json({ message: "تم حذف الفاتورة بنجاح" });
    } catch (err) {
        res.status(500).json({ message: "فشل حذف الفاتورة", error: err.message });
    }
}

const downloadInvoicePDF = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({
                message: "الفاتورة غير موجودة",
            });
        }
        const pdf = await generateInvoicePDF(invoice);

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        const cleanName = (invoice.name || "مبيعات").replace(/[^\w\s\u0600-\u06FF-]/gi, "");
        const safeFilename = encodeURIComponent(`فاتورة_${cleanName || invoice._id.toString()}.pdf`);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="invoice_${invoice._id.toString()}.pdf"; filename*=UTF-8''${safeFilename}`
        );

        res.send(pdf);

    } catch (error) {
        console.error("Server PDF generation error:", error);

        res.status(500).json({
            message: "Failed to generate invoice PDF",
            error: error.message,
        });
    }
};

const viewInvoiceHTML = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head><meta charset="UTF-8"><title>الفاتورة غير موجودة</title></head>
                <body style="font-family: Cairo, Tahoma, sans-serif; text-align: center; padding: 50px; background: #f9fafb;">
                    <h2 style="color: #ef4444;">عذراً، الفاتورة غير موجودة أو تم حذفها</h2>
                    <p style="margin-top: 10px; color: #4b5563;">تأكد من صحة رقم الفاتورة وحاول مجدداً</p>
                    <a href="/" style="display: inline-block; margin-top: 16px; padding: 8px 16px; background: #135d66; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">العودة للنظام</a>
                </body>
                </html>
            `);
        }

        const autoPrint = req.query.print === "true";
        const html = buildInvoiceHTML(invoice, {
            includeActionBar: true,
            autoPrint: autoPrint,
        });

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
    } catch (error) {
        console.error("Server HTML generation error:", error);
        res.status(500).send("<h2>حدث خطأ أثناء عرض الفاتورة</h2>");
    }
};

export {
    createNewInvoice,
    getAllInvoice,
    getSingleInvoice,
    updateInvoice,
    deleteInvoice,
    downloadInvoicePDF,
    viewInvoiceHTML
}