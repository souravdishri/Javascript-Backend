// src/utils/ApiError.js

// You throw errors using `ApiError.js` (defines the error object).
// All errors are caught and formatted for the client by `errorHandler.js` (defines the response format).
class ApiError extends Error {
    constructor(
        message = "Something went wrong",
        statusCode = 500,
        errors = [],
        stack = "",
        data = null
    ) {
        super(message);

        this.statusCode = statusCode;
        this.message = message;
        this.errors = errors;
        this.data = data;
        this.success = false;

        // Classify error type based on status code
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

        // Flag to distinguish expected vs. programming errors
        this.isOperational = true;
        this.timestamp = new Date().toISOString();


        // Preserve or capture stack trace
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };
