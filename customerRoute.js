import express from "express";
import {
  getAllCustomers,
  getSingleCustomer,
  createNewCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerInvoices,
} from "./customerController.js";
import { idParamValidation } from "./valdation.js";

const router = express.Router();

router.get("/", getAllCustomers);
router.post("/", createNewCustomer);
router.get("/:id", idParamValidation, getSingleCustomer);
router.put("/:id", idParamValidation, updateCustomer);
router.delete("/:id", idParamValidation, deleteCustomer);
router.get("/:id/invoices", idParamValidation, getCustomerInvoices);

export default router;
