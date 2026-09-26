const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema({
    id: {
        type: Number,
        autoIncrement: true,
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

module.exports = mongoose.model("Invoice", InvoiceSchema);