const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo_cloud',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo_secret'
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'prochat_media',
    // Supports images and standard document formats
    allowedFormats: ['jpeg', 'png', 'jpg', 'pdf', 'mp4', 'webp'],
  }
});

const upload = multer({ storage });

module.exports = { upload, cloudinary };
