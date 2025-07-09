import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const userId = req.user.id;

    const videoCount = await Video.aggregate([
        {
            $match: { owner: mongoose.Types.ObjectId(userId) }
        },
        {
            $group: {
                _id : $videoFile,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" },
                // totalLikes: { $sum: "$likesCount" }
            }
        },
        {
            $project: {
                _id: 1,
                totalVideos: 1,
                totalViews: 1,
                // totalLikes: 1
            }
        },

    ])

    if (!videoCount || videoCount.length === 0) {
        throw new ApiError(404, "No videos found for this channel");
    }

    const subscriberCount = await Subscription.aggregate([
        {
            $match : {
                channel : mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group:{
                _id: null,
                totalSubscribers: {
                    $sum: 1
                }
            }
        },
        {
            $project: {
                _id: 1,
                totalSubscribers: 1
            }
        }
    ])
    if (!subscriberCount || subscriberCount.length === 0) {
        throw new ApiError(404, "No subscribers found for this channel");
    }

    const likeCount = await Like.aggregate([
        {
            $match: { user: mongoose.Types.ObjectId(userId) }
        },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                totalLikes: 1
            }
        }
    ])

    if (!likeCount || likeCount.length === 0) {
        throw new ApiError(404, "No likes found for this channel");
    }

    return res.status(200).json(
        ApiResponse(200, {
            totalVideos: videoCount[0].totalVideos,
            totalViews: videoCount[0].totalViews,
            totalSubscribers: subscriberCount[0].totalSubscribers,
            totalLikes: likeCount[0].totalLikes
        }, "Channel stats fetched successfully")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const userId = req.user.id;

    const { page = 1, limit = 10 } = req.query;

    const totalVideos = await Video.aggregate([
        {
            $match: {
                owner : mongoose.Types.ObjectId(userId)
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                isPubliced: 1,
                title: 1,
                description: 1,
                views: 1,
                likesCount: 1,
                createdAt: 1,
                updatedAt: 1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        }
    ])

    if (!totalVideos || totalVideos.length === 0) {
        throw new ApiError(404, "No videos found for this channel");
    }

    res.status(200).json(
        ApiResponse(200, totalVideos, "Channel videos fetched successfully")
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }