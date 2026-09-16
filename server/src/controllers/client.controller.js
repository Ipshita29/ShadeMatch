const mongoose = require('mongoose');
const Client = require('../models/Client');
const cloudinaryService = require('../services/cloudinaryService');
const mlService = require('../services/mlService');

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

async function findClientOrThrow(clientId) {
  if (!mongoose.isValidObjectId(clientId)) {
    const error = new Error('Invalid client id.');
    error.status = 400;
    throw error;
  }

  const client = await Client.findById(clientId);
  if (!client) {
    const error = new Error('Client not found.');
    error.status = 404;
    throw error;
  }

  return client;
}

// The ML service's optional debug field is a base64-encoded JPEG (tens of
// KB) — useful in the API response but not worth bloating every cached
// Mongo document with, so it's stripped before persisting.
function withoutDebug(data) {
  const { debug, ...rest } = data;
  return rest;
}

async function analyzeSkinRegions(req, res, next) {
  try {
    const client = await findClientOrThrow(req.params.clientId);

    const analysis = await mlService.analyzeSkinRegions(client.photoUrl);

    client.lastSkinAnalysis = withoutDebug(analysis);
    await client.save();

    res.json({
      success: true,
      message: 'Skin regions analyzed successfully',
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
}

async function analyzeSkin(req, res, next) {
  try {
    const client = await findClientOrThrow(req.params.clientId);

    // Part 5: same Part 4 extraction under the hood, but the ML service
    // returns a classified profile instead of raw region measurements. No
    // classification logic is duplicated here — Node only forwards.
    const profile = await mlService.analyzeSkinProfile(client.photoUrl);

    client.lastSkinProfile = withoutDebug(profile);
    await client.save();

    res.json({
      success: true,
      message: 'Skin profile generated successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadClientPhoto, createClient, analyzeSkinRegions, analyzeSkin };
