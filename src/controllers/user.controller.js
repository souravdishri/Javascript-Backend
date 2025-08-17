import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// This function is used to generate access and refresh tokens for the user
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        // Find the user by ID and generate access and refresh tokens
        const user = await User.findById(userId)
        // here `user` means the user object that we found by ID
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // Update the user's refresh token in the database
        // `validateBeforeSave: false` is used to skip validation for the refreshToken field
        // This is useful when we want to update the refreshToken without validating it again
        user.refreshToken = refreshToken    // adding values to the user object
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError("Something went wrong while generating access and refresh tokens", 500)
    }
}

// This function is used to register a new user
// It checks if the user already exists, uploads the avatar and cover image to Cloudinary,
// creates a new user in the database, and returns the created user without password and refreshToken
const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    // req.body = used to get data from the form or json
    // req.params = used to get data from the url
    // req.query = used to get data from the query string
    // req.headers = used to get data from the headers
    // req.cookies = used to get data from the cookies

    const { fullName, email, username, password } = req.body
    // console.log("email: ", email);

    if (
        // check if any field is empty, (`.some()` returns either True/False)
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError("All fields are required", 400)
    }

    const existedUser = await User.findOne({
        // `$or` operator is used to check if any of the conditions are true
        // `username` or `email` already exists
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError("User with email or username already exists", 409)
    }



    // multer will give us the uploaded files in `req.files`
    //console.log(req.files);

    // `req.files` will contain the uploaded files, where `avatar` and `coverImage` are arrays of files
    // `req.files.avatar[0].path` is used to get the path of the uploaded avatar file
    // `req.files.coverImage[0].path` is used to get the path of the uploaded cover image file

    // `uploadOnCloudinary` is a function that uploads the file to Cloudinary and returns the response

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    // check if coverImage is present in req.files and has at least one file
    // if it is present, get the path of the first file
    // if it is not present, set coverImageLocalPath to null
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


    if (!avatarLocalPath) {
        throw new ApiError("Avatar file is required", 400)
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError("Avatar file is required", 400)
    }

    // create user object
    const user = await User.create({
        fullName, // fullName is not unique, so we can use it directly
        avatar: avatar.url, // avatar is required, so we can use it directly
        coverImage: coverImage?.url || "", // coverImage can be optional, so we use optional chaining
        email, // email is unique, so we can use it to find the user
        password, // password is required, so we can use it directly
        username: username.toLowerCase()
        // username is unique, so we can use it to find the user, 
        // store username in lowercase to avoid case sensitivity issues
    })

    // if user is not created, throw an error
    // we are commenting out this to reduce/minimize database calls, as we are already checking below 
    // if (!user) {
    //     throw new ApiError(500, "Something went wrong while registering the user")
    // }

    // find the user by id and select the fields we want to return
    // we don't want to return the password and refreshToken fields
    // `-password -refreshToken` means we don't want to return these fields
    // `select` is used to select the fields we want to return
    // `findById` is used to find the user by id
    // `user._id` is the id of the user we just created

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError("Something went wrong while registering the user", 500)
    }
    // return the response with the created user that is `createdUser`, without password and refreshToken
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

// This function is used to log in the user
// It checks if the user exists, validates the password, generates access and refresh tokens, and
// sends them back in the response along with the user details
const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and refresh token
    //send cookie


    const { email, username, password } = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError("username or email is required", 400)
    }

    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError("username or email is required", 400)

    // }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError("User does not exist", 404)
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError("Invalid user credentials", 401)
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    // extracting the user details without password and refreshToken
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // Set cookies for accessToken and refreshToken
    // `httpOnly: true` means the cookie cannot be accessed by JavaScript, only accessible by the server
    // `secure: true` means the cookie will only be sent over HTTPS
    // `sameSite: "strict"` means the cookie will only be sent in a first-party context
    // `maxAge` is the duration for which the cookie will be valid
    // `expires` is the date and time when the cookie will expire
    // `res.cookie` is used to set the cookie in the response
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {   // `loggedInUser` is the user object that we found by ID and selected the fields we want to return
                    // `accessToken` and `refreshToken` are the tokens
                    // here we are sending again the accessToken and refreshToken because (when user wants to save these tokens from their side) 
                    // You're renaming the key from loggedInUser to user, which makes the response cleaner and more intuitive for the frontend.
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged In Successfully"
            )
        )


})

// This function is used to log out the user
// It removes the refresh token from the user document and clears the cookies
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        // `req.user` is set by the `verifyJWT` middleware, which verifies the JWT token and attaches the user object to the request
        req.user._id,
        {
            $unset: {
                // `$unset` is used to remove a field from the document
                // `refreshToken` is the field we want to remove from the user document 
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            // `new: true` means return the updated document
            // This is useful when you want to see the changes made to the document after the update
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

// This function is used to refresh the access token using the refresh token
// It checks if the refresh token is valid and generates a new access token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError("unauthorized request", 401)
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError("Invalid refresh token", 401)
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError("Refresh token is expired or used", 401)

        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(error?.message || "Invalid refresh token", 401)
    }

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
}