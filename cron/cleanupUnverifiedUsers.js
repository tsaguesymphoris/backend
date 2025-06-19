// 📁 BACKEND/cron/cleanupUnverifiedUsers.js
const cron = require("node-cron");
const User = require("../models/UserModel");

// 💡 Cleanup function
const cleanup = async () => {
    console.log("\uD83E\uDEF9 Running cleanup for unverified users...");

    try {
        const result = await User.deleteMany({
            isEmailVerified: false,
            emailVerificationExpire: { $lt: new Date() },
        });

        console.log(`\u2705 Deleted ${result.deletedCount} unverified users.`);
    } catch (error) {
        console.error("\u274C Cleanup error:", error.message);
    }
};

// ⏰ Schedule the cleanup to run daily at 3:00 AM
const scheduleCleanup = () => {
    const cronExpression =
        //process.env.NODE_ENV === "development" ? "*/5 * * * *" : "0 3 * * *";
        process.env.NODE_ENV === "development" ? "0 3 * * *" : "0 3 * * *";
    cron.schedule(cronExpression, cleanup);
};

module.exports = scheduleCleanup;
