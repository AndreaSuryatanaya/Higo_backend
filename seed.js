import fs from "fs";
import csv from "csv-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Customer } from "./models/Customer.js";

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;

const BATCH_SIZE = 200;
let batch = [];

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected");

    const stream = fs.createReadStream("Dataset.csv").pipe(csv({ mapHeaders: ({ header }) => header.trim() }));

    stream.on("data", (row) => {
        const mapped = {
            id: parseInt(row[""]),
            customerId: parseInt(row["Number"]),
            locationName: row["Name of Location"],
            date: row["Date"],
            loginHour: row["Login Hour"],
            fullName: row["Name"],
            birthYear: parseInt(row["Age"]),
            gender: row["gender"],
            email: row["Email"],
            phone: row["No Telp"],
            device: row["Brand Device"],
            digitalInterest: row["Digital Interest"],
            locationType: row["Location Type"],
        };

        batch.push(mapped);

        if (batch.length >= BATCH_SIZE) {
            stream.pause(); // 🛑 berhenti sejenak biar gak numpuk
            Customer.insertMany(batch, { ordered: false })
                .then(() => {
                    console.log(`✅ Inserted ${batch.length} records`);
                    batch = [];
                    stream.resume(); // ▶️ lanjut baca
                })
                .catch((err) => {
                    console.error("❌ Insert error:", err.message);
                    batch = [];
                    stream.resume(); // tetap lanjut meski ada error
                });
        }
    });

    stream.on("end", async () => {
        if (batch.length > 0) {
            await Customer.insertMany(batch, { ordered: false });
            console.log("✅ Inserted final batch");
        }

        await mongoose.disconnect();
        console.log("🎉 Done seeding data!");
    });
}

seed().catch(console.error);
