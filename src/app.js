import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

// cors config
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// Express Config
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))

// Cookie Parser
app.use(cookieParser())

// Routes import
import userRouter from "./routes/user.routes.js"

// Routes declaration
app.use("/api/v1/users", userRouter)

export { app }