const ProductsModel = require("../modals/ProductsModel");
const ErrorResponse = require("../utilis/errorResponse");

// @desc     Get All Products
// @route    GET api/v1/products
// @access   Public
exports.getProducts = async (req, res, next) => {
    try {
        const products = await ProductsModel.find();
        res.status(200).json({
            success: true,
            count: products.length,
            data: products,
        });
    } catch (error) {
        next(error);
    }
};

// @desc     Get Single Product
// @route    GET api/v1/products/:id
// @access   Public
exports.getProduct = async (req, res, next) => {
    try {
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
    } catch (error) {
        next(error);
    }
};

// @desc     Create Product
// @route    Create api/v1/products
// @access   Private
exports.createProduct = async (req, res, next) => {
    try {
        const product = await ProductsModel.create(req.body);
        res.status(200).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

// @desc     Update Product
// @route    Update api/v1/products/:id
// @access   Private
exports.updateProduct = async (req, res, next) => {
    try {
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
    } catch (error) {
        next(error);
    }
};

// @desc     Delete Product
// @route    Delete api/v1/products/:id
// @access   Private
exports.deleteProduct = async (req, res, next) => {
    try {
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
    } catch (error) {
        next(error);
    }
};
