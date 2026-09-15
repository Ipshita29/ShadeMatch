const Client = require('../models/Client');
const cloudinaryService = require('../services/cloudinaryService');

async function uploadClientPhoto(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error('Please choose a photo to upload.');
      error.status = 400;
      throw error;
    }

    const { url, publicId } = await cloudinaryService.uploadImageBuffer(req.file.buffer);

    res.status(201).json({
      success: true,
      message: 'Client photo uploaded successfully',
      data: { url, publicId },
    });
  } catch (error) {
    next(error);
  }
}

async function createClient(req, res, next) {
  try {
    const { name, photoUrl, photoPublicId } = req.body;

    if (!photoUrl || !photoPublicId) {
      const error = new Error('photoUrl and photoPublicId are required.');
      error.status = 400;
      throw error;
    }

    const client = await Client.create({ name, photoUrl, photoPublicId });

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadClientPhoto, createClient };
