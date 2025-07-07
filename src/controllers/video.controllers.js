import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {Video} from "../models/video.model.js"
import { deleteFromCloudinary } from "../utils/cloudinary.js";
import { isValidObjectId } from "mongoose";

const getAllVideo =  asyncHandler( async (req, res) => {
    const { page = 1 ,
            limit = 10, 
            query = '', 
            sortBy = 'createdAt', 
            sortType = 'desc', 
            userId
    } = req.query
    
    //TODO: get all videos based on query, sort, pagination
    // steps
    // use match for query on the basis of title or description or i think we can do channel also
    // perfom lookup for the user details for the video like username, avatar, etc
    // project the details of the user
    // use sort to sort the videos
    // for pagination use page and limit to calculate skip and limit

    const video = Video.aggregate([
        {
            $match: {
                $or: [
                    { title : { $regex: query, $options: 'i' } },
                    { description : { $regex: query, $options: 'i' } }
                ]
            }
            
        },
        {
            $lookup:{
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'createdBy',
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullName: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                createdBy: { 
                    $arrayElemAt: "$createdBy", 
                }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPubliced: 1,
                createdAt: 1,
                videoFile: 1,
                thumbnail: 1,
                'createdBy.username': 1,
                'createdBy.avatar': 1,
                'createdBy.fullName': 1
            }
        },
        {
            $match: {
                isPubliced: true
            }
        },
        {
            $match: userId ? { owner: new mongoose.Types.ObjectId(userId) } : {}
        },
        {
            $sort: {
                [sortBy]: sortType === 'asc' ? 1 : -1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: parseInt(limit)
        }
    ])

    if(!video.length) {
        return new ApiError(404, 'No videos found')
    }

    return res.status(200).json(
            new ApiResponse(200, video[0] ,'Videos fetched successfully')
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if(!title || !description) {
        return new ApiError(400, 'Title and description are required')
    }

    let videoFileLocalPath = req?.files?.videoFile?.[0]?.path;
    let thumbnailLocalPath = req?.files?.thumbnail?.[0]?.path;

    if(!videoFileLocalPath || !thumbnailLocalPath) {
        return new ApiError(400, 'Video file and thumbnail are required')
    }

    let videoFile;
    try {
        videoFile = await uploadOnCloudinary(videoFileLocalPath);
        if(!videoFile) {
            throw new ApiError(500, 'Error uploading video file to cloud')
        }
    } catch (error) {
        console.error('Error uploading video file:', error);
        throw new ApiError(500, 'Error uploading video file')
    }

    console.log('Video file uploaded successfully:', videoFile);
    

    let thumbnail;
    try {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if(!thumbnail) {
            throw new ApiError(500, 'Error uploading thumbnail to cloud')
        }
    } catch (error) {
        console.error('Error uploading thumbnail:', error);
        throw new ApiError(500, 'Error uploading thumbnail')
    }

    console.log('Thumbnail uploaded successfully:', thumbnail);
    

    try {
        const video = await Video.create({
            videoFile: videoFile.url,
            thumbnail: thumbnail.url,
            title,
            description,
            duration: videoFile.duration, // TODO: calculate duration from video file
            owner: req.user._id
        })
    
        if (!video) {
            throw new ApiError(500, 'Error creating video')
        }

        return res.status(201).json(
            new ApiResponse(201, video, 'Video created successfully')
        )
    } catch (error) {
        console.error('Error uploading video:', error);

        if (videoFile) {
            // Delete the video file from Cloudinary if it was uploaded
            await deleteFromCloudinary(videoFile?.public_id);
        }

        if (thumbnail) {
            // Delete the thumbnail from Cloudinary if it was uploaded
            await deleteFromCloudinary(thumbnail?.public_id);
        }

        return res.status(500).json(
            new ApiResponse(500, 'Something went wrong while uploading the video and video file and thumbnail deleted', 'Error creating video')
        )
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    const video = await Video.findById(videoId)
        .populate('owner', 'username avatar fullName')
        .select('-__v -createdAt -updatedAt')
    
    if(!video) {
        return new ApiError(404, 'Video not found')
    }

    return res.status(200).json(
        new ApiResponse(200, video, 'Video fetched successfully')
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const { title, description } = req.body

    const newThumbnailLocalPath = req?.file?.thumbnail?.[0]?.path;

    if(!title || !description) {
        return new ApiError(400, 'Title and description are required')
    }

    if(!newThumbnailLocalPath) {
        return new ApiError(400, 'Thumbnail is required')
    }

    const video = await Video.findById(videoId)

    if(!video) {
        return new ApiError(404, 'Video not found')
    }

    if(video.owner.toString() !== req.user._id.toString()) {
        return new ApiError(403, 'You are not allowed to update this video')
    }

   try {
     await deleteFromCloudinary(video.thumbnail)
   } catch (error) {
     console.error('Error deleting thumbnail from Cloudinary:', error)
   }

   
    let newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath);
         
    if(!newThumbnail) {
        throw new ApiError(500, 'Error uploading thumbnail to cloud')
    }

    const updatedVideo = await Video.findByIdAndUpdate(videoId, {
        $set: {
            title,
            description,
            thumbnail: newThumbnail.url
        }
    });

    if(!updatedVideo) {
        return new ApiError(500, 'Error updating video')
    }

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, 'Video updated successfully')
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!videoId || !isValidObjectId(videoId)) {
        return new ApiError(400, 'Video ID is required')
    }

    const video = await Video.findById(videoId)
    if(!video) {
        return new ApiError(404, 'Video not found')
    }

    if(video.owner.toString() !== req.user._id.toString()) {
        return new ApiError(403, 'You are not allowed to delete this video')
    }

    const deletedVideoFile = await deleteFromCloudinary(video.videoFile);
    console.log('deletedVideoFile', deletedVideoFile);

    if(!deletedVideoFile || deletedVideoFile?.result !== 'ok') {
        return new ApiError(500, 'Error deleting video file from cloud')
    }

    const deletedThumbnail = await deleteFromCloudinary(video.thumbnail);
    console.log('deletedThumbnail', deletedThumbnail);

    if(!deletedThumbnail || deletedThumbnail?.result !== 'ok') {
        return new ApiError(500, 'Error deleting thumbnail from cloud')
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if(!deletedVideo) {
        return new ApiError(500, 'Error deleting video')
    }

    return res.status(200).json(
        new ApiResponse(200, deletedVideo, 'Video deleted successfully')
    )

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId || !isValidObjectId(videoId)) {
        return new ApiError(400, 'Video ID is required')
    }

    const video = await Video.findById(videoId)

    if(!video) {
        return new ApiError(404, 'Video not found')
    }

    if(video.owner.toString() !== req.user._id.toString()) {
        return new ApiError(403, 'You are not allowed to update this video')
    }

    const videoPublishStatus = await Video.findByIdAndUpdate(videoId, {
        $set: {
            isPubliced: !video.isPubliced,
        }
    })

    if(!videoPublishStatus) {
        return new ApiError(500, 'Error updating video publish status')
    }

    return res.status(200).json(
        new ApiResponse(200, videoPublishStatus, 'Video publish status updated successfully')
    )
})


export { getAllVideo, publishAVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus };

    