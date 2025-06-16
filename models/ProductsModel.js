const mongoose = require("mongoose");
const geocoder = require("../utils/geocoder");
const { type } = require("os");

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
                "Furniture",
                "Energy",
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
                    "Emana",
                    "Essos",
                    "Mvog-Mbi",
                    "Biyem-Assi",
                    "Nlongkak",
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

ProductSchema.pre("save", async function (next) {
    // Si coordonnées déjà présentes (cas mobile), on ne géocode pas
    if (
        this.location &&
        this.location.coordinates &&
        this.location.coordinates.length === 2
    ) {
        return next();
    }

    // Sinon → cas web : géocoder à partir de quartier + ville + pays
    const { quartier, city, country } = this.localisation;
    const fullAddress = `${quartier}, ${city}, ${country}`;
    const loc = await geocoder.geocode(fullAddress);

    if (!loc || loc.length === 0) {
        return next(new Error("Adresse introuvable pour géocodage"));
    }

    this.location = {
        type: "Point",
        coordinates: [loc[0].longitude, loc[0].latitude],
        formattedAddress: loc[0].formattedAddress,
    };

    next();
});

module.exports = mongoose.model("Product", ProductSchema);
