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
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
})

export { }