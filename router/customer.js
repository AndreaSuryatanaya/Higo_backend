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

// GET /customers/statistics/age-groups
router.get("/statistics/age-groups", async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        const result = await Customer.aggregate([
            {
                $addFields: {
                    age: { $subtract: [currentYear, "$birthYear"] },
                },
            },
            {
                $group: {
                    _id: {
                        $switch: {
                            branches: [
                                { case: { $lt: ["$age", 25] }, then: "18-24" },
                                { case: { $lt: ["$age", 35] }, then: "25-34" },
                                { case: { $lt: ["$age", 45] }, then: "35-44" },
                                { case: { $lt: ["$age", 55] }, then: "45-54" },
                                { case: { $lt: ["$age", 65] }, then: "55-64" },
                            ],
                            default: "65+",
                        },
                    },
                    count: { $sum: 1 },
                    avgAge: { $avg: "$age" },
                    avgBirthYear: { $avg: "$birthYear" },
                },
            },
            {
                $sort: { _id: 1 },
            },
            {
                $project: {
                    _id: 0,
                    ageGroup: "$_id",
                    count: 1,
                    avgAge: { $round: ["$avgAge", 1] },
                    avgBirthYear: { $round: ["$avgBirthYear", 0] },
                },
            },
        ]);

        res.json(result);
    } catch (error) {
        console.error("❌ Error in /statistics/age-groups:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /customers/statistics/digital-interests
router.get("/statistics/digital-interests", async (req, res) => {
    try {
        const result = await Customer.aggregate([
            { $match: { digitalInterest: { $ne: null, $ne: "" } } },
            {
                $group: {
                    _id: "$digitalInterest",
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
            {
                $project: {
                    _id: 0,
                    interest: "$_id",
                    count: 1,
                    percentage: {
                        $round: [{ $multiply: [{ $divide: ["$count", { $sum: "$count" }] }, 100] }, 2],
                    },
                },
            },
        ]);

        res.json(result);
    } catch (error) {
        console.error("❌ Error in /statistics/digital-interests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /customers/statistics/devices
router.get("/statistics/devices", async (req, res) => {
    try {
        const result = await Customer.aggregate([
            { $match: { device: { $ne: null, $ne: "" } } },
            {
                $group: {
                    _id: "$device",
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
            {
                $project: {
                    _id: 0,
                    device: "$_id",
                    count: 1,
                },
            },
        ]);

        res.json(result);
    } catch (error) {
        console.error("❌ Error in /statistics/devices:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /customers/statistics/summary
router.get("/statistics/summary", async (req, res) => {
    try {
        const totalCustomers = await Customer.countDocuments();

        // Calculate age from birthYear
        const currentYear = new Date().getFullYear();

        const summaryStats = await Customer.aggregate([
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
            {
                $group: {
                    _id: "$gender",
                    count: { $sum: 1 },
                },
            },
        ]);

        const stats = summaryStats[0];
        const genderBreakdown = {};
        genderStats.forEach((item) => {
            genderBreakdown[item._id] = item.count;
        });

        res.json({
            totalCustomers,
            demographics: {
                age: {
                    average: Math.round((stats.avgAge || 0) * 10) / 10,
                    min: stats.minAge,
                    max: stats.maxAge,
                },
                birthYear: {
                    average: Math.round(stats.avgBirthYear || 0),
                    min: stats.minBirthYear,
                    max: stats.maxBirthYear,
                },
                gender: genderBreakdown,
            },
            // Note: This dataset doesn't have financial data (income/spending_score)
            // Available fields: customerId, locationName, date, loginHour, fullName,
            // birthYear, gender, email, phone, device, digitalInterest, locationType
            digitalInterests: await getDigitalInterestStats(),
            devices: await getDeviceStats(),
            locationTypes: await getLocationTypeStats(),
        });
    } catch (error) {
        console.error("❌ Error in /statistics/summary:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /customers/statistics/locations
router.get("/statistics/locations", async (req, res) => {
    try {
        const result = await Customer.aggregate([
            { $match: { locationType: { $ne: null, $ne: "" } } },
            {
                $group: {
                    _id: "$locationType",
                    count: { $sum: 1 },
                    locations: { $addToSet: "$locationName" },
                },
            },
            {
                $sort: { count: -1 },
            },
            {
                $project: {
                    _id: 0,
                    locationType: "$_id",
                    count: 1,
                    uniqueLocations: { $size: "$locations" },
                },
            },
        ]);

        res.json(result);
    } catch (error) {
        console.error("❌ Error in /statistics/locations:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /customers/statistics/login-hours
router.get("/statistics/login-hours", async (req, res) => {
    try {
        const result = await Customer.aggregate([
            { $match: { loginHour: { $ne: null, $ne: "" } } },
            {
                $group: {
                    _id: "$loginHour",
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { _id: 1 },
            },
            {
                $project: {
                    _id: 0,
                    hour: "$_id",
                    count: 1,
                },
            },
        ]);

        res.json(result);
    } catch (error) {
        console.error("❌ Error in /statistics/login-hours:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /customers/statistics/correlation
router.get("/statistics/correlation", async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        const data = await Customer.find({}, "birthYear gender device digitalInterest locationType").lean();

        // Prepare data for analysis - age vs different categorical variables
        const analysisData = data
            .filter((customer) => customer.birthYear && customer.gender)
            .map((customer) => ({
                age: currentYear - customer.birthYear,
                gender: customer.gender,
                device: customer.device,
                digitalInterest: customer.digitalInterest,
                locationType: customer.locationType,
            }));

        // Age distribution by gender
        const ageByGender = analysisData.reduce((acc, customer) => {
            if (!acc[customer.gender]) {
                acc[customer.gender] = [];
            }
            acc[customer.gender].push(customer.age);
            return acc;
        }, {});

        // Calculate average age by gender
        const avgAgeByGender = {};
        Object.keys(ageByGender).forEach((gender) => {
            const ages = ageByGender[gender];
            avgAgeByGender[gender] = Math.round((ages.reduce((sum, age) => sum + age, 0) / ages.length) * 10) / 10;
        });

        res.json({
            totalAnalyzed: analysisData.length,
            ageByGender: avgAgeByGender,
            scatterData: analysisData.slice(0, 1000), // Limit for performance
            summary: {
                avgAge: Math.round((analysisData.reduce((sum, c) => sum + c.age, 0) / analysisData.length) * 10) / 10,
                genderDistribution: Object.keys(ageByGender).reduce((acc, gender) => {
                    acc[gender] = ageByGender[gender].length;
                    return acc;
                }, {}),
            },
        });
    } catch (error) {
        console.error("❌ Error in /statistics/correlation:", error);
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
