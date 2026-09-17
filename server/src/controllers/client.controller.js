const mongoose = require('mongoose');
const Client = require('../models/Client');
const FoundationProduct = require('../models/FoundationProduct');
const FoundationShade = require('../models/FoundationShade');
const Match = require('../models/Match');
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

// Part 5 stores the profile as { profile: { depth, undertone, hue }, ... }
// (see analyzeSkin above), but the Part 7 matching engine's documented
// contract expects those three fields flat alongside representativeColor/
// confidence/quality. Reconciling the two shapes is exactly the kind of
// small adaptation the orchestration layer (Node) is meant to own, so the
// ML service's matching code can match its documented contract exactly.
function toMatchProfilePayload(skinProfile) {
  return {
    depth: skinProfile.profile?.depth,
    undertone: skinProfile.profile?.undertone,
    hue: skinProfile.profile?.hue,
    representativeColor: skinProfile.representativeColor,
    confidence: skinProfile.confidence,
    quality: skinProfile.quality,
  };
}

function toMatchShadePayload(shadeDoc) {
  return {
    _id: String(shadeDoc._id),
    name: shadeDoc.name,
    code: shadeDoc.code,
    brandName: shadeDoc.brandName,
    productName: shadeDoc.productName,
    depth: shadeDoc.depth,
    undertone: shadeDoc.undertone,
    hue: shadeDoc.hue,
    color: shadeDoc.color,
    calibration: shadeDoc.calibration,
  };
}

// Part 7 — scores a foundation product's shades against the client's
// already-generated skin profile (Part 5) and returns a ranked Top 3.
// Node's job here is purely orchestration: find the client, find the
// product's active shades, hand both to the ML service, persist the
// result. All scoring math lives in the ML service (see Part 7 spec).
async function matchClient(req, res, next) {
  try {
    const client = await findClientOrThrow(req.params.clientId);

    if (!client.lastSkinProfile) {
      const error = new Error('Run skin analysis for this client before matching.');
      error.status = 400;
      throw error;
    }

    // Guard against running the algorithm on an unusable profile — this
    // mirrors the ML service's own defense-in-depth check, but checking
    // here first avoids an unnecessary round trip since Node already has
    // the profile in Mongo.
    if (client.lastSkinProfile.quality?.usable === false) {
      return res.json({
        success: true,
        message: 'Skin profile is not usable for matching.',
        data: {
          status: 'blocked',
          message: 'Please upload a clearer photo before matching.',
          profileConfidence: client.lastSkinProfile.confidence?.overall < 0.5 ? 'low' : 'normal',
          matches: [],
        },
      });
    }

    const { productId } = req.body;
    if (!mongoose.isValidObjectId(productId)) {
      const error = new Error('A valid productId is required.');
      error.status = 400;
      throw error;
    }

    const product = await FoundationProduct.findOne({ _id: productId, isActive: true });
    if (!product) {
      const error = new Error('Foundation product not found.');
      error.status = 404;
      throw error;
    }

    const shadeDocs = await FoundationShade.find({ product: product._id, isActive: true }).lean();
    const shadesPayload = shadeDocs.map(toMatchShadePayload);

    const result = await mlService.matchShades(toMatchProfilePayload(client.lastSkinProfile), shadesPayload);

    const shadeIdByString = new Map(shadeDocs.map((shade) => [String(shade._id), shade._id]));
    await Match.create({
      client: client._id,
      product: product._id,
      status: result.status,
      profileConfidence: result.profileConfidence,
      message: result.message,
      matches: result.matches.map((match) => ({
        shade: shadeIdByString.get(match.shadeId),
        name: match.name,
        code: match.code,
        brandName: match.brandName,
        productName: match.productName,
        score: match.score,
        breakdown: match.breakdown,
        deltaE: match.deltaE,
        reasons: match.reasons,
      })),
    });

    res.json({
      success: true,
      message: 'Matches calculated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadClientPhoto, createClient, analyzeSkinRegions, analyzeSkin, matchClient };
