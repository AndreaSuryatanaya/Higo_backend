// const moongoose = require("mongoose");
import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
    {
        id: Number, // Index dari baris CSV (opsional)
        customerId: { type: Number, required: true },
        locationName: { type: String, required: true },
        date: { type: String, required: true }, // atau Date jika di-parse
        loginHour: { type: String, required: true },
        fullName: { type: String, required: true },
        birthYear: { type: Number },
        gender: { type: String },
        email: { type: String, required: true },
        phone: { type: String },
        device: { type: String },
        digitalInterest: { type: String },
        locationType: { type: String },
    },
    { timestamps: true }
);

export const Customer = mongoose.model("Customer", customerSchema);
