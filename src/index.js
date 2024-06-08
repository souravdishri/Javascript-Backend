// require('dotenv').config({path: './env'})    //V.OLD

//import dotenv from "dotenv"                   //OLD
// "dev": "nodemon -r dotenv/config --experimental-json-modules src/index.js"   //OLD

// "dev": "nodemon --env-file=.env src/index.js"    //NEW
// process.loadEnvFile()                            //NEW
// console.log(process.env.PORT)                    //NEW

import connectDB from "./db/index.js";
import express from "express"
const app = express()
//import {app} from './app.js'                      //OLD
// dotenv.config({
//     path: './.env'
// })



connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})










/*
import express from "express"
const app = express()
;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()

*/