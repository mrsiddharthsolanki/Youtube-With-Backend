import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const {name, description} = req.body

    if(!name || !description) {
        return ApiResponse.error(res, "Name and description are required", 400)
    }

    const {userId} = req.user._id;

    if(!isValidObjectId(userId)) {
        return ApiResponse.error(res, "Invalid user ID", 400)
    }

    const playlist = await Playlist.create({
        name,
        description,
        user: userId,
    })

    if(!playlist) {
        return ApiResponse.error(res, "Error creating playlist", 500)
    }

    return res.status(201).json(
        ApiResponse(201, playlist, "Playlist created successfully")
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    
    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    const playlists = await Playlist.find({owner: userId}).populate('videos')
    .populate('user', 'username profilePicture');

    if(!playlists || playlists.length === 0) {
        return ApiResponse.error(res, "No playlists found for this user", 404)
    }

    return res.status(200).json(
        ApiResponse(200, playlists, "Playlists fetched successfully")
    )

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if(!isValidObjectId(playlistId)) {
        return ApiResponse.error(res, "Invalid playlist ID", 400)
    }

    const playlist = await Playlist.findById(playlistId)
        .populate('videos')
        .populate('owner', 'username profilePicture');

    if(!playlist) {
        return ApiResponse.error(res, "Playlist not found", 404)
    }

    return res.status(200).json(
        ApiResponse(200, playlist, "Playlist fetched successfully")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!playlistId || !videoId 
        ||!isValidObjectId(playlistId) 
        ||!isValidObjectId(videoId)
    ) {
        throw new ApiError(400, "Invalid playlist or video ID")
    }

    const playlist = await Playlist.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $addFields: {
                video :{
                    $setUnion: [
                        "$videos",
                        [new mongoose.Types.ObjectId(videoId)]
                    ]
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                videos: "$video",
                owner: 1
            }
        },
        {
            $merge: {
                into: "playlists",
                whenMatched: "replace"
            }
        }
    ])

    console.log('playlist', playlist);
    

    if(!playlist || playlist.length === 0) {
        throw new ApiError(404, "Playlist not found")
    }

    return res.status(200).json(
        ApiResponse(200, playlist[0], "Video added to playlist successfully")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if(!playlistId || !videoId 
        ||!isValidObjectId(playlistId)
        ||!isValidObjectId(videoId)
    ) {
        throw new ApiError(400, "Invalid playlist or video ID")
    }

    const removeVideoFromPlaylist = await Playlist.findByIdAndDelete(playlistId, {
        $pull: {
            videos: videoId
        }
    }
    ).populate('videos').populate('owner', 'username profilePicture')

    if(!removeVideoFromPlaylist) {
        throw new ApiError(404, "Playlist not found")   
    }

    return res.status(200).json(
        ApiResponse(200, removeVideoFromPlaylist, "Video removed from playlist successfully")
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if(!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)

    if(!deletedPlaylist) {
        throw new ApiError(404, "Playlist not found")
    }

    return res.status(200).json(
        ApiResponse(200, deletedPlaylist, "Playlist deleted successfully")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
        name,
        description
    }, { new: true })

    if(!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found")
    }

    return res.status(200).json(
        ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
