const express = require("express");
const router = express.Router();

const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductsInRadiusSmart,
} = require("../controllers/productsController");

router.route("/").get(getProducts).post(createProduct);

router.route("/radius").post(getProductsInRadiusSmart);

router.route("/:id").get(getProduct).put(updateProduct).delete(deleteProduct);

module.exports = router;
