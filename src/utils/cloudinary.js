import {v2 as cloudinary} from cloudinary
import fs from "fs"

import {v2 as cloudinary} from 'cloudinary';
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINAY_CLOUD_NAME, 
  api_key: process.env.CLOUDINAY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadCloudinary = async (localFilePath) => {
    try{
        if (!localFilePath) return null 
        //upload the file on cloudinary 
        const response = await cloudinary.uploader.upload(localFilePath, {
            resourse_type: "auto"
        })
        //file has been uploaded successfully
        console.log("File is upload on cloudinary", response.url)
        return response
    } catch (error){
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operator got failes
        return null 
    }
}

export {uploadCloudinary}