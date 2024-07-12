import fs from "fs"
import {v2 as cloudinary} from 'cloudinary';
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINAY_CLOUD_NAME, 
  api_key: process.env.CLOUDINAY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath, emailId) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: emailId
        })
        
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const updateOnCloudinary = async (oldCloudPath, localFilePath, emailId) => {
    try {
        if (oldCloudPath) {
            await cloudinary.uploader.destroy(oldCloudPath);
        }
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: emailId
        })
        
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary = async (publicId, resourceType) => {
    try {
        
        const result = await cloudinary.uploader.destroy(publicId, {resource_type: resourceType});
        return result.result === 'ok';
    } catch (error) {
        console.error("Error deleting from Cloudinary: ", error);
        return false;
    }
};

export {uploadOnCloudinary, updateOnCloudinary, deleteFromCloudinary}