const UserModel = require("../models/UserModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middlewares/async");
const sendTokenResponse = require("../utils/sendTokenResponse"); // utilitaire pour gérer le JWT
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

/**
 * @desc    Register a new user and send email verification link
 * @route   POST /api/v1/auth/register
 * @access  Public
 *
 * @examples
 * POST /api/v1/auth/register
 * Body: {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "phone": "699123456",
 *   "password": "Secure@2024",
 *   "role": "provider",
 *   "profession": "plumber",
 *   "gender": "male",
 *   "photo": "https://cdn.com/avatar.jpg",
 *   "address": {
 *     "quartier": "Mendong",
 *     "city": "Yaoundé",
 *     "country": "Cameroun"
 *   },
 *   "location": {
 *     "coordinates": [11.51, 3.87]
 *   }
 * }
 */
exports.register = asyncHandler(async (req, res, next) => {
    // 1. Create the user
    const user = await UserModel.create(req.body);

    // 2. Generate email verification token
    const emailToken = crypto.randomBytes(20).toString("hex");
    const emailTokenHash = crypto
        .createHash("sha256")
        .update(emailToken)
        .digest("hex");

    user.emailVerificationToken = emailTokenHash;
    // expires in 24h
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
    //user.emailVerificationExpire = Date.now() + 2 * 60 * 1000;

    console.log(emailToken);

    await user.save({ validateBeforeSave: false });

    // 3. Build verification URL
    const verifyUrl = `${req.protocol}://${req.get("host")}/api/v1/auth/verifyemail/${emailToken}`;

    // 4. Send verification email
    try {
        await sendEmail({
            to: user.email,
            subject: "Confirm your email address",
            name: user.name,
            link: verifyUrl,
        });

        res.status(200).json({
            success: true,
            message:
                "Account created. Please check your email to verify your account.",
        });
    } catch (err) {
        // Reset email verification token in case of failure
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save({ validateBeforeSave: false });

        console.error(err);
        return next(
            new ErrorResponse("Failed to send verification email", 500)
        );
    }
});
/**
 * @desc    Verify user email using token
 * @route   GET /api/v1/auth/verifyemail/:token
 * @access  Public
 *
 * @examples
 * GET /api/v1/auth/verifyemail/asdh23j23...
 */
exports.verifyEmail = asyncHandler(async (req, res, next) => {
    // 1. Hash the token to compare with DB
    const tokenHash = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    // 2. Find user with valid token and expiration
    const user = await UserModel.findOne({
        emailVerificationToken: tokenHash,
        emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
        return next(
            new ErrorResponse("Invalid or expired verification token", 400)
        );
    }

    // 3. Mark user as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        message:
            "Your email has been successfully verified. You can now log in.",
    });
});

/**
 * @desc    Log in user and return JWT token in cookie
 * @route   POST /api/v1/auth/login
 * @access  Public
 *
 * @examples
 * POST /api/v1/auth/login
 * Body: {
 *   "email": "john@example.com",
 *   "password": "Secure@2024"
 * }
 */
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
        return next(
            new ErrorResponse("Please provide email and password", 400)
        );
    }

    // 2. Find user by email
    const user = await UserModel.findOne({ email }).select("+password");

    if (!user) {
        return next(new ErrorResponse("Invalid credentials", 401));
    }

    // 3. Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        return next(new ErrorResponse("Invalid credentials", 401));
    }

    // 4. Ensure email is verified
    if (!user.isEmailVerified) {
        return next(
            new ErrorResponse("Please verify your email before logging in", 403)
        );
    }

    // 5. Generate and send token in cookie
    const token = user.getSignedJwtToken();

    const cookieOptions = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        httpOnly: true, // prevents JS access (XSS protection)
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
    };

    res.status(200).cookie("token", token, cookieOptions).json({
        success: true,
        message: "Login successful",
    });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 *
 * @examples
 * GET /api/v1/auth/me
 * Headers: Authorization: Bearer <token>
 */
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await UserModel.findById(req.user.id);
    res.status(200).json({
        success: true,
        data: user,
    });
});

/**
 * @desc    Forgot password - generate reset token
 * @route   POST /api/v1/auth/forgotpassword
 * @access  Public
 *
 * @examples
 * POST /api/v1/auth/forgotpassword
 * Body: { "email": "john@example.com" }
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const user = await UserModel.findOne({ email: req.body.email });

    if (!user) {
        return next(new ErrorResponse("No user found with this email", 404));
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // TODO: send email or SMS with the resetToken (add when integration ready)

    res.status(200).json({
        success: true,
        data: `Reset token generated. [Use it in /resetpassword/${resetToken}]`,
    });
});

/**
 * @desc    Reset password
 * @route   PUT /api/v1/auth/resetpassword/:resettoken
 * @access  Public
 *
 * @examples
 * PUT /api/v1/auth/resetpassword/as23sdg3...
 * Body: { "password": "NewSecure@2024" }
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const crypto = require("crypto");

    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.resettoken)
        .digest("hex");

    const user = await UserModel.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        return next(new ErrorResponse("Invalid or expired token", 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
});
