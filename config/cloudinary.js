const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dx4zjp45d',
    api_key: process.env.CLOUDINARY_API_KEY || '373858913357596',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'IXjce-FDK2dyvhKIKd4sLZrwsvU'
});

module.exports = cloudinary; 

