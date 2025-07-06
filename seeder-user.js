const fs = require("fs");
const mongoose = require("mongoose");
const colors = require("colors");
const dotenv = require("dotenv");

// Load env vars
dotenv.config({ path: "./config/config.env" });

// Load User model
const UserModel = require("./models/UserModel");

// Connect to DB
mongoose.connect(process.env.MONGO_URL, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
});

// Read JSON users file
const users = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/users.json`, "utf-8")
);

// Import into DB
const importData = async () => {
  try {
    await UserModel.create(users);
    console.log("Users Imported....".green.inverse);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

// Delete Data
const deleteData = async () => {
  try {
    await UserModel.deleteMany();
    console.log("Users Destroyed....".red.inverse);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

if (process.argv[2] === "-i") {
  importData();
} else if (process.argv[2] === "-d") {
  deleteData();
}