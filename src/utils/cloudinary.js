import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Uploads a file to Cloudinary and returns the response (including url and public_id)
const uploadOnCloudinary = async (localFilePath, resourceType = "auto") => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: resourceType
        })
        // file has been uploaded successfully
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        console.error("Error while uploading on cloudinary ", error);
        // remove the locally saved file if any error occurs during upload
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath)
        }
        // fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

// Deletes a file from Cloudinary using its public_id
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        if (!publicId) return null;
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });
        return response;
    } catch (error) {
        console.error("Error while deleting from cloudinary ", error);
        return null;
    }
}


export { uploadOnCloudinary, deleteFromCloudinary }