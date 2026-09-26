const express = require("express");
const {
    createNewInvoice,
    getAllInvoice,
    getSingleInvoice,
    updateInvoice,
    deleteInvoice
} = require("./controller");
const { createNewInvoice: createNewInvoiceValidation, updateInvoice: updateInvoiceValidation, idParam } = require("./valdation");

const router = express.Router();

router.post("/", createNewInvoiceValidation, createNewInvoice);
router.get("/", getAllInvoice);
router.get("/:id", idParam, getSingleInvoice);
router.put("/:id", updateInvoiceValidation, updateInvoice);
router.delete("/:id", idParam, deleteInvoice);

module.exports = router;