import Customer from "./customerModel.js";
import Invoice from "./model.js";

// @desc    Get all customers (with search & statistics)
// @route   GET /api/v1/customers
export const getAllCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};

    if (search && search.trim()) {
      const q = search.trim();
      filter = {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
        ],
      };
    }

    // Auto-sync legacy invoices without customers
    try {
      const unlinkedNames = await Invoice.distinct("name", {
        $or: [{ customerId: null }, { customerId: { $exists: false } }]
      });
      for (const rawName of unlinkedNames) {
        if (rawName && rawName.trim()) {
          const trimmed = rawName.trim();
          let cust = await Customer.findOne({
            name: { $regex: new RegExp(`^${trimmed}$`, "i") }
          });
          if (!cust) {
            cust = await Customer.create({ name: trimmed });
          }
          await Invoice.updateMany(
            { name: trimmed, $or: [{ customerId: null }, { customerId: { $exists: false } }] },
            { customerId: cust._id }
          );
        }
      }
    } catch (syncErr) {
      console.error("Auto-sync customers warning:", syncErr.message);
    }

    const customers = await Customer.find(filter).sort({ name: 1 });

    // Calculate invoice stats for each customer (count and total)
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const invoices = await Invoice.find({
          $or: [{ customerId: customer._id }, { name: customer.name }],
        }).select("total invoiceNumber createdAt");

        const invoicesCount = invoices.length;
        const totalAmount = invoices.reduce(
          (sum, inv) => sum + (Number(inv.total) || 0),
          0
        );

        return {
          ...customer.toObject(),
          invoicesCount,
          totalAmount,
        };
      })
    );

    res.status(200).json(customersWithStats);
  } catch (err) {
    res.status(500).json({
      message: "فشل الحصول على بيانات العملاء",
      error: err.message,
    });
  }
};

// @desc    Get single customer by ID with their invoices
// @route   GET /api/v1/customers/:id
export const getSingleCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "العميل غير موجود" });
    }

    // Fetch all invoices for this customer
    const invoices = await Invoice.find({
      $or: [{ customerId: customer._id }, { name: customer.name }],
    }).sort({ createdAt: -1 });

    const totalAmount = invoices.reduce(
      (sum, inv) => sum + (Number(inv.total) || 0),
      0
    );

    res.status(200).json({
      customer,
      invoices,
      invoicesCount: invoices.length,
      totalAmount,
    });
  } catch (err) {
    res.status(500).json({
      message: "فشل الحصول على تفاصيل العميل",
      error: err.message,
    });
  }
};

// @desc    Create new customer (phone is optional)
// @route   POST /api/v1/customers
export const createNewCustomer = async (req, res) => {
  try {
    const { name, phone = "", address = "", notes = "" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "اسم العميل مطلوب ❌" });
    }

    const trimmedName = name.trim();

    // Check if customer with same name already exists
    const existing = await Customer.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (existing) {
      return res.status(200).json({
        message: "العميل مسجل مسبقاً",
        customer: existing,
        isExisting: true,
      });
    }

    const customer = await Customer.create({
      name: trimmedName,
      phone: phone ? phone.trim() : "",
      address: address ? address.trim() : "",
      notes: notes ? notes.trim() : "",
    });

    res.status(201).json({
      message: "تم إضافة العميل بنجاح ✅",
      customer,
      isExisting: false,
    });
  } catch (err) {
    res.status(500).json({
      message: "فشل إضافة العميل",
      error: err.message,
    });
  }
};

// @desc    Update customer
// @route   PUT /api/v1/customers/:id
export const updateCustomer = async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (notes !== undefined) updateData.notes = notes.trim();

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "العميل غير موجود" });
    }

    res.status(200).json({
      message: "تم تحديث بيانات العميل بنجاح ✅",
      customer,
    });
  } catch (err) {
    res.status(500).json({
      message: "فشل تحديث بيانات العميل",
      error: err.message,
    });
  }
};

// @desc    Delete customer
// @route   DELETE /api/v1/customers/:id
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "العميل غير موجود" });
    }

    res.status(200).json({ message: "تم حذف العميل بنجاح ✅" });
  } catch (err) {
    res.status(500).json({
      message: "فشل حذف العميل",
      error: err.message,
    });
  }
};

// @desc    Get all invoices for a customer
// @route   GET /api/v1/customers/:id/invoices
export const getCustomerInvoices = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "العميل غير موجود" });
    }

    const invoices = await Invoice.find({
      $or: [{ customerId: customer._id }, { name: customer.name }],
    }).sort({ createdAt: -1 });

    res.status(200).json(invoices);
  } catch (err) {
    res.status(500).json({
      message: "فشل جلب فواتير العميل",
      error: err.message,
    });
  }
};
