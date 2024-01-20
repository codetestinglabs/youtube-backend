import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateToken = async (userID) => {
    try {
        const user = await User.findById(userID)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // Store Refresh Token On User table
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        // Return tokens
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went worng when generating token")
    }
}

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

const login = asyncHandler(async (req, res) => {
    // Get User Details
    const {email, username, password} = req.body
    console.log(email);
    // Check Empty
    if (!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    // Find User by email or username
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(400, "User does not exist")
    }

    // Verify User passowrd
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!user) {
        throw new ApiError(400, "Credentials does not match")
    }

    // Create access and refresh token
    const { accessToken, refreshToken } = await generateToken(user._id)

    // User with Refresh Token
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // send cookie
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged In Successfully")
    )
})

const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {$set: {refreshToken: undefined}},{new: true})

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshToken = asyncHandler(async (req, res) => {
    const userRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!userRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(userRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (userRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken, newRefreshToken } = await generateToken(user._id)
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, { accessToken, newRefreshToken }, "Access Token Refreshed")
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

export { register, login, logout, refreshToken }