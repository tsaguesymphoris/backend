const express = require("express");
const dotenv = require("dotenv");
const logger = require("./middlewares/logger");
const morgan = require("morgan");
const connectDB = require("./config/db");
const colors = require("colors");
const errorHandler = require("./middlewares/error");
const scheduleCleanup = require("./cron/cleanupUnverifiedUsers");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Load env vars
dotenv.config({ path: "./config/config.env" });

// Connect to database
connectDB();

scheduleCleanup();
console.log("✔️ JWT_SECRET:", process.env.JWT_SECRET);

// ROute FIles
const products = require("./routes/products");
const auth = require("./routes/authRoute");

const app = express();
app.use(cookieParser());
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true, // ⬅️ Important pour autoriser les cookies
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

//Body Parser
app.use(express.json());

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

//Mount routers
app.use("/api/v1/products", products);
app.use("/api/v1/auth", auth);
app.use(errorHandler);

const PORT = process.env.PORT;

const server = app.listen(
    PORT,
    console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow
            .bold
    )
);

process.on("unhandledRejection", (err, promise) => {
    console.error(`❌ Error: ${err.message}`.red);
    // Fermer proprement le serveur HTTP
    server.close(() => {
        process.exit(1); // Sortie avec code d'erreur
    });
});
