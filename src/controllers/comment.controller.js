import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Like } from "../models/like.model.js";


const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    // check if video exists
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const userId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;

    const commentsAggregation = Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId(videoId) } },
        // Join with User collection to get owner details
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    { $project: { username: 1, fullName: 1, "avatar.url": 1 } }
                ]
            }
        },
        // Join with Like collection to get likes details
        {
            $lookup: {
                from: "likes",
                localField: "_id", // this `_id` is from the `comment model` 
                foreignField: "comment", // this `comment` field is from the `Like` model
                as: "likes",
                pipeline: [
                    { $project: { likedBy: 1 } }
                ]
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                owner: { $first: "$owner" },
                // Check if the logged-in user has liked this comment
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                // alternative simpler version (but gives error if user not logged in)
                // isLiked: userId ? { $in: [userId, "$likes.likedBy"] } : false
            }
        },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                isLiked: 1,
                "owner.username": 1,
                "owner.fullName": 1,
                "owner.avatar.url": 1
            }
        }
    ])

    // Pagination options
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    const comments = await Comment.aggregatePaginate(commentsAggregation, options)

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                comments,
                "Comments fetched successfully"
            )
        )

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params
    const { content } = req.body

    // validate videoId and content
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty")
    }

    // check if video exists
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // create new comment in DB
    const newComment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user?._id
    })

    if (!newComment) {
        throw new ApiError(500, "Failed to create comment")
    }


    return res.status(201)
        .json(
            new ApiResponse(
                201,
                { comment: newComment },
                "Comment added successfully"
            )
        )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params
    const { content } = req.body

    // validate commentId and content
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty")
    }

    // check if comment exists
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // check if the logged-in user is the owner of the comment
    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment")
    }

    // update comment in DB
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { content: content.trim() },
        { new: true }
    )

    if (!updatedComment) {
        throw new ApiError(500, "Failed to update comment")
    }


    return res.status(200)
        .json(
            new ApiResponse(
                200,
                { comment: updatedComment },
                "Comment updated successfully"
            )
        )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params

    // validate commentId
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    // check if comment exists
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // check if the logged-in user is the owner of the comment
    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }

    // delete comment from DB
    const deletedComment = await Comment.findByIdAndDelete(commentId)

    if (!deletedComment) {
        throw new ApiError(500, "Failed to delete comment")
    }


    return res.status(200)
        .json(
            new ApiResponse(
                200,
                { comment: deletedComment },
                "Comment deleted successfully"
            )
        )
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}