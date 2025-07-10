import express from "express";
import { Customer } from "../models/Customer.js";

const router = express.Router();

router.get("/", async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    try {
        const totalItems = await Customer.countDocuments(); // total semua data
        const customers = await Customer.find()
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        res.json({
            page: pageNum,
            limit: limitNum,
            totalItems,
            totalPages: Math.ceil(totalItems / limitNum),
            data: customers,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /customers/statistics/gender
router.get("/statistics/gender", async (req, res) => {
    try {
        const result = await Customer.aggregate([
            {
                $group: {
                    _id: "$gender",
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    gender: "$_id",
                    count: 1,
                },
            },
        ]);

        const formatted = {};
        result.forEach((item) => {
            formatted[item.gender] = item.count;
        });

        res.json(formatted);
    } catch (error) {
        console.error("❌ Error in /statistics/gender:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
