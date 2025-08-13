import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
        throw new ApiError("All fields are required" , 400)
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



export {
    registerUser,
}