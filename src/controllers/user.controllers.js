import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefereshTokens = async(userID) => {
    try {
        const user = await User.findById(userID);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave : false });

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Error generating access and refresh tokens");
    }
}

const registerUser = asyncHandler( async (req, res) => {
    //Todo get User Details form frontend 
    //? Validation  - not empty
    //* check if user already Exists : userName, Password
    //! check Cover Iamges & avtar
    //Todo Uplode Them TO the Cloudnariy avatar
    //? Create user Object  - Create  entey in DB
    //* Remove the password and refresh token fileds for form responce
    //! check for the user creation
    //Todo return responce

    console.log("req.body",req.body);
    

    const {fullName, email, password, username} = req.body
    // console.log("Register User Details:", {fullName, email, password, username});

    if(
        [fullName,email,password,username].some((field) => field?.trim() === "" )
    ){
        throw new ApiError(400, "All fields are required");
    }

    const exisrtedUSer = await User.findOne({
        $or: [{ username }, { email }]
    })

    // console.log("Existed User:", exisrtedUSer);
    
    if(exisrtedUSer){
        throw new ApiError(409, "User already exists with this username or email");
    }

    // console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0].path;
    // const coverImageLocalPath =  req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    // console.log("avatarLocalPath", avatarLocalPath);

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar File Is Required")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "avatar File Is Required")
    }

    const user = await User.create({
        fullName,
        avatar :avatar?.url ,
        coverImage : coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // console.log("createdUser", createdUser);

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Crreated Successfully")
    )


})

const loginUser = asyncHandler( async (req, res) => {
    // req body -> data
    // userName or email
    // find the user 
    // cheack the password
    // access token and refesh token
    // send cookies 
    
    const { username, email, password} = req.body;
    console.log(email);  
    

    if(! username && !email){
        throw new ApiError(400, "Username or email is required for login");
    }

    const user =  await User.findOne(
        {
            $or: [{username} , {email}]
        }
    )

    if(!user){
        throw new ApiError(404, "User Not Exist")
    }

    const isPasswordVaild  =  await user.isPasswordCorrect(password)

    if(!isPasswordVaild){
        throw new ApiError(401, "Invalid Password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser, accessToken, refreshToken
            },
            "User Logged In Successfully"
        )
    )
} )

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset : {
                refreshToken : 1 // this removes the field from document
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure: true
    }
    
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {} ,"User Logged Out"))
})

const refeshAccessToken = asyncHandler( async (req,res) => {
    const incomingRefeshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefeshToken){
        throw new ApiError(401, "Unauthorized Reqest")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefeshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefeshToken !== user?.refreshToken){
            throw new ApiError(402, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken ,newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken , refreshToken : newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(new ApiResponse(200, {} , "Password Change Succfully"))

})

const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})


const updateAccountDetails =  asyncHandler ( async (req, res) => {
    const { fullName, email } = req.body;

    if(!fullName && !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName,email
            }
        },{
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler( async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar File Missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar?.url){
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {
            new :true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        ApiResponse(200,user, "Avtar Image Updated successfully")
    )
})

const updateUserCoverImg = asyncHandler( async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Avatar File Missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage?.url){
        throw new ApiError(400, "Error while uploading on coverImage")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {
            new :true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        ApiResponse(200,user, "Cover Image Updated successfully")
    )
})

const getUserChannelProfile = asyncHandler ( async (req, res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField: "_id",
                foreignField : "channel",
                as: "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField: "_id",
                foreignField : "subscribers",
                as: "$subscribedTo"
            }
        },
        {
            $addFields : {
                subscriberCount : {
                    $size : "$subscribers"
                },
                channelSubscriberCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed: {
                    $cond : {
                        if : {$in :[ req.user?._id, "$subscribers.subscriber"]},
                        then :  true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                fullName : 1,
                username : 1,
                subscriberCount : 1,
                channelSubscriberCount :1,
                isSubscribed: 1,
                avatar :1,
                coverImage :1,
                email : 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError (404, "channle Does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler( async( req, res) => {
    const user = await User.aggregate([
        {
            $match : {
                _id : mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup : {
                from : "vidoes",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField: "onwer",
                            foreignField : "_id",
                            as : "onwer",
                            pipeline : [
                                {
                                    $project : {
                                        fullName : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$onwer" 
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully")
    )

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refeshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImg,
    getUserChannelProfile,
    getWatchHistory
}