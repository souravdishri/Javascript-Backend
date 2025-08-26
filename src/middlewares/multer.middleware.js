import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")   // specify the destination folder for uploaded files
    },
    filename: function (req, file, cb) {
        // Add timestamp to filename for uniqueness
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))

        // cb(null, file.originalname)
    }
})

// Optional: Only allow image files
// const fileFilter = (req, file, cb) => {
//     if (file.mimetype.startsWith("image/")) {
//         cb(null, true)
//     } else {
//         cb(new Error("Only image files are allowed!"), false)
//     }
// }

export const upload = multer({
    storage,
    // fileFilter
})