const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
        },
        name: {
            type: String,
            required: [true, "Please add a product name"],
            trim: true,
            maxlength: [100, "Name can not be more than 100 characters"],
        },
        description: {
            type: String,
            required: [true, "Please add a description"],
            maxlength: [500, "Description can not be more than 500 characters"],
        },
        price: {
            type: Number,
            required: [true, "Please add a price"],
            min: [0, "Price must be at least 0"],
        },
        category: {
            type: String,
            required: [true, "Please specify a category"],
            enum: [
                "Electronics",
                "Fashion",
                "Food",
                "Books",
                "Home",
                "Toys",
                "Health",
                "Other",
            ],
            default: "Other",
        },
        condition: {
            type: String,
            enum: ["New", "Used"],
            default: "Used",
        },
        stock: {
            type: Number,
            default: 1,
            min: [0, "Stock cannot be negative"],
        },
        photos: {
            type: [String],
            required: [true, "Please upload at least one photo"],
            validate: {
                validator: (arr) =>
                    Array.isArray(arr) && arr.length >= 1 && arr.length <= 4,
                message: "You must upload between 1 and 4 photos",
            },
        },
        isAvailable: {
            type: Boolean,
            default: true,
        },
        deliveryOptions: {
            type: [String],
            enum: ["Pickup", "HomeDelivery", "Shipping"],
            default: ["Pickup"],
        },
        soldAt: {
            type: Date,
            default: null,
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                required: true,
                default: "Point",
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
        },
        localisation: {
            quartier: {
                type: String,
                required: [true, "Le quartier est requis"],
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
                    "Autre",
                ],
            },
            address: {
                type: String,
                default: "",
            },
            city: {
                type: String,
                enum: ["Yaoundé", "Douala"],
                required: [true, "La ville est requise"],
            },
            country: {
                type: String,
                default: "Cameroun",
            },
        },
    },
    {
        timestamps: true,
    }
);

// Index géospatial pour recherches par proximité
ProductSchema.index({ location: "2dsphere" });
// Un même utilisateur ne peut pas avoir deux produits avec le même nom
ProductSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Product", ProductSchema);
