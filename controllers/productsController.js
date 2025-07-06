const geocoder = require("../utils/geocoder");
const ProductsModel = require("../models/ProductsModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middlewares/async");
const filters = require("../utils/filters");
const buildPagination = require("../utils/pagination");
const path = require("path");
const fs = require("fs");

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
    // 1. Associer l'utilisateur (si req.user existe)
    req.body.user = req.user ? req.user._id : req.body.user || null;

    console.log("Creating product with user:", req.body.user);

    // 2. Parser les champs complexes si envoyés sous forme de chaîne (form-data)
    if (typeof req.body.location === "string") {
        try {
            req.body.location = JSON.parse(req.body.location);
        } catch (e) {
            return next(new ErrorResponse("Invalid JSON format for 'location' field.", 400));
        }
    }
    if (typeof req.body.localisation === "string") {
        try { req.body.localisation = JSON.parse(req.body.localisation); } catch (e) {}
    }
    if (typeof req.body.deliveryOptions === "string") {
        try {
            req.body.deliveryOptions = JSON.parse(req.body.deliveryOptions);
        } catch (e) {
            return next(new ErrorResponse("Invalid JSON format for 'deliveryOptions' field.", 400));
        }  
    }

    // 3. Gérer l'upload de photos
    let files = req.files && req.files.file ? req.files.file : [];
    if (files && !Array.isArray(files)) files = [files];
    if (files.length < 1 || files.length > 4) {
        return next(new ErrorResponse("Vous devez uploader entre 1 et 4 images", 400));
    }

    const uploadDir = process.env.FILE_UPLOAD_PATH || "./public/uploads";
    const savedFilenames = [];

    for (const file of files) {
        // Vérifier que c'est bien une image
        if (!file.mimetype || !file.mimetype.startsWith("image")) {
            return next(new ErrorResponse("Seuls les fichiers images sont autorisés", 400));
        }
        // Vérifier la taille
        if (process.env.MAX_FILE_UPLOAD && file.size > process.env.MAX_FILE_UPLOAD) {
            return next(
                new ErrorResponse(
                    `La taille du fichier dépasse la limite de ${process.env.MAX_FILE_UPLOAD / 1000000}MB`,
                    400
                )
            );
        }
        // Créer un nom unique
        const fileExt = path.extname(file.name);
        const filename = `product_${Date.now()}_${Math.floor(Math.random()*1000)}${fileExt}`;
        const uploadPath = path.join(uploadDir, filename);

        // S'assurer que le dossier existe
        const dir = path.dirname(uploadPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Sauvegarder le fichier
        await file.mv(uploadPath);

        savedFilenames.push(filename);
    }

    req.body.photos = savedFilenames;

    // 4. Validation "location OU localisation"
    const loc = req.body.location;
    const localis = req.body.localisation;
    const hasLocation = loc && loc.coordinates && Array.isArray(loc.coordinates) && loc.coordinates.length === 2;
    const hasLocalisation = localis &&
        localis.quartier && localis.city && localis.country;

    if (!hasLocation && !hasLocalisation) {
        return next(new ErrorResponse(
            "Vous devez fournir soit 'location' (avec coordonnées), soit 'localisation' (quartier, ville, pays).",
            400
        ));
    }

    // 5. (Optionnel) Si location absent et localisation présent, géocoder ici ou laisser le pre('save') du modèle faire le boulot

    // 6. Créer le produit
    console.log("Creating product with data:", req.body);
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

/**
 * @desc    upload product image
 * @route   PUT /api/v1/products/:id/image
 * @access  Private
 *
 * @examples
 * DELETE /api/v1/products/664d3a...id
 */
exports.productPhotoUpload = asyncHandler(async (req, res, next) => {
    // 1. Récupérer le produit
    const product = await ProductsModel.findById(req.params.id);
    if (!product) {
        return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    // 2. Vérifier la présence du fichier
    if (!req.files || !req.files.file) {
        return next(new ErrorResponse("No image file uploaded", 400));
    }
    let files = req.files.file;

    // 3. Toujours travailler avec un tableau
    if (!Array.isArray(files)) {
        files = [files];
    }

    // 4. Limiter à 4 photos max (existantes + nouvelles)
    if (product.photos && product.photos.length + files.length > 4) {
        return next(new ErrorResponse("Maximum 4 photos allowed per product", 400));
    }

    // 5. Pour chaque fichier, vérif & upload
    const uploadDir = process.env.FILE_UPLOAD_PATH || "./public/uploads";
    const savedFilenames = [];

    for (const file of files) {
        // Vérifier que c'est bien une image
        if (!file.mimetype || !file.mimetype.startsWith("image")) {
            return next(new ErrorResponse("Please upload only image files", 400));
        }
        // Vérifier la taille
        if (file.size > process.env.MAX_FILE_UPLOAD) {
            return next(
                new ErrorResponse(
                    `File size exceeds the limit of ${process.env.MAX_FILE_UPLOAD / 1000000}MB`,
                    400
                )
            );
        }

        // Créer le nom de fichier unique et chemin d'upload
        const fileExt = path.extname(file.name);
        const filename = `product_${product._id}_${Date.now()}_${Math.floor(Math.random()*1000)}${fileExt}`;
        const uploadPath = path.join(uploadDir, filename);

        // S'assurer que le dossier existe
        const dir = path.dirname(uploadPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Sauvegarder le fichier
        await file.mv(uploadPath);

        // Stocke le nom du fichier pour l'ajouter au produit
        savedFilenames.push(filename);
    }

    // 6. Ajouter les nouvelles photos au tableau
    if (!product.photos) {
        product.photos = [];
    }
    product.photos.push(...savedFilenames);
    await product.save();

    // 7. Répondre avec le tableau mis à jour
    res.status(200).json({
        success: true,
        data: product.photos,
    });
});