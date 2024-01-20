import { Router } from "express";
import { login, logout, refreshToken, register } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { auth } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(
        upload.fields([
            {
                name: "avatar",
                maxCount: 1
            },
            {
                name: "cover",
                maxCount: 1
            }
        ]),
        register
)

router.route("/login").post(login)

// Secure Routes
router.route("/logout").get(auth, logout)
router.route("/refresh-token").post(refreshToken)

export default router