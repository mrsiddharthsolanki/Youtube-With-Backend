import mongoose, {connection, isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    if(!isValidObjectId(videoId)) {
        throw new ApiError("Invalid video ID", 400)
    }

    const existingLike = await Like.findOne({ video: videoId, user: req.user.id })

    let liked;
    if(existingLike) {
        // If like exists, remove it
        await Like.deleteOne({ _id: existingLike._id })
        liked = false
    } else {
        // If like does not exist, create it
        const newLike = await Like.create({
            video: videoId,
            user: req.user.id
        })

        if(!newLike) {
            throw new ApiError("Error liking video", 500)
        }
        liked = true
    }

    const likeCount = await Like.countDocuments({ video: videoId })

    return res.status(200).json(
        ApiResponse(200, { videoId,liked, likeCount }, liked ? "Video liked successfully" : "Video unliked successfully")
    )
    
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

    if(!isValidObjectId(commentId)) {
        throw new ApiError("Invalid comment ID", 400)
    }

    const existingLike = await Like.findOne({ 
            comment: commentId, 
            user: req.user.id 
        })

    let liked;
    if(existingLike) {
        // If like exists, remove it
        await Like.deleteOne({ _id: existingLike._id })
        liked = false
    } else {
        // If like does not exist, create it
        const newLike = await Like.create({
            comment: commentId,
            user: req.user.id
        })

        if(!newLike) {
            throw new ApiError("Error liking comment", 500)
        }

        liked = true
    }

    const likeCount = await Like.countDocuments({ comment: commentId })

    return res.status(200).json(
        ApiResponse(200, { commentId, liked, likeCount }, liked ? "Comment liked successfully" : "Comment unliked successfully")
    )


})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    if(!isValidObjectId(tweetId)) {
        throw new ApiError("Invalid tweet ID", 400)
    }

    const existingLike = await Like.findOne({ 
        tweet: tweetId, 
        user: req.user.id
    })

    let liked;
    if(existingLike) {
        // If like exists, remove it
        await Like.deleteOne({ _id: existingLike._id })
        liked = false
    } else {
        // If like does not exist, create it
        const newLike = await Like.create({
            tweet: tweetId,
            user: req.user.id
        })
        if(!newLike) {
            throw new ApiError("Error liking tweet", 500)
        }

        liked = true
    }

    const likeCount = await Like.countDocuments({ tweet: tweetId })

    return res.status(200).json(
        ApiResponse(200, { tweetId , liked, likeCount }, liked ? "Tweet liked successfully" : "Tweet unliked successfully")
    )
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const userId = req.user.id

    const likedVideos = await Like.aggregate([
        {
            $match:{
                likedBy : userId,
                video:{
                    $exists: true,
                    $ne: null
                }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avatar: 1,
                                        fullName: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner: {
                                $arrayElemAt: ["$ownerDetails", 0]
                            }
                        }
                    },
                    {
                        $project:{
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views : 1,
                            createdAt: 1,
                            owner: 1
                        }
                    }
                   
                ]
            } 
        },
        {
            $unwind: {
                path: "$video"
            }
        },
        {
            $project: {
                video: 1,
                likedBy: 1,
            }
        }
    ])

    if(!likedVideos || likedVideos.length === 0) {
        throw new ApiError(404, "No liked videos found for this user")
    }

    return res.status(200).json(
        ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}