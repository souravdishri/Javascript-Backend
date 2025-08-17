import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        // Extract the token from cookies or Authorization header
        // `req.cookies?.accessToken` checks if the accessToken cookie exists
        // `req.header("Authorization")?.replace("Bearer ", "")` checks if the Authorization header exists and removes the "Bearer " prefix
        // This allows the middleware to work with both cookies and headers for token verification

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        // console.log(token);
        if (!token) {
            throw new ApiError("Unauthorized request", 401)
        }
        // Verify the token using the secret key
        // `jwt.verify` checks if the token is valid and decodes it
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user) {

            throw new ApiError("Invalid Access Token", 401)
        }

        // Attach the user to the request object for further processing
        // This allows subsequent middleware or route handlers to access the user information
        // `req.user` will now contain the user object without password and refreshToken
        // This is useful for authorization checks or personalizing responses based on the authenticated user
        // `next()` is called to pass control to the next middleware or route handler
        // This is essential for the middleware to function correctly in the request-response cycle

        req.user = user;
        next()

    } catch (error) {
        throw new ApiError(error?.message || "Invalid access token", 401)
    }

})


// Note: 
// The `verifyJWT` middleware checks for a valid JWT token in the request, either from cookies or the Authorization header. 
// If the token is valid, it retrieves the user from the database and attaches it to the request object 
// for further processing in subsequent middleware or route handlers.


// `req.cookies` is used to get the cookies from the request
// `req.header("Authorization")` is used to get the Authorization header from the request
// `replace("Bearer ", "")` is used to remove the "Bearer " prefix from the token string
// This allows the middleware to work with both cookies and headers for token verification