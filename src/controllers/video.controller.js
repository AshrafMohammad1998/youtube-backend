import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { updateOnCloudinary, uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const publishAVideo = asyncHandler(async (req, res) => {
    const {title, description} = req.body

    if ([title, description].some((field) => field.trim() === "")){
        throw new ApiError(400, "All fields are required")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]

    const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (!allowedImageMimeTypes.includes(thumbnailLocalPath.mimetype)) {
        throw new ApiError(400, "Invalid thumbnail file type. Only JPEG, PNG, and GIF are allowed.");
    }

    if (!videoLocalPath){
        throw new ApiError(400, "video file is required")
    }

    if (!thumbnailLocalPath){
        throw new ApiError(400, "thumbnail file is required")
    }

    const video = await uploadOnCloudinary(videoLocalPath, req.user.email)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath.path, req.user.email)

    if (!video){
        throw new ApiError(400, "video file is required")
    }
    

    if (!thumbnail){
        throw new ApiError(400, "thumbnail file is required")
    }

    const videoData = await Video.create({
        title,
        description,
        videoFile: video.url,
        videoPublicId: video.public_id,
        thumbnail: thumbnail.url,
        thumbnailPublicId: thumbnail.public_id,
        duration: video.duration.toFixed(2),
        owner: req.user?._id
    })

    return res.status(201).json(
        new ApiResponse(200, videoData, "Video Uploaded Sucessfully")
    )
})

const getVideoById  = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    if (!isValidObjectId(videoId)){
        throw new ApiError(400, "invalid video details")
    }

    const video = await Video.findById(videoId)

    if (!video){
        throw new ApiError(500, "something went wrong while fetching video details")
    }

    return res.status(200).json(
        new ApiResponse(200, video, "video data fetched sucessfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "videoId is required")
    }

    if (!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid VideoID")
    }

    const {title, description} = req.body
    if ([title, description].some((field) => field === "" )){
        throw new ApiError(400, "All fields are required")
    }

    const oldVideoData = await Video.findById(videoId)
    const oldThumbnailId = await oldVideoData.thumbnailPublicId
    
    const thumbnailLocalPath = req.file

    const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (!allowedImageMimeTypes.includes(thumbnailLocalPath?.mimetype)) {
        throw new ApiError(400, "Invalid thumbnail file type. Only JPEG, PNG, and GIF are allowed.");
    }

    if (!thumbnailLocalPath){
        throw new ApiError(400, "thumbnail path is reqired")
    }
    const thumbnail = await updateOnCloudinary(oldThumbnailId, thumbnailLocalPath.path, req.user?.email)


    const updatedVideoData = await Video.findByIdAndUpdate(videoId,{

        title,
        description,
        thumbnail: thumbnail.url,
        thumbnailPublicId: thumbnail.public_id
    })

    return res.status(200).json(
        new ApiResponse(200, updatedVideoData, "updated video data sucessfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "Invalid videoId")
    }

    const videoData = await Video.findById(videoId)

    if (!videoData){
        throw new ApiError(400, "Invalid Id exists")
    }

    const { videoPublicId, thumbnailPublicId } = videoData;

    const delVideoPath = await deleteFromCloudinary(videoPublicId, "video");

    if (!delVideoPath) {
        throw new ApiError(500, "something went wrong while deleting video");
    }

    const delThumbnailPath = await deleteFromCloudinary(thumbnailPublicId, "image");
    if (!delThumbnailPath) {
        throw new ApiError(500, "something went wrong while deleting thumbnail");
    }

    await Video.findByIdAndDelete(videoId)

    return res.status(200).json(
        new ApiResponse(200, {}, "Video sucessfully deleted")
    )
})

const togglePublishStatus = asyncHandler(async(req, res) => {
    const {videoId} = req.params

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400, "video id is incorrect")
    }

    const updateVideoStatus = await Video.findByIdAndUpdate(videoId, {
        isPublished: !video.isPublished
    })

    if (!updateVideoStatus){
        throw new ApiError(400, "updateToggle is went wrong")
    }

    return res.status(200).json(
        new ApiResponse(200, updateVideoStatus, "video sucessfully toggled")
    )
})

const getAllVideos = asyncHandler(async(req, res) => {
    const { page = 1, limit = 3, query = "", sortBy = "updatedAt", sortType = "asc", userId } = req.query

    const videoAggregationPipeline = [
        {
            $match: {
                $or: [
                    { title: {$regex: query, $options: "i"} },
                    {description: {$regex: query, $options: "i"} }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            username: 1,
                            email: 1,
                            fullName: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$userDetails"
        },
        {
            $sort: { [sortBy]: sortType === "asc"? 1 : -1 }
        }
    ]

    const paginationOptions = {
        page: page,
        limit: limit,
    }

    const videos = await Video.aggregatePaginate(Video.aggregate(videoAggregationPipeline), paginationOptions)

    if (!videos) {
        throw new ApiError(500, "Something went wrong while paginating")
    }

    return res.status(200).json(
        new ApiResponse(200, videos, "data fetched successfully")
    )
    
})

const getUserVideos = asyncHandler(async(req, res) => {
    const { userId } = req.params

    // const getVideos = await Video.find( {owner: userId} )
    
    // if (!getVideos.length) {
    //     throw new ApiError(404, "No videos found from this user")
    // }

    const getVideos = await Video.aggregate([
        {
            $match: {owner: new mongoose.Types.ObjectId(userId)}
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            email: 1,
                            coverImage: 1
                        }
                    }
                ]
            }
        },
    ])

    return res.status(200).json(
        new ApiResponse(200, getVideos, "Videos fetch Success.")
    )
})

export {publishAVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus, getAllVideos, getUserVideos}