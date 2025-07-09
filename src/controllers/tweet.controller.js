import { asyncHandler } from "../utils/asyncHandler";
import { Tweet } from "../models/tweet.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import mongoose from "mongoose";

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const userId = req.user._id;

    if(!userId) {
        throw new ApiError(400, "User ID is required");
    }

    const content = req.body;

    if(!content || content.trim() === "") {
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.create({
        user: userId,
        owner: content
    });

    if (!tweet) {
        throw new ApiError(500, "Failed to create tweet");
    }

    res.status(201).json(
        new ApiResponse(201, tweet,"Tweet created successfully")
    );
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;

    const {page = 1, limit = 10} = req.query;

    if(!userId) {
        throw new ApiError(400, "User ID is required");
    }

    const tweet = await Tweet.aggregate([
        {
            $match: {
                 owner : mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner: { $first: "$owner"}
            }
        },
        {
            $project:{
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: 1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: parseInt(limit)
        }
    ])
    
    if (!tweet) {
        throw new ApiError(404, "No tweets found for this user");
    }

    res.status(200).json(
        new ApiResponse(200, tweet, "User tweets retrieved successfully")
    );
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    const userId = req.user._id;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if(!tweet.user.equals(userId)) {
        throw new ApiError(403, "You are not authorized to update this tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
                updatedAt: Date.now()
            }
        },
        { new: true }
    );

    if (!updatedTweet) {
        throw new ApiError(500, "Failed to update tweet");
    }

    res.status(200).json(
        new ApiResponse(200, updatedTweet, "Tweet updated successfully")
    );


})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;
    const userId = req.user._id;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    const tweet = await Tweet.findById(tweetId);


    if(!tweet){
        throw new ApiError(404, "Tweet not found");
    }

    if(!tweet.user.equals(userId)) {
        throw new ApiError(403, "You are not authorized to delete this tweet");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if(!deletedTweet) {
        throw new ApiError(500, "Failed to delete tweet");
    }

    res.status(200).json(
        new ApiResponse(200, deletedTweet, "Tweet deleted successfully")
    );
})

export {createTweet, getUserTweets, updateTweet, deleteTweet};