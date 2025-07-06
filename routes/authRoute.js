const express = require("express");
const {
    register,
    login,
    verifyEmail,
    getMe,
    logout, 
} = require("../controllers/authController");

const { protect } = require("../middlewares/auth"); // ✅ importe le middleware

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verifyEmail/:token", verifyEmail);
router.get("/logout", logout);

// ✅ protège la route avec le middleware
router.get("/me", protect, getMe);

module.exports = router;
