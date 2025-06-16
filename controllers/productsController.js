const geocoder = require("../utils/geocoder");
const ProductsModel = require("../models/ProductsModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middlewares/async");
const filters = require("../utils/filters");
const buildPagination = require("../utils/pagination");

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
    const { filter, sort } = filters(req.query);

    let mongooseQuery = ProductsModel.find(filter).sort(sort);

    // Selection de champs
    if (req.query.select) {
        const fields = req.query.select.split(",").join(" ");
        mongooseQuery = mongooseQuery.select(fields);
    }

    const { query, pagination } = await buildPagination(
        req,
        mongooseQuery,
        ProductsModel,
        filter
    );

    const products = await query;

    res.status(200).json({
        success: true,
        count: products.length,
        data: products,
        pagination,
    });
});

/**
 * @desc    Get Single Product by ID
 * @route   GET /api/v1/products/:id
 * @access  Public
 *
 * @examples
 * GET /api/v1/products/664d3a...id
 */
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

/**
 * @desc    Create New Product
 * @route   POST /api/v1/products
 * @access  Private
 *
 * @examples
 * POST /api/v1/products
 * Body: { "name": "Chaise", "price": 45000, "category": "mobilier" }
 */
exports.createProduct = asyncHandler(async (req, res, next) => {
    const product = await ProductsModel.create(req.body);
    res.status(201).json({ success: true, data: product });
});

/**
 * @desc    Update Product by ID
 * @route   PUT /api/v1/products/:id
 * @access  Private
 *
 * @examples
 * PUT /api/v1/products/664d3a...id
 * Body: { "price": 39000 }
 */
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

    res.status(200).json({ success: true, data: product });
});

/**
 * @desc    Delete Product by ID
 * @route   DELETE /api/v1/products/:id
 * @access  Private
 *
 * @examples
 * DELETE /api/v1/products/664d3a...id
 */
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
    res.status(200).json({ success: true, data: {} });
});

/**
 * @desc    Find products within a given radius (using coordinates or address)
 * @route   POST /api/v1/products/radius
 * @access  Public
 *
 * @examples
 * POST /api/v1/products/radius
 * Body: {
 *   "location": { "coordinates": [11.46855, 3.83656] },
 *   "distance": 5
 * }
 * OR
 * Body: {
 *   "localisation": {
 *     "quartier": "Mendong",
 *     "city": "Yaoundé",
 *     "country": "Cameroun"
 *   },
 *   "distance": 5
 * }
 */
exports.getProductsInRadiusSmart = asyncHandler(async (req, res, next) => {
    const { localisation, distance, location } = req.body;

    if (!distance || isNaN(distance) || distance <= 0 || distance > 100) {
        return next(
            new ErrorResponse(
                "Distance must be a number between 1 and 100 kilometers.",
                400
            )
        );
    }

    let coords;

    if (location?.coordinates?.length === 2) {
        coords = location.coordinates;
    } else if (
        localisation?.quartier &&
        localisation?.city &&
        localisation?.country
    ) {
        const fullAddress = `${localisation.quartier}, ${localisation.city}, ${localisation.country}`;
        const result = await geocoder.geocode(fullAddress);
        if (!result.length) {
            return next(
                new ErrorResponse("Location not found via geocoding.", 404)
            );
        }
        coords = [result[0].longitude, result[0].latitude];
    } else {
        return next(
            new ErrorResponse(
                "You must provide either GPS coordinates or a full address.",
                400
            )
        );
    }

    const radius = distance / 6378;
    const [lng, lat] = coords;

    const products = await ProductsModel.find({
        location: {
            $geoWithin: {
                $centerSphere: [[lng, lat], radius],
            },
        },
    }).lean();

    res.status(200).json({
        success: true,
        count: products.length,
        data: products,
    });
});
