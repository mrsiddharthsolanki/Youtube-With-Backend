import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription
    
    const {channelId} = req.params

    if (!channelId || !mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const userId = req.user._id;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    const subscription = await Subscription.findOne({
        channel: channelId,
        subscriber: userId
    });

    if(!subscription){

        try {
            const newSubscription = await Subscription.create({
                channel: channelId,
                subscriber: userId
            });

            if (!newSubscription) {
                throw new ApiError(500, "Failed to create subscription");
            }
    
            return res.status(201).json(new ApiResponse(201,newSubscription, "Subscribed successfully"));
        } catch (error) {
            console.error("Error creating subscription:", error);
            throw new ApiError(500, "Failed to subscribe");
        }
    }

    const unsubscription = await Subscription.deleteOne(subscription._id);

    if (!unsubscription) {
        throw new ApiError(500, "Failed to unsubscribe");
    }

    res.status(200).json(
        new ApiResponse(200, {} ,"Unsubscribed successfully")
    )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if (!channelId || !mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const userId = req.user._id;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }
    
    let subscriberList = [];
    try {
        subscriberList = await Subscription.aggregate([
            {
                $match: {
                    subscriber: mongoose.Types.ObjectId(channelId)
                }
            },
            {
                $group: {
                    _id: "$channel",
                    subscribersCount : {
                        $sum: 1
                    }
                }
            },
            {
                $project: {
                    channel: 1,
                    subscribersCount: 1
                }   
            }      
        ])
    } catch (error) {
        console.error("Error fetching subscribed channels:", error);
        throw new ApiError(500, "Failed to fetch subscribed channels");   
    }

    const subscriberCount = subscriberList.length > 0 ? subscriberList[0] : 0;

    res.status(200).json(
        new ApiResponse(200, { subscriberCount }, "Subscribed channels fetched successfully")
    )

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!subscriberId || !mongoose.isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }

    const userId = req.user._id;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    const totalSubscribedChannels = await Subscription.countDocuments({
        subscriber: mongoose.Types.ObjectId(subscriberId)
    });

    if (totalSubscribedChannels === 0) {
        return res.status(200).json(
            new ApiResponse(200, { channels: [], total: 0 }, "No subscribed channels found")
        );
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match : {
                subscriber: mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "channels",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar : 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                channelDetails: {
                    $arrayElemAt: ["$channelDetails", 0]
                }
            }
        },
        {
            $project: {
                channelDetails: 1
            }
        }
    ]);

    if (!subscribedChannels || subscribedChannels.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, { channels: [], total: 0 }, "No subscribed channels found")
        );
    }

    res.status(200).json(
        new ApiResponse(200, { channels: subscribedChannels, total: totalSubscribedChannels }, "Subscribed channels fetched successfully")
    );
    
})



export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels }