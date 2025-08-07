// src/middleware/errorHandler.js

/**
 * Express error-handling middleware
 * Catches all errors and sends structured response
 * Supports custom ApiError class for consistent API error formatting
 */

const errorHandler = (err, req, res, next) => {
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
