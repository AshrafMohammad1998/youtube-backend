import { publishAVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus, getAllVideos, getUserVideos } from "../controllers/video.controller.js"
import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router()
router.use(verifyJWT)

router.route("/").get(getAllVideos).post(upload.fields([
    {
        name:"videoFile",
        maxCount: 1,
    },
    {
        name:"thumbnail",
        maxCount: 1,
    }
]), publishAVideo);

router.route("/:videoId").get(getVideoById).patch(upload.single("thumbnail"), updateVideo).delete(deleteVideo)
router.route("/toggle/publish/:videoId").patch(togglePublishStatus)

router.route("/videos/:userId").get(getUserVideos)

export default router