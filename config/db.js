const mongoose = require("mongoose");

const connectDB = async () => {
    const conn = await mongoose.connect(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
    });

    console.log(
        `✅ MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold
    );
};

module.exports = connectDB;
