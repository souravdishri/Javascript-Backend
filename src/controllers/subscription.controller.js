import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription
    if (!isValidObjectId(channelId)) {
        throw new ApiError("Invalid channel ID", 400)
    }
    // check if channel exists
    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError("Channel not found", 404)
    }
    // check if subscription already exists
    const existingSubscription = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user._id
    })
    if (existingSubscription) {
        // unsubscribe (remove the subscription)
        await Subscription.findByIdAndDelete(existingSubscription._id)

        return res.status(200)
            .json(new ApiResponse(200, { isSubscribed: false }, "Unsubscribed successfully"))
    } else {
        // subscribe (create a new subscription)
        const newSubscription = await Subscription.create({
            channel: channelId,
            subscriber: req.user._id
        })

        return res.status(201)
            .json(new ApiResponse(201, { isSubscribed: true }, "Subscribed successfully"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    let { channelId } = req.params
    channelId = req.params.channelId || req.user?._id; // Accept channelId from params OR fallback to authenticated user id
    const { page = 1, limit = 10 } = req.query

    // require an id (either param or authenticated user)
    if (!channelId) {
        throw new ApiError("channelId is required (or authenticate to use your own id)", 400)
    }

    // validate channelId
    if (!isValidObjectId(channelId)) {
        throw new ApiError("Invalid channelId", 400)
    }

    // check if channel exists
    const channelExists = await User.findById(channelId)
    if (!channelExists) {
        throw new ApiError("Channel not found", 404);
    }

    // create aggregation pipeline
    const subscribersAggregation = Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        },
                    },
                ],
            },
        },

        {
            $addFields: {
                subscriber: { $first: "$subscriberDetails" }
            }
        },

        {
            $project: {
                _id: 1,
                subscriber: 1,
                createdAt: 1,
                // Optionally include the subscription date
                // subscribedAt: "$createdAt"
            }
        },

        { $sort: { createdAt: -1 } },
    ])

    // pagination options
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    // execute aggregation with pagination
    const subscribers = await Subscription.aggregatePaginate(subscribersAggregation, options)

    return res.status(200)
        .json(new ApiResponse(200, subscribers, "Channel subscribers fetched successfully"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    let { subscriberId } = req.params
    // Accept subscriberId from params OR fallback to authenticated user id
    subscriberId = req.params.subscriberId || req.user?._id;
    const { page = 1, limit = 10 } = req.query

    // require an id (either param or authenticated user)
    if (!subscriberId) {
        throw new ApiError("subscriberId is required (or authenticate to use your own id)", 400)
    }
    // validate subscriberId
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError("Invalid subscriberId", 400)
    }

    // check if subscriber exists
    const subscriberExists = await User.findById(subscriberId)
    if (!subscriberExists) {
        throw new ApiError("Subscriber not found", 404);
    }

    // create aggregation pipeline
    const subscriptionsAggregation = Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            // subscribersCount: 1,
                            // createdAt: 1
                        },
                    },
                ],
            },
        },

        {
            $addFields: {
                channel: { $first: "$channelDetails" }
            }
        },

        {
            $project: {
                _id: 0,
                channel: 1,
                createdAt: 1,
                // Optionally include the subscription date
                // subscribedAt: "$createdAt"
            }
        },

        { $sort: { createdAt: -1 } },
    ])

    // pagination options
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    // execute aggregation with pagination
    const channels = await Subscription.aggregatePaginate(subscriptionsAggregation, options)


    return res.status(200)
        .json(new ApiResponse(200, channels, "Subscribed channels fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}