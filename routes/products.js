const express = require("express");
const router = express.Router();
const {protect} = require("../middlewares/auth");

const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductsInRadiusSmart,
    productPhotoUpload
} = require("../controllers/productsController");

router.route("/").get(getProducts).post(protect, createProduct);

router.route("/radius").post(getProductsInRadiusSmart);

router.route("/:id").get(getProduct).put(protect, updateProduct).delete(protect, deleteProduct);
router.route("/:id/photo").put(productPhotoUpload);

module.exports = router;
