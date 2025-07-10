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

// GET /customers/statistics/summary
router.get("/statistics/summary", async (req, res) => {
    try {
        // Count total documents (all records including duplicates)
        const totalRecords = await Customer.countDocuments();

        // Count unique customers by different criteria
        const uniqueStats = await Customer.aggregate([
            {
                $group: {
                    _id: null,
                    uniqueByCustomerId: { $addToSet: "$customerId" },
                },
            },
            {
                $project: {
                    _id: 0,
                    uniqueCustomersByCustomerId: { $size: "$uniqueByCustomerId" },
                },
            },
        ]);

        // Calculate age from birthYear using unique customers only (by customerId)
        const currentYear = new Date().getFullYear();

        const summaryStats = await Customer.aggregate([
            // First, get unique customers by customerId
            {
                $group: {
                    _id: "$customerId",
                    fullName: { $first: "$fullName" },
                    birthYear: { $first: "$birthYear" },
                    gender: { $first: "$gender" },
                    email: { $first: "$email" },
                    // Keep first occurrence of each unique customer
                },
            },
            {
                $addFields: {
                    age: { $subtract: [currentYear, "$birthYear"] },
                },
            },
            {
                $group: {
                    _id: null,
                    avgAge: { $avg: "$age" },
                    minAge: { $min: "$age" },
                    maxAge: { $max: "$age" },
                    avgBirthYear: { $avg: "$birthYear" },
                    minBirthYear: { $min: "$birthYear" },
                    maxBirthYear: { $max: "$birthYear" },
                },
            },
        ]);

        const genderStats = await Customer.aggregate([
            // Group by customerId first to get unique customers
            {
                $group: {
                    _id: "$customerId",
                    gender: { $first: "$gender" },
                },
            },
            // Then group by gender
            {
                $group: {
                    _id: "$gender",
                    count: { $sum: 1 },
                },
            },
        ]);

        const stats = summaryStats[0];
        const uniqueData = uniqueStats[0];
        const genderBreakdown = {};
        genderStats.forEach((item) => {
            genderBreakdown[item._id] = item.count;
        });

        res.json({
            // Multiple customer count metrics
            customerCounts: {
                totalRecords: totalRecords,
                uniqueByCustomerId: uniqueData?.uniqueCustomersByCustomerId || 0,
            },
            // Use unique customers by customerId as the primary count
            totalCustomers: uniqueData?.uniqueCustomersByCustomerId || 0,
            demographics: {
                age: {
                    average: Math.round((stats?.avgAge || 0) * 10) / 10,
                    min: stats?.minAge || null,
                    max: stats?.maxAge || null,
                },
                birthYear: {
                    average: Math.round(stats?.avgBirthYear || 0),
                    min: stats?.minBirthYear || null,
                    max: stats?.maxBirthYear || null,
                },
                gender: genderBreakdown,
            },
            digitalInterests: await getDigitalInterestStats(),
            devices: await getDeviceStats(),
            locationTypes: await getLocationTypeStats(),
        });
    } catch (error) {
        console.error("❌ Error in /statistics/summary:", error);
        res.status(500).json({ message: "Internal server error" });
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

// Helper functions for additional statistics
async function getDigitalInterestStats() {
    try {
        const result = await Customer.aggregate([
            { $match: { digitalInterest: { $ne: null, $ne: "" } } },
            { $group: { _id: "$digitalInterest", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, interest: "$_id", count: 1 } },
        ]);
        return result;
    } catch (error) {
        console.error("Error getting digital interest stats:", error);
        return [];
    }
}

async function getDeviceStats() {
    try {
        const result = await Customer.aggregate([
            { $match: { device: { $ne: null, $ne: "" } } },
            { $group: { _id: "$device", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, device: "$_id", count: 1 } },
        ]);
        return result;
    } catch (error) {
        console.error("Error getting device stats:", error);
        return [];
    }
}

async function getLocationTypeStats() {
    try {
        const result = await Customer.aggregate([
            { $match: { locationType: { $ne: null, $ne: "" } } },
            { $group: { _id: "$locationType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, locationType: "$_id", count: 1 } },
        ]);
        return result;
    } catch (error) {
        console.error("Error getting location type stats:", error);
        return [];
    }
}

export default router;
