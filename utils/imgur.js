const cloudinary = require('cloudinary').v2;
require('dotenv').config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
async function create(base64Image) {
  try {
    console.log('Uploading to Cloudinary...');

    const uploaded = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Image}`, {
      folder: 'tagihan', 
    });

    return uploaded.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw error;
  }
}

module.exports = {
    create
}