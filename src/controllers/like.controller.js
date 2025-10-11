import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    // validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    // check if video exists
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // check if like already exists
    const existingVideoLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    })

    if (existingVideoLike) {
        // unlike the video (remove the like)
        // await existingLike.remove()
        await Like.findByIdAndDelete(existingVideoLike._id)

        return res.status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Video unliked successfully"))

    } else {
        // like the video (create a new like)
        const newLike = await Like.create({
            video: videoId,
            likedBy: req.user._id
        })

        return res.status(201)
            .json(new ApiResponse(201, { isLiked: true }, "Video liked successfully"))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    // validate commentId
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId")
    }

    // check if comment exists
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // check if like already exists
    const existingCommentLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    })

    if (existingCommentLike) {
        // unlike the comment (remove the like)
        await Like.findByIdAndDelete(existingCommentLike._id)

        return res.status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Comment unliked successfully"))
    } else {
        // like the comment (create a new like)
        const newLike = await Like.create({
            comment: commentId,
            likedBy: req.user._id
        })

        return res.status(201)
            .json(new ApiResponse(201, { isLiked: true }, "Comment liked successfully"))
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    // validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId")
    }

    // check if tweet exists
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    // check if like already exists
    const existingTweetLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    })

    if (existingTweetLike) {
        // unlike the tweet (remove the like)
        await Like.findByIdAndDelete(existingTweetLike._id)

        return res.status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Tweet unliked successfully"))
    } else {
        // like the tweet (create a new like)
        const newLike = await Like.create({
            tweet: tweetId,
            likedBy: req.user._id
        })

        return res.status(201)
            .json(new ApiResponse(201, { isLiked: true }, "Tweet liked successfully"))
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    // Step-by-step Logic:
    // `Get user ID` from `req.user._id`
    // `Find all likes` where `likedBy = userId` and the `video` field exists.
    // Use `$lookup` to join the `videos` collection — fetch the full video details.
    // Within the video lookup, join the `users` collection to get the video owner's info (username, avatar, etc.).
    // Return a paginated list of liked videos with owner info and details.

    const userId = req.user._id
    const { page = 1, limit = 10 } = req.query

    // build aggregation pipeline
    const likedVideosAggregation = Like.aggregate([
        // Only likes that belong to this user and are for videos
        {
            $match: {
                likedBy: mongoose.Types.ObjectId(userId),
                video: { $exists: true }
            }
        },
        // Join with videos collection to get video details
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    // join with users collection to get video owner details
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
                    {
                        $addFields: {
                            owner: { $first: "$owner" }
                        }
                    },
                    {
                        $project: {
                            title: 1,
                            description: 1,
                            video: 1,
                            thumbnail: 1,
                            views: 1,
                            duration: 1,
                            createdAt: 1,
                            owner: 1
                        }
                    }
                ]
            }
        },
        // flatten the video array to a single object
        {
            $addFields: {
                video: { $first: "$video" }
            }
        },
        // sort by most recently liked
        {
            $sort: { createdAt: -1 }
        }
    ]);

    // pagination options
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    // execute aggregation with pagination
    const likedVideos = await Like.aggregatePaginate(likedVideosAggregation, options)


    return res.status(200)
        .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"))

});


export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}