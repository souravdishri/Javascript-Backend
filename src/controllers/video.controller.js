import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    if (
        // check if any field is empty, (`.some()` returns either True/False)
        [title, description].some((field) => field?.trim() === "")
    ) {
        throw new ApiError("Titles and descriptions both are required", 400)
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoFileLocalPath || !thumbnailLocalPath) {
        throw new ApiError("Video file and thumbnail are required", 400)
    }
    // upload video file on cloudinary
    const uploadedVideo = await uploadOnCloudinary(videoFileLocalPath)
    console.log(uploadedVideo);

    if (!uploadedVideo) {
        throw new ApiError("Unable to upload video, please try again", 500)
    }
    // upload thumbnail on cloudinary
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!uploadedThumbnail) {
        throw new ApiError("Unable to upload thumbnail, please try again", 500)
    }

    // create a video document in db
    const newVideo = await Video.create({
        title,
        description,
        videoFile: {
            url: uploadedVideo.secure_url,
            public_id: uploadedVideo.public_id
        },
        thumbnail: {
            url: uploadedThumbnail.secure_url,
            public_id: uploadedThumbnail.public_id
        },
        duration: uploadedVideo.duration,
        owner: req.user?._id,
        isPublished: false // all videos will be unpublished by default
    })

    // Notes: (populate owner details (username, avatar)) 
    // .populate():
    // Mongoose has a special method called `populate()` which automatically replaces the `ObjectId` 
    // reference with the `actual document` from the referenced collection.

    // Mongoose goes and looks into the users collection (because ref: "User" in the schema) and 
    // finds the matching document where _id = owner.
    // Then it replaces that ObjectId with the full user info (but only the selected fields).

    // `path`: The field name that references another model (here "owner")
    // `ref`: The referenced model defined in schema (ref: "User")

    // (it works as well)
    // const videoWithOwnerDetails = await Video.findById(newVideo._id).populate({ path: "owner", select: "username avatar" })
    // return res.status(201)
    //     .json(
    //         new ApiResponse(201, videoWithOwnerDetails, "Video published successfully")
    //     )

    const videoWithOwnerDetails = await Video.findById(newVideo._id)
    console.log(videoWithOwnerDetails);

    if (!videoWithOwnerDetails) {
        throw new ApiError("Unable to fetch video after creation, please try again", 500)
    }

    return res.status(201)
        .json(
            new ApiResponse(201, videoWithOwnerDetails, "Video published successfully")
        )

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if (!isValidObjectId(videoId)) {
        throw new ApiError("Invalid video ID", 400)
    }

    const { title, description } = req.body
    if (!title?.trim() || !description?.trim()) {
        throw new ApiError("Title and description both are required", 400)

    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError("Video not found", 404)
    }

    // check if the logged in user is the owner of the video
    if (video.owner?._id.toString() !== req.user?._id.toString()) {
        throw new ApiError("You are not authorized to update this video", 403)
    }

    // if thumbnail is not being updated, then just update title and description
    if (!req.file) {
        const updatedVideo = await Video.findByIdAndUpdate(
            videoId,
            {
                $set: {
                    title: title,
                    description: description
                }
            },
            { new: true } // return the updated document
        )

        if (!updatedVideo) {
            throw new ApiError("Unable to update video, please try again", 500)
        }

        return res.status(200)
            .json(
                new ApiResponse(200, updatedVideo, "Video updated successfully")
            )
    }

    // if thumbnail is being updated as well
    // upload new thumbnail on cloudinary and delete the previous one from cloudinary
    // update video document in db

    // get the local path of the new thumbnail
    const thumbnailLocalPath = req.file?.path
    if (!thumbnailLocalPath) {
        throw new ApiError("Thumbnail is required", 400)
    }

    // delete the previous thumbnail from cloudinary
    if (video.thumbnail?.public_id) {
        await deleteFromCloudinary(video.thumbnail.public_id)
    }

    // upload new thumbnail on cloudinary
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!uploadedThumbnail) {
        throw new ApiError("Unable to upload thumbnail, please try again", 500)
    }
    if (!uploadedThumbnail.secure_url || !uploadedThumbnail.public_id) {
        throw new ApiError("Invalid response from cloudinary while uploading thumbnail", 500)
    }

    // update video document in db
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title,
                description: description,
                thumbnail: {
                    url: uploadedThumbnail.secure_url,
                    public_id: uploadedThumbnail.public_id
                }
            }
        },
        { new: true }
    )

    if (!updatedVideo) {
        throw new ApiError("Unable to update video, please try again", 500)
    }

    return res.status(200)
        .json(
            new ApiResponse(200, updatedVideo, "Video updated successfully")
        )

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError("Invalid video ID", 400)
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError("Video not found", 404)
    }

    // check if the logged in user is the owner of the video
    if (video.owner?._id.toString() !== req.user?._id.toString()) {
        throw new ApiError("You are not authorized to toggle publish status of this video", 403)
    }

    const toggledVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        { new: true } // return the updated document
    )

    if (!toggledVideo) {
        throw new ApiError("Unable to toggle publish status, please try again", 500)
    }

    return res.status(200)
        .json(
            new ApiResponse(200, toggledVideo, "Video publish status toggled successfully")
        )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!isValidObjectId(videoId)) {
        throw new ApiError("Invalid video ID", 400)
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError("Video not found", 404)
    }

    // check if the logged in user is the owner of the video
    if (video.owner?._id.toString() !== req.user?._id.toString()) {
        throw new ApiError("You are not authorized to delete this video", 403)
    }

    // delete video file from cloudinary
    if (video.videoFile?.public_id) {
        await deleteFromCloudinary(video.videoFile.public_id)
    }

    // delete thumbnail from cloudinary
    if (video.thumbnail?.public_id) {
        await deleteFromCloudinary(video.thumbnail.public_id)
    }

    // delete video document from db
    const deletedVideo = await Video.findByIdAndDelete(videoId)
    if (!deletedVideo) {
        throw new ApiError("Unable to delete video, please try again", 500)
    }
    console.log("Deleted video response: ", deletedVideo);

    return res.status(200)
        .json(
            new ApiResponse(200, deletedVideo, "Video deleted successfully")
        )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if (!isValidObjectId(videoId)) {
        throw new ApiError("Invalid video ID", 400)
    }
    if (!isValidObjectId(req.user?._id)) {
        throw new ApiError("Invalid user ID", 400)
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError("Video not found", 404)
    }

    // if the video is unpublished, only the owner can access it 
    if (!video.isPublished && video.owner?._id.toString() !== req.user?._id.toString()) {
        throw new ApiError("You are not authorized to view this video", 403)
    }

    // increment view count by 1 (only if the viewer is not the owner)
    if (video.owner?._id.toString() !== req.user?._id.toString()) {
        // this approach can't able to run any custom mongoose middlewares (pre-save/post-save hooks), 
        // since it directly updates the document in the database
        // increment the views count atomically

        await Video.findByIdAndUpdate(
            videoId,
            {
                $inc: { views: 1 } // increment views by 1
            },
            { new: true } // return the updated document
        )

        // Alternative approach:    
        // this approach helps to `Triggers Mongoose middlewares`
        // video.views += 1
        // await video.save()
    }

    // add to user's watchHistory if not already present
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $addToSet: { watchHistory: videoId } // addToSet avoids duplicates
        },
        { new: true }
    )

    // fetch the video again to get the updated view count
    const updatedVideo = await Video.findById(videoId)
    if (!updatedVideo) {
        throw new ApiError("Unable to fetch video after updating view count, please try again", 500)
    }

    return res.status(200)
        .json(
            new ApiResponse(200, updatedVideo, "Video fetched successfully")
        )

})

const getAllVideos = asyncHandler(async (req, res) => {

    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = "desc",
        userId,
    } = req.query;

    //TODO: get all videos based on query, sort, pagination
    console.log({ page, limit, query, sortBy, sortType, userId });

    // ✅ Build match conditions dynamically
    const matchStage = {
        isPublished: true,
    };

    // Dynamic sorting
    const sortStage = {
        [sortBy]: sortType === "asc" ? 1 : -1,
    };


    // if query is present, add text search conditions
    if (query) {
        matchStage.$or = [
            // $or allows searching in multiple fields
            //  - $regex allows partial matching (e.g., searching "fun" will find "funny video").
            //  - $options: "i" makes it case-insensitive (e.g., "FUN" and "fun" are treated the same).
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ];
    }

    if (userId && mongoose.isValidObjectId(userId)) {
        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }


    // ✅ Aggregation pipeline
    const videosAggregation = Video.aggregate([
        { $match: matchStage },

        // ✅ Lookup owner info
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            "avatar.url": 1,
                        },
                    },
                ],
            },
        },

        // ✅ Simplify owner (pick first element)
        {
            $addFields: {
                owner: { $first: "$owner" },
            },
        },
        { $sort: sortStage },
        // ✅ Project only required fields
        {
            $project: {
                title: 1,
                description: 1,
                views: 1,
                duration: 1,
                isPublished: 1,
                thumbnail: 1,
                videoFile: 1,
                // "thumbnail.url:" 1,
                owner: 1,
                createdAt: 1,
            },
        },
    ]);

    // Pagination options
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    console.log("Videos aggregation result:", videosAggregation);

    // execute pagination
    const videos = await Video.aggregatePaginate(videosAggregation, options);

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Videos fetched successfully (Aggregation)"
        )
    );


    //     //      🧠 Breakdown of Each Stage
    //     // Stage                        	Description

    //     // $match	            Filters published videos, searches text, and optionally filters by user
    //     // $lookup	            Joins the User collection to get owner info (username, avatar, etc.)
    //     // $addFields	        Simplifies the owner array into a single object
    //     // $sort	            Sorts videos by date, views, or any field dynamically
    //     // $skip	            Skips previous pages
    //     // $limit	            Limits to desired number of videos per page
    //     // $project	            Returns only needed fields to keep response clean
    //     // $count	            Calculates total videos for pagination info

});


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}






// note:

// The difference between parseInt(page, 10) and Number(page) in JavaScript lies in their parsing behavior and the type of number they return.

// parseInt(page, 10):
// Purpose: Parses a string argument and returns an integer of the specified radix (base). The 10 in parseInt(page, 10) explicitly sets the radix to base 10 (decimal). 
// Behavior: It parses the string from left to right, character by character, until it encounters a non-numeric character (or the end of the string). It then returns the integer value parsed up to that point. Any trailing non-numeric characters are ignored. 
// Return Value: Always returns an integer.

// Example:
// JavaScript

//     parseInt("10.6 objects", 10); // Returns 10
//     parseInt("3.1415", 10);     // Returns 3
//     parseInt("20px", 10);       // Returns 20
//     parseInt("abc", 10);        // Returns NaN


// Number(page):
// Purpose: Converts its argument to a number. It's a more general-purpose conversion function.
// Behavior: It attempts to convert the entire input string into a number. If the string contains any non-numeric characters that prevent it from being a valid numerical representation, it returns NaN. It can also handle hexadecimal numbers (starting with 0x).
// Return Value: Can return an integer or a floating-point number, depending on the input.

// Example:
// JavaScript

//     Number("10.6 objects"); // Returns NaN
//     Number("3.1415");     // Returns 3.1415
//     Number("20px");       // Returns NaN
//     Number("abc");        // Returns NaN
//     Number("10");         // Returns 10

// In the context of const pageNum = parseInt(page, 10); vs Number(page):
// If page is expected to be a string that might contain non-numeric characters at the end (e.g., "1", "2", "3", but also potentially "1st page"), and you only need the integer part, parseInt(page, 10) is the more robust choice.
// If page is expected to be a clean numeric string (either integer or float) and you want a strict conversion where any non-numeric content renders the result NaN, then Number(page) is appropriate.
// For parsing page numbers, which are typically integers, parseInt(page, 10) is often preferred because it handles cases where the input might have extraneous text more gracefully by extracting the leading integer. The radix 10 is crucial to ensure correct interpretation, especially in older JavaScript environments where leading zeros might be interpreted as octal.