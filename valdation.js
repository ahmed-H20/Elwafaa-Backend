const { check, param } = require("express-validator");
const validatorMiddleware = require("./utils/validatorMiddleware");

const createNewInvoice = [
    check("name").notEmpty().withMessage("اسم العميل مطلوب ❌"),
    check("products").notEmpty().withMessage("المنتجات مطلوبة ❌"),
    validatorMiddleware,
]

const updateInvoice = [
    check("name").notEmpty().withMessage("الرجاء ادخال اسم العميل ❌"),
    check("phone").notEmpty().withMessage("الرجاء ادخال رقم الهاتف ❌"),
    check("address").notEmpty().withMessage("الرجاء ادخال العنوان ❌"),
    check("description").notEmpty().withMessage("الرجاء ادخال الوصف ❌"),
    check("image").notEmpty().withMessage("الرجاء ادخال الصورة ❌"),
    validatorMiddleware
]

const idParam = [
    param("id").notEmpty().withMessage("رقم الفاتورة مطلوب ❌"),
    validatorMiddleware
]

module.exports = {
    createNewInvoice,
    updateInvoice,
    idParam,
}