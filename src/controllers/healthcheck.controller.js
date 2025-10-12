import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message

    const healthInfo = {
        status: "OK",
        uptime: process.uptime(), // how long the app has been running (in seconds)
        timestamp: new Date().toISOString(),
        message: "Server is healthy 🚀",
    };

    return res
        .status(200)
        .json(new ApiResponse(200, healthInfo, "Health check successful"));
});


export {
    healthcheck
}