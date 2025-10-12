import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    //TODO: create playlist
    if (!name || name.trim() === "") {
        throw new ApiError(400, "Playlist name cannot be empty")
    }
    if (!description || description.trim() === "") {
        throw new ApiError(400, "Playlist description cannot be empty")
    }

    const newPlaylist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        owner: req.user?._id
    })

    if (!newPlaylist) {
        throw new ApiError(500, "Failed to create playlist")
    }

    return res.status(201)
        .json(
            new ApiResponse(
                201,
                { playlist: newPlaylist },
                "Playlist created successfully"
            )
        )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }

    // check if playlist exists
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    // check if the logged-in user is the owner of the playlist
    if (playlist.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this playlist")
    }

    // delete playlist from DB
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlist?._id)

    if (!deletedPlaylist) {
        throw new ApiError(500, "Failed to delete playlist")
    }


    return res.status(200)
        .json(
            new ApiResponse(
                200,
                { playlist: deletedPlaylist },
                "Playlist deleted successfully"
            )
        )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist
    // validate playlistId
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }

    // validate name and description
    if (name !== undefined && name.trim() === "") {
        throw new ApiError(400, "Playlist name cannot be empty")
    }
    if (description !== undefined && description.trim() === "") {
        throw new ApiError(400, "Playlist description cannot be empty")
    }

    // check if playlist exists
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    // check if the logged-in user is the owner of the playlist
    if (playlist.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this playlist")
    }

    // update playlist in DB
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set: {
                name: name?.trim() || playlist?.name,
                description: description?.trim() || playlist?.description
            }
        }, { new: true }
    )

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to update playlist")
    }

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                { playlist: updatedPlaylist },
                "Playlist updated successfully"
            )
        )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    // validate playlistId and videoId
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    // check if playlist exists
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    // check if the logged-in user is the owner of the playlist
    if (playlist.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to add videos to this playlist")
    }

    // add video to playlist in DB
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                videos: videoId
            } // use $addToSet to prevent duplicate video IDs
        },
        { new: true }
    )

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to add video to playlist")
    }

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                { playlist: updatedPlaylist },
                "Video added to playlist successfully"
            )
        )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist
    // validate playlistId and videoId
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    // check if playlist exists
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    // check if the logged-in user is the owner of the playlist
    if (playlist.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to remove videos from this playlist")
    }

    // remove video from playlist in DB
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $pull: {
                videos: videoId
            } // use $pull to remove the video ID from the array
        },
        { new: true }
    )

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to remove video from playlist")
    }
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                { playlist: updatedPlaylist },
                "Video removed from playlist successfully"
            )
        )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query
    //TODO: get user playlists
    // validate userId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    // check if user exists
    const userExists = await User.findById(userId)
    if (!userExists) {
        throw new ApiError(404, "User not found")
    }

    // check if the logged-in user is the same as the userId in params
    if (userId !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to view these playlists")
    }

    // build aggregation pipeline
    const playlistsAggregation = Playlist.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $project: {
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            views: 1,
                            duration: 1,
                        }
                    }
                ]
            }
        },
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
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                totalVideos: { $size: "$videos" }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                createdAt: 1,
                "owner.username": 1,
                "owner.fullName": 1,
                "owner.avatar": 1,
                videos: 1,
                // videos: { $slice: ["$videos", 5] } // limit to 5 videos per playlist
            }
        },
        {
            $sort: { createdAt: -1 } // sort by createdAt descending (newest first)
        }
    ])

    // pagination options
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    // execute aggregation with pagination
    const paginatedPlaylists = await Playlist.aggregatePaginate(playlistsAggregation, options)

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                { playlists: paginatedPlaylists },
                "User playlists fetched successfully"
            )
        )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id
    // validate playlistId
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }

    // check if playlist exists
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    // authorization: only the owner can view the playlist
    if (playlist.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to view this playlist")
    }

    // 
    const playlistAggregation = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
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
        {
            $lookup: {
                from: "videos",
                localField: "videos", // this `videos` is from the Playlist model
                foreignField: "_id",    // this `_id` is from the Video model
                as: "videos",
                pipeline: [
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            views: 1,
                            duration: 1,
                            createdAt: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                totalVideos: { $size: "$videos" },
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                totalVideos: 1,
                "owner.username": 1,
                "owner.fullName": 1,
                "owner.avatar.url": 1,
                videos: 1,
                createdAt: 1,
            },
        },
    ]);

    // Return result
    if (!playlistAggregation.length) {
        throw new ApiError(404, "Playlist not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            playlistAggregation[0],
            "Playlist fetched successfully"
        )
    );
})



export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}





// Note:

// $set vs $addToSet in MongoDB
// `$set` is used to update the value of a field in a document. 
// If the field does not exist, it will be created.

// `$addToSet` is used to add a value to an array field in a document, only if the value does not already exist in the array. 
// It prevents duplicate values in the array.