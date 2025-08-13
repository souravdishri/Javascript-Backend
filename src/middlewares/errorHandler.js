// src/middleware/errorHandler.js

// Express error-handling middleware
// You throw errors using `ApiError.js` (defines the error object).
// All errors are caught and formatted for the client by `errorHandler.js` (defines the response format).

import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    // Handle Mongoose ValidationError
    if (err.name === "ValidationError") {
        err = new ApiError(
            err.message,
            400,
            Object.values(err.errors).map(e => e.message)
        );
    }

    // Handle Mongoose Duplicate Key Error
    if (err.code && err.code === 11000) {
        err = new ApiError(
            `Duplicate field value: ${JSON.stringify(err.keyValue)}`,
            409
        );
    }

    // Handle JWT errors (if you use JWT)
    if (err.name === "JsonWebTokenError") {
        err = new ApiError("Invalid token. Please log in again.", 401);
    }
    if (err.name === "TokenExpiredError") {
        err = new ApiError("Token expired. Please log in again.", 401);
    }


    // Add more known error types as your app grows...



    // Determine status code and status label
    const statusCode = err.statusCode || 500;
    const status = err.status || (String(statusCode).startsWith("4") ? "fail" : "error");

    // Optional: Environment-based logging
    if (process.env.NODE_ENV !== "production") {
        console.error("❌ Error:", err.message);
        if (!err.isOperational) {
            console.error("💥 Stack Trace:", err.stack);
        }
    }

    // Send structured error response
    res.status(statusCode).json({
        success: false,                                // Always false for errors
        status,                                        // "fail" or "error"
        message: err.message || "Internal Server Error", // Fallback message
        data: err.data || null,                        // Optional payload
        errors: err.errors || [],                      // Field-level errors
        timestamp: err.timestamp || new Date().toISOString() // Consistent with ApiError
    });
};

export default errorHandler;


// Your errorHandler.js catches all errors (including Mongoose errors).
// If the error is not an ApiError, it still formats and logs it, 
// but the message and structure come from the original error 
// (e.g., "User validation failed: password: Password is required").


// You don’t need to manually handle every possible error type in your errorHandler.js.
// Instead, you can use a pattern-matching approach to handle common error types (like Mongoose, JWT, etc.), 
// and let all other errors fall back to a generic handler.

// Best Practice for errorHandler.js
// Check for known error types (like Mongoose validation, duplicate key, JWT errors).
// Convert them to your ApiError format for consistency.
// For unknown errors, just use the default formatting.

// How to Maintain This:
// Add new error type handling only when you encounter them and want to customize the message/format.
// For all other errors, your generic handler will still catch and format them.

// Summary Table:
// `Error Type`	                        `How to Handle?`
// Mongoose ValidationError	            Convert to ApiError (400)
// Mongoose Duplicate Key	            Convert to ApiError (409)
// JWT Errors	                        Convert to ApiError (401)
// All Others	                        Use default formatting

// You don’t need to predict every error.
// Just handle the most common ones,and let your generic handler do the rest!