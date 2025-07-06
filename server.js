const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const colors = require("colors");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("mongo-sanitize");
const helmet = require("helmet");
const path = require("path");
const sanitizeHtml = require("sanitize-html");

// Custom middlewares
const logger = require("./middlewares/logger");
const errorHandler = require("./middlewares/error");
const scheduleCleanup = require("./cron/cleanupUnverifiedUsers");

// Load environment variables
dotenv.config({ path: "./config/config.env" });

// DB connection
const connectDB = require("./config/db");
connectDB();

// Start cron jobs
scheduleCleanup();

const app = express();

// ----------------- GLOBAL MIDDLEWARES -----------------

// Enable CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Set security HTTP headers (protection XSS, clickjacking, etc)
app.use(helmet());

// Parse JSON bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// Protection NoSQL injection avec mongo-sanitize (remplace express-mongo-sanitize)
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize(req.body);
  if (req.query) req.query = mongoSanitize(req.query);
  if (req.params) req.params = mongoSanitize(req.params);
  next();
});

// File uploads (doit être AVANT la sanitation HTML)
app.use(fileUpload());

// Middleware pour nettoyer tous les champs string des balises HTML/JS dangereuses
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === "string") {
        req.body[key] = sanitizeHtml(req.body[key], {
          allowedTags: [], // aucun tag autorisé
          allowedAttributes: {}
        });
      }
    }
  }
  next();
});

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// ----------------- ROUTES -----------------

// Import routes
const products = require("./routes/products");
const auth = require("./routes/authRoute");
const users = require("./routes/userRouter");

// Use routes
app.use("/api/v1/products", products);
app.use("/api/v1/auth", auth);
app.use("/api/v1/users", users);

// ----------------- ERROR HANDLING -----------------

app.use(errorHandler);

// ----------------- SERVER START -----------------

const PORT = process.env.PORT || 5002;
const server = app.listen(
  PORT,
  () => {
    console.log(
      `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
    );
  }
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error(`❌ Error: ${err.message}`.red);
  server.close(() => {
    process.exit(1);
  });
});