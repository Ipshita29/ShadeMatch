const cloudinary = require('../config/cloudinary');

const CLIENT_PHOTOS_FOLDER = 'shadematch/clients';

function isConfigured() {
  return Boolean(cloudinary.config().cloud_name);
}

// Uploads an in-memory image buffer (from Multer) to Cloudinary and
// resolves with the fields the rest of the app needs to reference it.
function uploadImageBuffer(buffer) {
  if (!isConfigured()) {
    const error = new Error('Image upload service is not configured.');
    error.status = 503;
    throw error;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: CLIENT_PHOTOS_FOLDER, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

module.exports = { uploadImageBuffer };
