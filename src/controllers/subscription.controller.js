import mongoose, {isValidObjectId} from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Subscription } from "../models/subscription.model.js";

const toggleSubscription = asyncHandler( async (req, res) => {
    const {channelId} = req.params

    if (!isValidObjectId(channelId)){
        throw new ApiError(400, "channel id is invalid")
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })
    
    if (!isSubscribed) {
        await Subscription.create({
            subscriber: req.user?._id,
            channel: channelId
        })

        return res.status(200)
            .json(new ApiResponse(200, {subscribe: true}, "Subscribed to channel"))
    } else {
        await Subscription.findByIdAndDelete(isSubscribed._id)

        return res.status(200)
            .json(new ApiResponse(200,{subscribe : false}, "UnSubscribed to channel"))
    }
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if (!isValidObjectId(channelId)){
        throw new ApiError(400, "channel id is invalid")
    }

    const subscribersList = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(channelId) }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "subscriber",
                            foreignField: "_id",
                            as: "subscriberDetails",
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
                    {
                        $unwind: "$subscriberDetails"
                    },
                    {
                        $project: {
                            "subscriberDetails._id": 1,
                            "subscriberDetails.username": 1,
                            "subscriberDetails.email": 1,
                            "subscriberDetails.fullName": 1,
                            "subscriberDetails.avatar": 1,
                            "subscriberDetails.coverImage": 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscribers"
        },
        {
            $group: {
                _id: "$_id",
                subscribersDetails: { 
                    $push: {
                        _id: "$subscribers.subscriberDetails._id",
                        username: "$subscribers.subscriberDetails.username",
                        email: "$subscribers.subscriberDetails.email",
                        fullName: "$subscribers.subscriberDetails.fullName",
                        avatar: "$subscribers.subscriberDetails.avatar",
                        coverImage: "$subscribers.subscriberDetails.coverImage",
                        createdAt: "$subscribers.createdAt"
                    }
                },
                subscribersCount: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 1,
                subscribersDetails: 1,
                subscribersCount: 1
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            subscribersList[0],
            "Subscribers list fetched successfully"
        ))

    
})
// const getSubscribedChannels = asyncHandler(async (req, res) => {
//     const { channelId } = req.params

//     if (!isValidObjectId(channelId)) {
//         throw new APIError(400, "Channel Id is invalid")
//     }

//     const subscribersList = await User.aggregate([
//         {
//             $match: { _id: new mongoose.Types.ObjectId(channelId) }
//         },
//         {
//             $lookup: {
//                 from: "subscriptions",
//                 localField: "_id",
//                 foreignField: "channel",
//                 as: "subscribers",
//                 pipeline: [
//                     {
//                         $lookup: {
//                             from: "users",
//                             localField: "subscriber",
//                             foreignField: "_id",
//                             as: "subscriberDetails",
//                             pipeline: [
//                                 {
//                                     $project: {
//                                         fullName: 1,
//                                         username: 1,
//                                         avatar: 1,
//                                         email: 1,
//                                         coverImage: 1
//                                     }
//                                 }
//                             ]
//                         }
//                     },
//                     {
//                         $unwind: "$subscriberDetails"
//                     },
//                     {
//                         $project: {
//                             createdAt: 1,
//                             updatedAt: 1,
//                             subscriberDetails: 1
//                         }
//                     }
//                 ]
//             }
//         },
//         {
//             $addFields: {
//                 subscribersCount: {
//                     $size: "$subscribers"
//                 },
//             }
//         },
//         {
//             $project: {
//                 subscribers: 1,
//                 subscribersCount: 1
//             }
//         }
//     ])

//     console.log(subscribersList, "subscribersList")

//     return res
//         .status(200)
//         .json(new ApiResponse(
//             200,
//             subscribersList[0],
//             "Subscribers list fetched successfully"
//         ))
// })

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {subscriberId} = req.params

    const subscribedList = await User.aggregate([
        {
            $match: {_id: new mongoose.Types.ObjectId(subscriberId)}
        },
        {
            $lookup: {
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as: "subscribeTo",
                pipeline: [
                    {
                        $lookup: {
                            from:"users",
                            localField:"channel",
                            foreignField:"_id",
                            as:"subscribedToDetails",
                            pipeline: [
                                {$project: {
                                    fullName: 1,
                                    username: 1,
                                    avatar: 1,
                                    email: 1,
                                    coverImage: 1
                                }}
                            ]
                        },
                        
                    }
                ]
            },   
        },
        {
            $project: {
                subscribeTo:1 
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, subscribedList[0], "sucessfully fetched subscribedTo List"))
})



export {getSubscribedChannels, toggleSubscription, getUserChannelSubscribers}