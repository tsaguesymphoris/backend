const express = require("express");
const { getUsers } = require("../controllers/authController");

const router = express.Router();

// Ajoute la route GET /api/v1/users
router.get("/", getUsers);

module.exports = router;