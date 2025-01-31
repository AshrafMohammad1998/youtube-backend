import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTweet, getUserTweets, updateTweet } from "../controllers/tweet.controller.js"

const router = Router()
router.use(verifyJWT)

router.route("/").post(createTweet)
router.route("/:userId").get(getUserTweets)
router.route("/:tweetId").patch(updateTweet)

export default router