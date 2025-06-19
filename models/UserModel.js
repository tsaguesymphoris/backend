const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const geocoder = require("../utils/geocoder");

const UserSchema = new mongoose.Schema(
    {
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: [true, "Please specify your gender"],
        },
        name: {
            type: String,
            required: [true, "Please enter your name"],
        },
        email: {
            type: String,
            required: [true, "Please enter an email address"],
            unique: true,
            lowercase: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Please provide a valid email address",
            ],
        },
        phone: {
            type: String,
            required: [true, "Please enter a phone number"],
            unique: true,
            match: [/^6[579][0-9]{7}$/, "Invalid Cameroon phone number format"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 8,
            select: false,
            match: [
                /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/,
                "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
            ],
        },
        role: {
            type: String,
            enum: ["client", "provider", "admin"],
            default: "client",
        },
        profession: {
            type: String,
            enum: [
                "plumber",
                "electrician",
                "hairdresser",
                "mechanic",
                "maid",
                "painter",
                "carpenter",
                "other",
            ],
            required: function () {
                return this.role === "provider";
            },
        },
        isValidated: {
            type: Boolean,
            default: function () {
                return this.role !== "provider";
            }, // Only providers need admin approval
        },
        momoNumber: {
            type: String,
            match: [/^6[579][0-9]{7}$/, "Invalid Orange Money/MTN number"],
        },
        photo: {
            type: String,
            required: [true, "Please upload a profile photo"],
        },
        address: {
            quartier: {
                type: String,
                enum: [
                    "Mendong",
                    "Odja",
                    "Nsam",
                    "Etoudi",
                    "Bastos",
                    "Bonamoussadi",
                    "Akwa",
                    "Bonanjo",
                    "Makepe",
                    "Essos",
                    "Mvog-Mbi",
                    "Emana",
                    "Nlongkak",
                    "Biyem-Assi",
                    "Autre",
                ],
            },
            city: {
                type: String,
                enum: ["Yaoundé", "Douala"],
                default: "Yaoundé",
            },
            country: {
                type: String,
                default: "Cameroun",
            },
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                index: "2dsphere",
            },
            formattedAddress: String,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        emailVerificationToken: String,
        emailVerificationExpire: Date,
        resetPasswordToken: String,
        resetPasswordExpire: Date,
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// 🔐 Hash password before saving
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// 📍 Generate GPS coordinates only if not provided (mobile sends GPS, web uses geocoder)
UserSchema.pre("save", async function (next) {
    // If coordinates are already present (mobile), skip geocoding
    if (
        this.location &&
        this.location.coordinates &&
        this.location.coordinates.length === 2
    ) {
        return next();
    }

    const { quartier, city, country } = this.address || {};
    if (!quartier || !city || !country) return next();

    const fullAddress = `${quartier}, ${city}, ${country}`;
    const loc = await geocoder.geocode(fullAddress);

    if (!loc || loc.length === 0) {
        return next(new Error("Geocoding failed. Address not found."));
    }

    this.location = {
        type: "Point",
        coordinates: [loc[0].longitude, loc[0].latitude],
        formattedAddress: loc[0].formattedAddress,
    };

    next();
});

// 🔑 Generate signed JWT token
UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};

// 🔐 Compare entered password to hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// 🔐 Generate and hash reset password token (valid for 15 minutes)
UserSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");

    this.resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    return resetToken;
};

module.exports = mongoose.model("User", UserSchema);
