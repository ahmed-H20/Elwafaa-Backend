const { check, param } = require("express-validator");
const validatorMiddleware = require("./utils/validatorMiddleware");

const createNewInvoice = [
    check("name").notEmpty().withMessage("اسم العميل مطلوب ❌"),
    check("products").isArray().withMessage("المنتجات يجب أن تكون مصفوفة ❌"),
    validatorMiddleware,
];

const updateInvoice = [
    param("id").notEmpty().withMessage("معرف الفاتورة مطلوب ❌"),
    check("name").optional().notEmpty().withMessage("اسم العميل لا يمكن أن يكون فارغاً ❌"),
    check("products").optional().isArray().withMessage("المنتجات يجب أن تكون مصفوفة ❌"),
    validatorMiddleware,
];

const idParam = [
    param("id").notEmpty().withMessage("رقم الفاتورة مطلوب ❌"),
    validatorMiddleware,
];

module.exports = {
    createNewInvoice,
    updateInvoice,
    idParam,
};