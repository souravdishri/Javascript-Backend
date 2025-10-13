import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose, { isValidObjectId } from "mongoose"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user?.id;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId")
    }

    // video stats
    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,  // we are not grouping by any field, just getting overall stats
                totalViews: { $sum: "$views" }, // sum all the `views` fields
                totalVideos: { $sum: 1 }    // count of total videos
            }
        }
    ])

    // likes on user's videos
    // find all video Ids owned by the user, use `distinct` to get only unique Ids
    // syntax: Model.distinct(field, query)
    const videoIds = await Video.distinct(
        "_id",
        {
            owner: userId
        }
    );
    // count all likes where `video` is in the above videoIds array
    // syntax: Model.countDocuments(query)
    const totalLikes = await Like.countDocuments(
        {
            video: {
                $in: videoIds
            }
        }
    );

    // subscriber count
    const totalSubscribers = await Subscription.countDocuments(
        {
            channel: userId,
        }
    )

    res.status(200)
        .json(new ApiResponse(
            200,
            {
                totalViews: videoStats[0]?.totalViews || 0,
                totalVideos: videoStats[0]?.totalVideos || 0,
                totalLikes,
                totalSubscribers
            },
            "Channel stats fetched successfully"
        ));
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    let { channelId } = req.params
    channelId = req.params.channelId || req.user?._id; // Accept channelId from params OR fallback to authenticated user id
    const { page = 1, limit = 10 } = req.query

    // require an id (either param or authenticated user)
    if (!channelId) {
        throw new ApiError("channelId is required (or authenticate to use your own id)", 400)
    }

    // Validate channelId
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId")
    }

    const videosAggregation = Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId),
                isPublished: true
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
                            fullname: 1,
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        { $addFields: { owner: { $first: "$owner" } } },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                title: 1,
                thumbnail: 1,
                views: 1,
                createdAt: 1,
                "owner.username": 1,
                "owner.fullName": 1,
                "owner.avatar.url": 1
            }
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const videos = await Video.aggregatePaginate(videosAggregation, options);


    res.status(200)
        .json(new ApiResponse(
            200,
            videos,
            "Channel videos fetched successfully"
        ));
})

export {
    getChannelStats,
    getChannelVideos
}