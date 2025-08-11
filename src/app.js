import express from "express";
import cors from "cors";
// (not using as of now)
// import helmet from "helmet";
// import morgan from "morgan";

//Perform CRUD operation in user's browser
import cookieParser from "cookie-parser";
// 🛠️ Custom Middleware
import notFoundHandler from "./middlewares/notFoundHandler.js";
import errorHandler from "./middlewares/errorHandler.js";



const app = express();


// 🔐 Security Headers
// Helmet sets various HTTP headers to protect against common vulnerabilities
// app.use(helmet());


// 📋 Logging (Development Only)
// Morgan logs HTTP requests in a readable format
// if (process.env.NODE_ENV === "development") {
//     app.use(morgan("dev"));
// }


// To use middleware/configuration
// Enable CORS with credentials and dynamic origin
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
}));

// Parse incoming JSON requests (limit to 16kb)
app.use(express.json({ limit: "16kb" }));

// Parse URL-encoded form data (limit to 16kb)
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Serve static files from the "public" directory
app.use(express.static("public"));

// Parse cookies from incoming requests
app.use(cookieParser());


// 🛣️ Routes import
// we can only give any name according to own, when it is export default
import userRouter from "./routes/user.routes.js";
// routes declaration
app.use("/api/v1/users", userRouter);

// http://localhost:8000/api/v1/users/register





// ❌ Catch-All 404 Handler
// Handles any undefined routes and sends a structured 404 response
app.use(notFoundHandler);

// 🧯 Global Error Handler
// Error-handling middleware (should be last)
app.use(errorHandler);


export { app };