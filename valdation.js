import { check, param } from "express-validator";
import validatorMiddleware from "./utils/validatorMiddleware.js";

const createNewInvoiceValidation = [
    check("name").notEmpty().withMessage("اسم العميل مطلوب ❌"),
    check("products").isArray().withMessage("المنتجات يجب أن تكون مصفوفة ❌"),
    validatorMiddleware,
];

const updateInvoiceValidation = [
    param("id").notEmpty().withMessage("معرف الفاتورة مطلوب ❌"),
    check("name").optional().notEmpty().withMessage("اسم العميل لا يمكن أن يكون فارغاً ❌"),
    check("products").optional().isArray().withMessage("المنتجات يجب أن تكون مصفوفة ❌"),
    validatorMiddleware,
];

const idParamValidation = [
    param("id").notEmpty().withMessage("رقم الفاتورة مطلوب ❌"),
    validatorMiddleware,
];

export {
    createNewInvoiceValidation,
    updateInvoiceValidation,
    idParamValidation,
};