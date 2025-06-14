const NodeGeocoder = require("node-geocoder");

const options = {
    provider: process.env.GEOCODER_PROVIDER || "openstreetmap", // fallback
    httpAdapter: "https", // ❗️ corriger "htpps" → "https"
    apiKey: process.env.GEOCODER_API_KEY || null, // utilisé si provider = google ou locationiq
    formatter: null,
};

const geocoder = NodeGeocoder(options);

module.exports = geocoder;
