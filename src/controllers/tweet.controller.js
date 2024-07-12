import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async(req, res) => {
    const { content } = req.body

    if(!content){
        throw new ApiError(400, "content is required")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    if (!tweet){
        throw new ApiError(400, "something went wrong please try again")
    }

    return res.status(200).json(
        new ApiResponse(200, tweet, "tweet successfully created.")
    )
})

const getUserTweets =asyncHandler(async(req, res) => {
    const { userId } = req.params
    
    if (!userId){
        throw new ApiError(400, "Invalid user Id.")
    }

    const getTweets = await Tweet.aggregate([
        {
            $match: {owner: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
                pipeline: [
                    {$project: {
                        fullName: 1,
                        username: 1,
                        avatar: 1,
                        email: 1,
                        coverImage: 1
                    }}
                ]
            }
        }
    ])

    if (!getTweets.length){
        throw new ApiError(404, "No tweets found.")
    }

    return res.status(200).json(
        new ApiResponse(200, getTweets, "user tweets get successfully.")
    )
})

const updateTweet = asyncHandler(async(req, res) => {
    const { tweetId } = req.params 
    const { content } = req.body 

    if (!tweetId){
        throw new ApiError(400, "incorrect tweet id.")
    }

    if (!content){
        throw new ApiError(400, "content is required")
    }

    const updateContent = await Tweet.findByIdAndUpdate(tweetId, {
        content,
    })

    return res.status(200).json(
        new ApiResponse(200, updateContent, "updated tweet data successfully.")
    )
})

export {createTweet, getUserTweets, updateTweet}