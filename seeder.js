const fs = require("fs");
const mongoose = require("mongoose");
const colors = require("colors");
const dotenv = require("dotenv");

//Load env vars
dotenv.config({ path: "./config/config.env" });

// Load models
const ProductsModel = require("./modals/ProductsModel");

// Connect to DB
mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
});

// Read JSON files
const products = JSON.parse(
    fs.readFileSync(`${__dirname}/_data/products.json`, "utf-8")
);

//Import into DB
const importData = async () => {
    try {
        await ProductsModel.create(products);
        console.log("Data Imported....".green.inverse);
    } catch (error) {
        console.error(error);
    }
};

// Delete Data
const deleteData = async () => {
    try {
        await ProductsModel.deleteMany();
        console.log("Data Destroyed....".red.inverse);
    } catch (error) {
        console.error(error);
    }
};

if (process.argv[2] === "-i") {
    importData();
} else if (process.argv[2] === "-d") {
    deleteData();
}
