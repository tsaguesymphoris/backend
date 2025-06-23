const jwt = require("jsonwebtoken");
const asyncHandler = require("./async");
const ErrorResponse = require("../utils/errorResponse");
const UserModel = require("../models/UserModel");

/**
 * @desc    Middleware to protect routes using JWT in cookies
 */
exports.protect = asyncHandler(async (req, res, next) => {
    let token = req.cookies.token;
    console.log(token);

    if (!token) {
        return next(new ErrorResponse("Not authorized - no token", 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await UserModel.findById(decoded.id);
        if (!req.user) {
            return next(new ErrorResponse("User not found", 404));
        }
        next();
    } catch (err) {
        return next(new ErrorResponse("Not authorized - invalid token", 401));
    }
});
