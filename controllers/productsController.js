const geocoder = require("../utilis/geocoder");
const ProductsModel = require("../modals/ProductsModel");
const ErrorResponse = require("../utilis/errorResponse");
const asyncHandler = require("../middlewares/async");

/**
 * @desc    Get all products with filtering, sorting, selection, and advanced pagination
 * @route   GET /api/v1/products
 * @access  Public
 *
 * @examples
 * GET /api/v1/products
 * GET /api/v1/products?select=name,price
 * GET /api/v1/products?sort=-price
 * GET /api/v1/products?limit=2&page=2
 * GET /api/v1/products?minPrice=10000&maxPrice=50000
 */

exports.getProducts = asyncHandler(async (req, res, next) => {
    // Initialize filter object
    const filter = {};

    // Apply price filtering
    if (req.query.minPrice) {
        filter.price = { ...filter.price, $gte: Number(req.query.minPrice) };
    }

    if (req.query.maxPrice) {
        filter.price = { ...filter.price, $lte: Number(req.query.maxPrice) };
    }

    // Filter by category if provided
    if (req.query.category) {
        filter.category = req.query.category;
    }

    // Start query
    let query = ProductsModel.find(filter);

    // Field selection (e.g. ?select=name,price)
    if (req.query.select) {
        const fields = req.query.select.split(",").join(" ");
        query = query.select(fields);
    }

    // Sorting (e.g. ?sort=-price)
    if (req.query.sort) {
        const sortBy = req.query.sort.split(",").join(" ");
        query = query.sort(sortBy);
    } else {
        query = query.sort("-createdAt"); // Default sort: newest first
    }

    // Pagination variables
    const page = parseInt(req.query.page, 10) || 1; // Default page: 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default limit: 10 per page
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit); // Apply pagination

    // Execute filtered query
    const products = await query;

    // Count all products matching the filters
    const total = await ProductsModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Base URL construction (for frontend navigation)
    const baseUrl = `${req.protocol}://${req.get("host")}${req.baseUrl}${
        req.path
    }`;

    // Build pagination metadata
    const pagination = {
        totalItems: total,
        totalPages: totalPages,
        currentPage: page,
        hasNextPage: endIndex < total,
        hasPrevPage: startIndex > 0,
    };

    // Add page links if needed
    if (pagination.hasNextPage) {
        pagination.nextPageUrl = `${baseUrl}?page=${page + 1}&limit=${limit}`;
    }

    if (pagination.hasPrevPage) {
        pagination.prevPageUrl = `${baseUrl}?page=${page - 1}&limit=${limit}`;
    }

    // Return response
    res.status(200).json({
        success: true,
        count: products.length,
        data: products,
        pagination,
    });
});

// @desc     Get Single Product
// @route    GET api/v1/products/:id
// @access   Public
exports.getProduct = asyncHandler(async (req, res, next) => {
    const product = await ProductsModel.findById(req.params.id);
    if (!product) {
        return next(
            new ErrorResponse(
                `Product not found with id of ${req.params.id}`,
                404
            )
        );
    }
    res.status(200).json({ success: true, data: product });
});

// @desc     Create Product
// @route    Create api/v1/products
// @access   Private
exports.createProduct = asyncHandler(async (req, res, next) => {
    const product = await ProductsModel.create(req.body);
    res.status(200).json({
        success: true,
        data: product,
    });
});

// @desc     Update Product
// @route    Update api/v1/products/:id
// @access   Private
exports.updateProduct = asyncHandler(async (req, res, next) => {
    const product = await ProductsModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            new: true,
        }
    );
    if (!product) {
        return next(
            new ErrorResponse(
                `Product not found with id of ${req.params.id}`,
                404
            )
        );
    }
    res.status(200).json({ succes: true, data: product });
});

// @desc     Delete Product
// @route    Delete api/v1/products/:id
// @access   Private
exports.deleteProduct = asyncHandler(async (req, res, next) => {
    const product = await ProductsModel.findByIdAndDelete(req.params.id);
    if (!product) {
        return next(
            new ErrorResponse(
                `Product not found with id of ${req.params.id}`,
                404
            )
        );
    }
    res.status(200).json({ succes: true, data: {} });
});

// @desc    Find products within a given radius (GPS or location address)
// @route   POST /api/v1/products/radius
// @access  Public
exports.getProductsInRadiusSmart = asyncHandler(async (req, res, next) => {
    const { localisation, distance, location } = req.body;

    // 🔒 Step 1: Validate distance
    if (!distance || isNaN(distance) || distance <= 0 || distance > 100) {
        return next(
            new ErrorResponse(
                "Distance must be a number between 1 and 100 kilometers.",
                400
            )
        );
    }

    let coords;

    // ✅ Step 2: If coordinates are provided (mobile case), use them directly
    if (location && location.coordinates && location.coordinates.length === 2) {
        coords = location.coordinates;
    }

    // 🌍 Step 3: If only address is provided (web case), use geocoder
    else if (
        localisation &&
        localisation.quartier &&
        localisation.city &&
        localisation.country
    ) {
        const fullAddress = `${localisation.quartier}, ${localisation.city}, ${localisation.country}`;
        const result = await geocoder.geocode(fullAddress);

        if (!result || result.length === 0) {
            return next(
                new ErrorResponse("Location not found via geocoding.", 404)
            );
        }

        coords = [result[0].longitude, result[0].latitude];
    }

    // ❌ Step 4: No valid data
    else {
        return next(
            new ErrorResponse(
                "You must provide either GPS coordinates or a full address.",
                400
            )
        );
    }

    // 🌐 Step 5: Convert distance from km to radians (MongoDB expects radians)
    const radius = distance / 6378;
    const [lng, lat] = coords;

    // 🔍 Step 6: Perform geo search with MongoDB $geoWithin
    const products = await ProductsModel.find({
        location: {
            $geoWithin: {
                $centerSphere: [[lng, lat], radius],
            },
        },
    });

    // ✅ Step 7: Send response
    res.status(200).json({
        success: true,
        count: products.length,
        data: products,
    });
});
