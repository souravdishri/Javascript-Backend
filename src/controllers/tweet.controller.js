import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body

    // validate content
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content cannot be empty")
    }

    // create new tweet in DB
    const newTweet = await Tweet.create({
        content: content.trim(),
        owner: req.user?._id
    })

    if (!newTweet) {
        throw new ApiError(500, "Failed to create tweet")
    }

    return res.status(201)
        .json(
            new ApiResponse(
                201,
                { tweet: newTweet },
                "Tweet created successfully"
            )
        )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query

    // validate userId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    // check if user exists
    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "User not found")
    }

    // 
    const currentUserId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null

    // aggregation pipeline to fetch tweets with owner details
    const tweetsAggregation = Tweet.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        // join with User collection to get owner details
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            // _id: 1,
                            username: 1,
                            fullName: 1,
                            "avatar.url": 1,
                        }
                    }
                ]
            }
        },
        // join with Like collection to get likes details
        {
            $lookup: {
                from: "likes",
                localField: "_id", // this `_id` is from the `tweet model` 
                foreignField: "tweet", // this `tweet` field is from the `Like` model
                as: "likes",
                pipeline: [
                    { $project: { likedBy: 1 } }
                ]
            }
        },
        // add fields for likesCount, owner (as single object), and isLiked by current user
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                owner: { $first: "$owner" },
                // Check if the logged-in user has liked this tweet
                isLiked: {
                    $cond: {
                        if: { $in: [currentUserId, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        // sort by createdAt descending (newest first)
        { $sort: { createdAt: -1 } },
        // project only necessary fields
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

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    // execute aggregation with pagination
    const tweets = await Tweet.aggregatePaginate(tweetsAggregation, options)


    return res.status(200)
        .json(
            new ApiResponse(
                200,
                tweets,
                "User tweets fetched successfully"
            )
        );
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params
    const { content } = req.body

    // validate tweetId and content
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content cannot be empty")
    }

    // check if tweet exists
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    // check if the logged-in user is the owner of the tweet
    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this tweet")
    }

    // update tweet in DB
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { content: content.trim() },
        { new: true }
    )

    if (!updatedTweet) {
        throw new ApiError(500, "Failed to update tweet")
    }

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                { tweet: updatedTweet },
                "Tweet updated successfully"
            )
        )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params

    // validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    // check if tweet exists
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    // check if the logged-in user is the owner of the tweet
    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet")
    }

    // delete tweet from DB
    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)
    if (!deletedTweet) {
        throw new ApiError(500, "Failed to delete tweet")
    }

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                { tweet: deletedTweet },
                "Tweet deleted successfully"
            )
        )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}