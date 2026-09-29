import express from "express";
import {
    createNewInvoice,
    getAllInvoice,
    getSingleInvoice,
    updateInvoice,
    deleteInvoice,
    downloadInvoicePDF,
    viewInvoiceHTML
} from "./controller.js";
import {
    createNewInvoiceValidation,
    updateInvoiceValidation,
    idParamValidation
} from "./valdation.js";

const router = express.Router();

router.post("/", createNewInvoiceValidation, createNewInvoice);
router.get("/", getAllInvoice);
router.get(
    "/:id/pdf",
    downloadInvoicePDF
);
router.get("/:id/view", idParamValidation, viewInvoiceHTML);
router.get("/:id/html", idParamValidation, viewInvoiceHTML);
router.get("/:id", idParamValidation, getSingleInvoice);
router.put("/:id", updateInvoiceValidation, updateInvoice);
router.delete("/:id", idParamValidation, deleteInvoice);

export default router;