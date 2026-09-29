import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema({
    id: {
        type: Number,
    },
    invoiceNumber: {
        type: String,
    },
    name: {
        type: String,
        required: true,
    },
    tax: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: 0
    },
    products: [{
        name: {
            type: String,
            required: true,
        },
        qty: {
            type: Number,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        }
    }]

}, {
    timestamps: true,
})

export default mongoose.model("Invoice", InvoiceSchema);