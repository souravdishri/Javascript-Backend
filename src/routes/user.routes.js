// src/routes/user.routes.js

import { Router } from "express";
//we can import like this when it is not export in default
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()


router.route("/register").post(
    // mostly middlewares are used to add more fields to the request object

    // `upload` is a middleware that handles file uploads using multer
    // `upload.fields` is used to handle multiple file uploads with different field names
    // `avatar` and `coverImage` are the field names in the form
    // `maxCount` is used to limit the number of files that can be uploaded for each field
    
    // `req.files` will contain the uploaded files, where `avatar` and `coverImage` are arrays of files
    // `req.files.avatar[0].path` is used to get the path of the uploaded avatar file
    // `req.files.coverImage[0].path` is used to get the path of the uploaded cover image file
    
    // `uploadOnCloudinary` is a function that uploads the file to Cloudinary and returns the response
    upload.fields([
        {
            name: "avatar", 
            maxCount: 1 
        },
        { 
            name: "coverImage", 
            maxCount: 1 
        }
    ]),
    registerUser
)


export default router



// This `router` is a `mini Express app` that handles routes like `/register`. 
// When you export default router, you're saying:
// “Here’s a bundle of routes—ready to be plugged into the app.js file.” 

// here we are exporting this router instance as the default export from this file and importing it in `app.js`
// (importing the default export from `user.routes.js` and calling it `userRouter`)

// Because `we can name default imports anything we want`.
// Even though we exported it as router, we are not importing a variable called `router`, 
// we are importing the default export, and giving it a name locally `(userRouter)` to make your our readable and meaningful.