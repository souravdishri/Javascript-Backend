import { Router } from "express";
//we can import like this when it is not export in defa
import { registerUser } from "../controllers/user.controller.js";

const router = Router()


router.route("/register").post(registerUser)


export default router