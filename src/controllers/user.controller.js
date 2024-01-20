import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const register = asyncHandler(async (req, res) => {
    // Get User Details
    const {fullname, email, username, password} = req.body

    // Validation not empty
    if (
        [fullname, username, email, password].some((field) => field?.trim() == "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // Check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exist.")
    }

    // Check for image, avatar
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverLocalPath = req.files?.cover[0]?.path

    let coverLocalPath;
    if (req.files && Array.isArray(req.files.cover) && req.files.cover.length > 0) {
        coverLocalPath = req.files.cover[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }


    // Upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const cover = await uploadOnCloudinary(coverLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    // Create user object, create entry in db
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        cover: cover?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })


    // Remove password and refressh token from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    // Check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )        
})

export { register }