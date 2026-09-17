const cloudinary = require('../config/cloudinary');

const CLIENT_PHOTOS_FOLDER = 'shadematch/clients';
// Shade-chart source images are kept separate from client photos: they're
// product/brand reference material an artist chooses to upload, not a
// client's personal photo, and there's no reason for the two to share
// storage, retention, or access considerations.
const SHADE_CHART_FOLDER = 'shadematch/shade-charts';

function isConfigured() {
  return Boolean(cloudinary.config().cloud_name);
}

function uploadToFolder(buffer, folder) {
  if (!isConfigured()) {
    const error = new Error('Image upload service is not configured.');
    error.status = 503;
    throw error;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

// Uploads an in-memory image buffer (from Multer) to Cloudinary and
// resolves with the fields the rest of the app needs to reference it.
function uploadImageBuffer(buffer) {
  return uploadToFolder(buffer, CLIENT_PHOTOS_FOLDER);
}

// Part 9 — same underlying Cloudinary upload path, different folder (see
// SHADE_CHART_FOLDER above).
function uploadChartImageBuffer(buffer) {
  return uploadToFolder(buffer, SHADE_CHART_FOLDER);
}

module.exports = { uploadImageBuffer, uploadChartImageBuffer };
