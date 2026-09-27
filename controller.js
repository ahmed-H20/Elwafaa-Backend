const Invoice = require("./model");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const generateInvoicePDF = require("./utils/generateInvoicePDF");

const createNewInvoice = async (req, res) => {
    try {
        const { name, tax, products } = req.body;
        let total
        // calculate total 
        if (tax) {
            const priceBeforeTax = products.reduce((acc, product) => acc + (product.price * product.qty), 0);
            total = priceBeforeTax + (priceBeforeTax * tax / 100);
        } else {
            total = products.reduce((acc, product) => acc + (product.price * product.qty), 0);
        }

        const invoice = await Invoice.create({ name, tax, total, products });
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
        res.status(200).json(invoice);
    } catch (err) {
        res.status(500).json({ message: "فشل الحصول علي الفاتورة", error: err.message });
    }
}
const updateInvoice = async (req, res) => {
    try {
        const { name, phone, address, description, image } = req.body;
        const invoice = await Invoice.findByIdAndUpdate(req.params.id, { name, phone, address, description, image }, { new: true });
        res.status(200).json(invoice);
    } catch (err) {
        res.status(500).json({ message: "فشل تحديث الفاتورة", error: err.message });
    }
}
const deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByIdAndDelete(req.params.id);
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

        const safeFilename = encodeURIComponent(`فاتورة_${invoice.name || invoice._id.toString()}.pdf`);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`
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

module.exports = {
    createNewInvoice,
    getAllInvoice,
    getSingleInvoice,
    updateInvoice,
    deleteInvoice,
    downloadInvoicePDF
}