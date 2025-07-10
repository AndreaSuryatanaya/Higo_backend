import express from "express";
import dotenv from "dotenv";
import customerRoutes from "./router/customer.js";
import mongoose from "mongoose";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/customers", customerRoutes);
app.get("/", (req, res) => {
    res.send("Hello World!");
});

// DB Connect & Start Server
mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log("✅ MongoDB Connected");
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
});
