// Part 9 — AI-assisted shade chart import. Node's job is pure
// orchestration, same division of responsibility as every other part:
//   1. validate the request (product exists, file is a real image)
//   2. store the image (Cloudinary)
//   3. ask the AI extraction service "what labels are visible?" (Node -> OpenAI)
//   4. ask the ML service "what colors are visible?" (Node -> ml-service, CV only)
//   5. merge the two into a reviewable draft — NEVER saved to MongoDB yet
//   6. only /import-shades (a separate, explicit confirmation call) writes
//      anything to the database, and only what the artist reviewed.
const mongoose = require('mongoose');
const FoundationProduct = require('../models/FoundationProduct');
const FoundationShade = require('../models/FoundationShade');
const cloudinaryService = require('../services/cloudinaryService');
const mlService = require('../services/mlService');
const aiExtractionService = require('../services/aiExtractionService');
const { mergeExtractionResults, toFoundationShadeDoc, shadeIdentityKey } = require('../services/foundationImportService');

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

async function loadProductOrThrow(productId) {
  if (!mongoose.isValidObjectId(productId)) throw badRequest('A valid productId is required.');

  const product = await FoundationProduct.findOne({ _id: productId, isActive: true }).populate('brand');
  if (!product) {
    const error = new Error('Foundation product not found.');
    error.status = 404;
    throw error;
  }
  return product;
}

// POST /api/foundations/import-chart
// multipart/form-data: { chart: <file>, productId }
async function importChart(req, res, next) {
  try {
    if (!req.file) throw badRequest('Please choose a shade chart image to upload.');

    const product = await loadProductOrThrow(req.body.productId);

    const { url: chartImageUrl, publicId } = await cloudinaryService.uploadChartImageBuffer(req.file.buffer);

    // The two extraction steps are independent of each other (see Part 9
    // spec section 8) and can run concurrently — neither depends on the
    // other's output.
    const [aiResult, colorResult] = await Promise.all([
      aiExtractionService.extractShadeChart(chartImageUrl, {
        brandName: product.brand?.name,
        productName: product.name,
      }),
      mlService.extractSwatchColors(chartImageUrl),
    ]);

    const shades = mergeExtractionResults(aiResult.shades, colorResult.swatches);

    res.json({
      success: true,
      message: 'Shade chart processed. Review the extracted shades before importing.',
      data: {
        chartImageUrl,
        chartImagePublicId: publicId,
        product: { id: String(product._id), name: product.name, brandName: product.brand?.name },
        detectedBrand: aiResult.brand,
        detectedProduct: aiResult.product,
        shades,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/foundations/import-shades
// { productId, shades: [ ...artist-reviewed draft shades... ] }
async function importShades(req, res, next) {
  try {
    const product = await loadProductOrThrow(req.body.productId);
    const brand = product.brand; // already populated by loadProductOrThrow

    const submitted = Array.isArray(req.body.shades) ? req.body.shades : [];
    if (submitted.length === 0) throw badRequest('No shades were submitted for import.');

    const existingShades = await FoundationShade.find({ product: product._id }).select('name code').lean();
    const existingKeys = new Map(existingShades.map((s) => [shadeIdentityKey(s), s]));

    const seenInBatch = new Set();
    const toInsert = [];
    const errors = [];
    let skipped = 0;

    for (const reviewed of submitted) {
      if (reviewed?.include === false) continue; // artist explicitly excluded this candidate

      const identity = shadeIdentityKey(reviewed || {});
      const label = reviewed?.name || reviewed?.code || `shade #${toInsert.length + errors.length + 1}`;

      if (!identity) {
        errors.push({ shade: label, reason: 'Missing shade name.' });
        continue;
      }

      const existing = existingKeys.get(identity);
      if (existing && !reviewed.forceUpdate) {
        skipped += 1;
        errors.push({ shade: label, reason: 'Shade already exists for this product.', status: 'duplicate' });
        continue;
      }

      if (seenInBatch.has(identity)) {
        skipped += 1;
        errors.push({ shade: label, reason: 'Duplicate shade within this import.', status: 'duplicate' });
        continue;
      }
      seenInBatch.add(identity);

      const { doc, error } = toFoundationShadeDoc(reviewed, {
        brandId: brand._id,
        productId: product._id,
        brandName: brand.name,
        productName: product.name,
      });

      if (!doc) {
        errors.push({ shade: label, reason: error });
        continue;
      }

      toInsert.push({ doc, existing });
    }

    let imported = 0;
    for (const { doc, existing } of toInsert) {
      if (existing && doc) {
        // eslint-disable-next-line no-await-in-loop -- small, artist-triggered batch; sequential is fine and keeps error handling per-shade
        await FoundationShade.updateOne({ _id: existing._id }, { $set: doc });
      } else {
        // eslint-disable-next-line no-await-in-loop
        await FoundationShade.create(doc);
      }
      imported += 1;
    }

    const totalActive = await FoundationShade.countDocuments({ product: product._id, isActive: true });
    await FoundationProduct.updateOne({ _id: product._id }, { shadeCount: totalActive });

    res.json({
      success: true,
      imported,
      skipped,
      errors,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { importChart, importShades };
