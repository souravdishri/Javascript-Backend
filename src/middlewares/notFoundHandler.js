// src/middlewares/notFoundHandler.js

import {ApiError } from "../utils/ApiError.js"; // adjust path as needed

const notFoundHandler = (req, res, next) => {
    next(
        new ApiError(
            `Can't find ${req.originalUrl} on this server`,
            404,
            [],
            null,
        )
    );
};

export default notFoundHandler;
