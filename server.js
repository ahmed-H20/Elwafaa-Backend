const express = require('express');
const dotenv = require('dotenv');
const colors = require('colors');
const mongoose = require("mongoose");
const cors = require('cors');
const invoiceRoute = require("./route");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

//Connent to database
const dbConnecting = () =>
    mongoose
        .connect(process.env.DB_URL)
        .then(() => {
            console.log("db connected Successfully✅");
        })
        .catch((err) => {
            console.error(`error on connection with db💥: ${err}`);
            process.exit(1); // close server
        });

dbConnecting();


app.use("/api/v1/invoices", invoiceRoute);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Server error' });
})

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`.green.bold);
});

// Global Error Handling Outside Express
process.on("unhandledRejection", (err) => {
    console.log(`RejectionHandled Error: ${err.name} | ${err.message}`);
    server.close(() => {
        console.log("shutting down.....");
        process.exit(1);
    });
});