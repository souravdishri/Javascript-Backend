import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    let coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;
    // let coverImageLocalPath;

    if (!avatarLocalPath) {
        throw new ApiError("Avatar file is required", 400)
    }

    // check if coverImage is present in req.files and has at least one file
    // if it is present, get the path of the first file
    // if it is not present, set coverImageLocalPath to null
    // if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    //     coverImageLocalPath = req.files.coverImage[0].path
    // }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // “If coverImageLocalPath exists, upload it to Cloudinary and store the result. Otherwise, set coverImage to null.”
    // Ternary Operator
    // console.log(avatar);

    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null

    // Another way of writing above code using if-else:
    // let coverImage;
    // if (coverImageLocalPath) {
    //     console.log("Uploading cover image...");
    //     coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // } else {
    //     console.log("No cover image provided.");
    //     coverImage = null;
    // }


    // if (!avatar) {
    //     throw new ApiError("Avatar file is required", 400)
    // }
    if (!avatar?.url || !avatar?.public_id) {
        throw new ApiError("Avatar upload failed", 400)
    }


    // create user object
    const user = await User.create({
        fullName, // fullName is not unique, so we can use it directly
        avatar: {
            url: avatar.url,
            public_id: avatar.public_id
        },
        coverImage: coverImage
            ? { url: coverImage.url, public_id: coverImage.public_id }
            : undefined,
        // avatar: avatar.url, // avatar is required, so we can use it directly
        // coverImage: coverImage?.url || "", // coverImage can be optional, so we use optional chaining
        email, // email is unique, so we can use it to find the user
        password, // password is required, so we can use it directly
        username: username.toLowerCase()
        // username is unique, so we can use it to find the user, 
        // store username in lowercase to avoid case sensitivity issues
    })

    // if user is not created, throw an error
    // we are commenting out this to reduce/minimize database calls, as we are already checking below 
    // if (!user) {
    //     throw new ApiError("Something went wrong while registering the user", 500)
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

// This function is used to change the current user's password
// It checks if the old password is correct, updates the password, and saves the user document
const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body

    // `res.user` is set by the `verifyJWT` middleware, which verifies the JWT token and attaches the user object to the request
    const user = await User.findById(req.user?._id)

    // `isPasswordCorrect` is a method defined in the User model that checks if the provided password matches the user's password
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError("Invalid old password", 400)
    }

    user.password = newPassword
    // `validateBeforeSave: false` is used to skip validation for the password field
    // This is useful when we want to update the password without validating it again
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

// This function is used to get the current user's details
// It returns the user object from the request, which is set by the `verifyJWT`
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ))
})

// This function is used to update the current user's account details
// It checks if the required fields are provided, updates the user document, and returns the updated user object
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError("All fields are required", 400)
    }

    // `req.user?._id` is used to get the user ID from the request object
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: { // `$set` is used to update the fields in the document
                fullName: fullName,
                email: email,
            }
        },
        { new: true, runValidators: true }   // `new: true` means return the updated document

    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
});

// This function is used to update the user's avatar image
// It checks if the avatar file is provided, uploads it to Cloudinary, updates the user document with the new avatar URL, 
// and returns the updated user object
const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path  // `req.file` is used to get the uploaded file from the request
    // here we are using `req.file` not `req.files` because we are using single file upload for avatar

    if (!avatarLocalPath) {
        throw new ApiError("Avatar file is missing", 400)
    }

    //TODO: delete old image - assignment
    // const user = await User.findById(req.user._id)
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
        throw new ApiError("User not found", 404);
    }

    // Delete old avatar from Cloudinary if exists
    if (user.avatar?.public_id) {
        await deleteFromCloudinary(user.avatar.public_id)
        // console.log("Old avatar deleted from Cloudinary whose public_id is: ", user.avatar.public_id);
        
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // console.log(avatar);
    

    if (!avatar?.url || !avatar?.public_id) {
        throw new ApiError("Error while uploading avatar", 400)

    }

    // we can also use like this:
    // user.avatar = {
    //     url: avatar.url,
    //     public_id: avatar.public_id
    // }
    // await user.save()
    // ⚠️ Note: After .save(), the returned user might include the password again unless you re-select or sanitize it before sending.
    // After saving the user, convert the Mongoose document to a plain object and manually remove sensitive fields:
    // const userObj = user.toObject();
    // delete userObj.password;

    // For a scalable solution, define this in your schema:
    //     userSchema.methods.toJSON = function () {
    //   const obj = this.toObject();
    //   delete obj.password;
    //   return obj;
    // };
    // Mongoose will automatically call .toJSON() when serializing.

    //     Approach	                     Pros	                       Notes
    // .toObject() + delete	    Manual control	            Great for one-off sanitizing
    // .select("-password")	    Excludes early	            May need re-sanitizing after save
    // .toJSON() method	        Scalable, automatic	        Best for consistent API responses


    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: {
                    url: avatar.url,
                    public_id: avatar.public_id
                }
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, { user: updatedUser }, "Avatar image updated successfully")
        )
})

// This function is used to update the user's cover image
// It checks if the cover image file is provided, uploads it to Cloudinary, updates the user document with the new cover image URL, 
// and returns the updated user object
// Note: The cover image is optional, so it can be updated only if provided
// If the cover image is not provided, it will throw an error
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError("Cover image file is missing", 400)
    }

    //TODO: delete old image - assignment
    const user = await User.findById(req.user._id)

    if (!user) {
        throw new ApiError("User not found", 404);
    }

    // Delete old cover image from Cloudinary if exists
    if (user.coverImage?.public_id) {
        await deleteFromCloudinary(user.coverImage.public_id)
    }


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage?.url || !coverImage?.public_id) {
        throw new ApiError("Error while uploading on cover image", 400)

    }

    // user.coverImage = { url: coverImage.url, public_id: coverImage.public_id }
    // await user.save()

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                // coverImage: coverImage.url
                coverImage: {
                    url: coverImage.url,
                    public_id: coverImage.public_id
                }
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, { user: updatedUser }, "Cover image updated successfully")
        )
})

// This function is used to get a user's channel profile by their username
const getUserChannelProfile = asyncHandler(async (req, res) => {
    // Extract username from request parameters
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError("username is missing", 400)
    }

    // Aggregate to get user details along with subscribers count, channels subscribed to count, and subscription status
    const channel = await User.aggregate([
        // `$match` is used to filter the documents in the collection
        {
            $match: {
                // Match the user by username
                username: username?.toLowerCase()
            }
        },
        // `$lookup` is used to perform a left outer join with another collection
        {
            // lookup from the subscriptions collection to get the subscribers of the user
            $lookup: {
                from: "subscriptions",      // collection to join (subscriptions)
                localField: "_id",          // localField in (users) collection
                foreignField: "channel",    // foreignField in (subscriptions) collection
                as: "subscribers"           // output array field
            }
        },
        // After the first $lookup, "subscribers" is an array of subscription objects.
        // Each object in "subscribers" has a 'subscriber' field (the user who subscribed).
        // "$subscribers.subscriber" is a "dot notation" that extracts the 'subscriber' field from each object
        // in the "subscribers" array, resulting in an 'array of subscriber IDs'.
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        // Add computed fields
        // $newField: { $operation: { <args> } }
        {
            $addFields: {
                // `subscribersCount` is the count of subscribers (length of subscribers array)
                subscribersCount: {
                    $size: "$subscribers"   // `$size` is used to get the size of an array
                },
                // `channelsSubscribedToCount` is the count of channels the user is subscribed to (length of subscribedTo array)
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                // `isSubscribed` is a boolean field that indicates if the current user is subscribed to this channel
                isSubscribed: {
                    // Check if req.user._id is in the list of subscriber IDs
                    // `$cond` is used to evaluate a condition and return a value based on the condition
                    // `$in` is used to check if a value exists in an array
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        // Project to include only the necessary fields in the final output
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    console.log(channel);

    if (!channel?.length) {
        throw new ApiError("channel does not exists", 404)
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        )
})


const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                // aggregation pipeline code goes directly, (mongoose doesn't help here)
                // we have to create 'mongoose ObjectId' like below
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}