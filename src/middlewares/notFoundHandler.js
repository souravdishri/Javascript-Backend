// src/middlewares/notFoundHandler.js

import {ApiError } from "../utils/ApiError.js"; // adjust path as needed

const notFoundHandler = (req, res, next) => {
    next(
        new ApiError(
            404,
            `Can't find ${req.originalUrl} on this server`,
            null,
            [],
        )
    );
};

export default notFoundHandler;
