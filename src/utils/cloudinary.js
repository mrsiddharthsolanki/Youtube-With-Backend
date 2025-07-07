import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'

cloudinary.config({
    cloud_name : process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret : process.env.CLOUD_API_SECRET
})

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(! localFilePath) return null;

        const responce = await cloudinary.uploader.upload(localFilePath ,{
            resource_type : 'auto'
        })

        fs.unlinkSync(localFilePath)
        return responce;

    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null;
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        
        if(! publicId) return null;

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'auto'
        });

        return response.result === 'ok' ? true : false;
    } catch (error) {
        console.log(`Error deleting file from Cloudinary: ${error.message}`);
        return null;
    }
}

export {uploadOnCloudinary, deleteFromCloudinary};