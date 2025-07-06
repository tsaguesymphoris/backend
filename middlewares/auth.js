const jwt = require("jsonwebtoken");
const asyncHandler = require("./async");
const ErrorResponse = require("../utils/errorResponse");
const UserModel = require("../models/UserModel");

/**
 * @desc    Middleware to protect routes using JWT in cookies
 */
exports.protect = asyncHandler(async (req, res, next) => {
    let token;

    // Ajout: support header ET cookie pour le token
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return next(new ErrorResponse("Unauthorized access", 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await UserModel.findById(decoded.id);
        if (!req.user) {
            return next(new ErrorResponse("User not found", 404));
        }
        next();
    } catch (err) {
        console.error("JWT verification error:", err);
        return next(new ErrorResponse("Unauthorized access", 401));
    }
});