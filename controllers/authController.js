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

    /* -------------------------------------------------------------------- */
    /* 1. Vérifications                                                     */
    /* -------------------------------------------------------------------- */
    if (!email || !password) {
        return next(
            new ErrorResponse("Please provide email and password", 400)
        );
    }

    const user = await UserModel.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
        return next(new ErrorResponse("Invalid credentials", 401));
    }

    if (!user.isEmailVerified) {
        return next(
            new ErrorResponse("Please verify your email before logging in", 403)
        );
    }

    /* -------------------------------------------------------------------- */
    /* 2. Génération du JWT                                                 */
    /* -------------------------------------------------------------------- */
    const token = user.getSignedJwtToken();

    /* -------------------------------------------------------------------- */
    /* 3. Options du cookie  (⚠️ clé de la correction)                      */
    /* -------------------------------------------------------------------- */
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours

        // ➜ localhost (dev) : même protocole HTTP mais ports différents
        //    → Lax autorise l’envoi du cookie lors de fetch/XHR
        // ➜ prod (HTTPS, sous-domaines) : None + Secure
        sameSite: process.env.NODE_ENV === "development" ? "Lax" : "None",
        secure: process.env.NODE_ENV === "production", // doit être true si SameSite=None
    };

    /* -------------------------------------------------------------------- */
    /* 4. Réponse                                                           */
    /* -------------------------------------------------------------------- */
    res.status(200)
        .cookie("token", token, cookieOptions)
        .json({
            success: true,
            message: "Login successful",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                role: user.role,
                photo: user.photo,
                isEmailVerified: user.isEmailVerified,
                isValidated: user.isValidated,
                address: user.address,
                location: user.location,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
});

/**
 * @desc    Get current logged-in user from JWT token in cookie
 * @route   GET /api/v1/auth/me
 * @access  Private (based on cookie token)
 *
 * @examples
 * GET /api/v1/auth/me
 */
exports.getMe = asyncHandler(async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return next(new ErrorResponse("Not authorized - no token", 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UserModel.findById(decoded.id);

        if (!user) {
            return next(new ErrorResponse("User not found", 404));
        }

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                role: user.role,
                photo: user.photo,
                isEmailVerified: user.isEmailVerified,
                isValidated: user.isValidated,
                address: user.address,
                location: user.location,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (err) {
        return next(new ErrorResponse("Not authorized - invalid token", 401));
    }
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
