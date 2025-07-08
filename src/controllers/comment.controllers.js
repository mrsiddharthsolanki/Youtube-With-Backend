import mongoose from "mongoose";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { Comment } from "../models/comment.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    

    if(!videoId || !mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const totalComments = await Comment.aggregate([
        {
            $match : {
                video: mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "createdBy",
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
            $addFields: {
                createdBy: {
                    $first: "$createdBy"
                }
            }
        },
        {
            $unwind: "$createdBy"
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                createdBy: 1
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: parseInt(limit)
        },
       
    ])

    if(!totalComments || totalComments.length === 0){
        return res.status(200).json(
            new ApiResponse(200, {comments: [], total: 0}, "No comments found for this video")
        )
    }

    res.status(200).json(
        new ApiResponse(200, {comments: totalComments, total: totalComments.length}, "Comments fetched successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const { videoId } = req.params;
    const { content } = req.body;

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    });

    if (!comment) {
        throw new ApiError(500, "Failed to add comment");
    }


    res.status(201).json(
        new ApiResponse(201, comment, "Comment added successfully")
    );
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const { content } = req.body;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required");
    }

    const userId = req.user._id;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    if(!comment.owner.equals(userId)) {
        throw new ApiError(403, "You are not authorized to update this comment");
    }

    const comment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content,
                updatedAt: Date.now()
            }
        },
        { new: true }
    )

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    res.status(200).json(
        new ApiResponse(200, comment, "Comment updated successfully")
    );
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const { commentId } = req.params;
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const userId = req.user._id;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    if(!comment.owner.equals(userId)) {
        throw new ApiError(403, "You are not authorized to delete this comment");
    }

    const deletedcomment = await Comment.findByIdAndDelete(commentId);

    if (!deletedcomment) {
        throw new ApiError(404, "Comment not found");
    }

    res.status(200).json(
        new ApiResponse(200, deletedcomment, "Comment deleted successfully")
    );
})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}