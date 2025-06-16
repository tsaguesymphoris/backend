/**
 * @desc    Apply pagination on a query and return metadata
 * @param   {Object} req - Express request
 * @param   {Object} query - Mongoose query object
 * @param   {Object} model - Mongoose model
 * @param   {Object} filter - Filter object (for counting)
 * @returns {Object} { query, pagination }
 */
module.exports = async (req, query, model, filter) => {
    const page = parseInt(req.query.page, 10) || 1;
    const maxLimit = 50;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, maxLimit);
    const skip = (page - 1) * limit;

    const paginatedQuery = query.skip(skip).limit(limit).lean();

    const total = await model.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const baseUrl = `${req.protocol}://${req.get("host")}${req.baseUrl}${
        req.path
    }`;

    const pagination = {
        totalItems: total,
        totalPages,
        currentPage: page,
        hasNextPage: endIndex < total,
        hasPrevPage: startIndex > 0,
    };

    if (pagination.hasNextPage) {
        pagination.nextPageUrl = `${baseUrl}?page=${page + 1}&limit=${limit}`;
    }

    if (pagination.hasPrevPage) {
        pagination.prevPageUrl = `${baseUrl}?page=${page - 1}&limit=${limit}`;
    }

    return { query: paginatedQuery, pagination };
};
