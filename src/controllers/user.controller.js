import asyncHandler from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import fs from "fs"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken = async (userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong fetching while generate token.")
    }
}
const registerUser = asyncHandler(async (req, res) => {
    const {fullName,email, username, password} = req.body
    
    if (
        [fullName, email, username, password].some((filed) => filed?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const exitedUser = await User.findOne({
        $or:[{username}, {email}]
    })

    
    const avatarLocalPath = req.files?.avatar[0]?.path 
    // const coverImageLocalPath = req.files?.coverImage[0]?.path 
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {coverImageLocalPath = req.files.coverImage[0].path}
    console.log(req.files.coverImage[0].path)
    
    if (exitedUser){
        fs.unlinkSync(coverImageLocalPath)
        fs.unlinkSync(avatarLocalPath)
        throw new ApiError(409, "user email or username exists")
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        username : username.toLowerCase(),
        fullName,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser){
        throw new ApiError(500, "Something went wrong while restering.")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // user - email 
    // correct email, name
    // find the user 
    // check password
    // get access and refreshtoken
    // send cookie

    const {username, email, password} = req.body 

    if (!username || !email) {
        throw new ApiError(400, "username or email is incorrect")
    }

    const user = await User.findOne({
        $or : [{username}, {email}]
    })

    if (!user){
        throw new ApiError(404, "User doesn't exist")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid){
        throw new ApiError(400, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly: true,
        secure: true
    }

    return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken}, "User loggedin Successfully"))


})

const logoutUser = asyncHandler(async (req, res) => 
    {
        await User.findByIdAndUpdate(req.user._id, 
            {
                $unset: req.refreshToken = undefined                    
            }, 
            {
                new: true
            }
        )
        const options ={
            httpOnly: true,
            secure : true
        }
        res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "logout Successfully"))
    }

    

)

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthourizes request")
    }

    try {
        const decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedRefreshToken._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "refresh Token is exp or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = generateAccessAndRefreshToken(user._id)
    
        return res.status(200)
        .cookie("refreshToken", options).json(new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access token is Refreshed"))
    } catch (error) {
        throw new ApiError(400, error?.message || "Invalid refresh Token")
    }

})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword, newPassword} = req.body 

    const user = await User.findById(req.user?._id) 
    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid){
        throw new ApiError(400, "Enter old password is invalid")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(200, {}, "password updated successfully."))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "current user fetched successfully."))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body
    if (!fullName && !email){
        throw new ApiError(400, "all fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id, {
            $set: {fullName, email}
        },
        {new : true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Update user credentails successfully"))

})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path 
    if (!avatarLocalPath){
        throw new ApiError(400, "avatar is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "avatar url is not avilable")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {avatar: avatar.url}
        }, {
            new: true
        }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Avatar Image updated Successfully"))
})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path 
    if (!coverImageLocalPath){
        throw new ApiError(400, "avatar is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "avatar url is not avilable")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {coverImage: coverImage.url}
        }, {
            new: true
        }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Avatar Image updated Successfully"))
})

const getUserChannelProfile = asyncHandler(async (req,res) =>{
    const {username} = req.params 

    if (!username?.trim()){
        throw new ApiError(400, "user is not exists")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField:"channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as: "channelSubscribedTo"
            }
        },
        {
            $addFields:{
                subscribesCount:{
                    $size: "$subscribers"
                },
                channelSubscribedToCount:{
                    $size: "$channelSubscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $project:{
                fullName:1,
                username:1,
                avatar:1,
                subscribesCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed:1,
                coverImage:1,
                password:1,
                email:1
            }
        }
    ])

    if (!channel){
        throw new ApiError(404, "Channel not Exists")
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "User fetched details successfully"))
})

const getWatchHistory = asyncHandler(async (req,res) => {
    const user = await User.aggregate([
        {
            $match: {_id: new mongoose.Types.ObjectId(req.user._id)}
        },
        {
            $lookup: {
                from: "videos",
                localField:"watchHistory",
                foreignField:"_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username:1,
                                        avatar: 1
                                    },
                                    $addFields:[{$fist:"$owner"}]
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "watch history fetched successfully"))
})

export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateCoverImage, getUserChannelProfile, getWatchHistory}