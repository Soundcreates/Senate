const cloudinary = require("cloudinary").v2;

const configFromUrl = process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim();

cloudinary.config(
  configFromUrl || {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_SECRET.trim(),
  }
);

module.exports = cloudinary;
