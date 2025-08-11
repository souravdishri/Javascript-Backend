// src/routes/user.routes.js

import { Router } from "express";
//we can import like this when it is not export in default
import { registerUser } from "../controllers/user.controller.js";

const router = Router()


router.route("/register").post(registerUser)


export default router



// This `router` is a `mini Express app` that handles routes like `/register`. 
// When you export default router, you're saying:
// “Here’s a bundle of routes—ready to be plugged into the app.js file.” 

// here we are exporting this router instance as the default export from this file and importing it in `app.js`
// (importing the default export from `user.routes.js` and calling it `userRouter`)

// Because `we can name default imports anything we want`.
// Even though we exported it as router, we are not importing a variable called `router`, 
// we are importing the default export, and giving it a name locally `(userRouter)` to make your our readable and meaningful.