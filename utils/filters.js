/**
 * @desc    Extract filtering and sorting parameters from query
 * @param   {Object} query - req.query
 * @returns {Object} { filter, sort }
 */
module.exports = (query) => {
    const filter = {};

    if (query.minPrice) {
        filter.price = { ...filter.price, $gte: Number(query.minPrice) };
    }

    if (query.maxPrice) {
        filter.price = { ...filter.price, $lte: Number(query.maxPrice) };
    }

    if (query.category) {
        filter.category = query.category;
    }

    // Default sort
    const sort = query.sort ? query.sort.split(",").join(" ") : "-createdAt";

    return { filter, sort };
};
