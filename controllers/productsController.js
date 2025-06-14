const ProductsModel = require("../modals/ProductsModel");
const ErrorResponse = require("../utilis/errorResponse");
const asyncHandler = require("../middlewares/async");

// @desc     Get All Products
// @route    GET api/v1/products
// @access   Public
exports.getProducts = asyncHandler(async (req, res, next) => {
    const products = await ProductsModel.find();
    res.status(200).json({
        success: true,
        count: products.length,
        data: products,
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
