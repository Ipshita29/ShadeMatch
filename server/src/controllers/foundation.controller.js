const mongoose = require('mongoose');
const Brand = require('../models/Brand');
const FoundationProduct = require('../models/FoundationProduct');
const FoundationShade = require('../models/FoundationShade');
const { buildShadeFilter } = require('../services/foundationService');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

function invalidId(label) {
  const error = new Error(`Invalid ${label} id.`);
  error.status = 400;
  return error;
}

function notFound(label) {
  const error = new Error(`${label} not found.`);
  error.status = 404;
  return error;
}

// GET /api/foundations — browse-level overview: active products with their
// brand populated (what the Foundations Library page's product cards need).
// Optional ?brand= filters by brand name.
async function listFoundations(req, res, next) {
  try {
    const filter = { isActive: true };
    if (req.query.brand) {
      const brand = await Brand.findOne({ name: new RegExp(`^${req.query.brand}$`, 'i') });
      filter.brand = brand ? brand._id : null; // null -> no results, rather than ignoring the filter
    }

    const products = await FoundationProduct.find(filter).populate('brand').sort({ name: 1 });
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
}

async function listBrands(req, res, next) {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: brands });
  } catch (error) {
    next(error);
  }
}

async function getBrandById(req, res, next) {
  try {
    const { brandId } = req.params;
    if (!mongoose.isValidObjectId(brandId)) throw invalidId('brand');

    const brand = await Brand.findById(brandId);
    if (!brand) throw notFound('Brand');

    const products = await FoundationProduct.find({ brand: brand._id, isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: { ...brand.toObject(), products } });
  } catch (error) {
    next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) throw invalidId('product');

    const product = await FoundationProduct.findById(productId).populate('brand');
    if (!product) throw notFound('Product');

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

// GET /api/foundations/shades — filterable, paginated shade listing.
// Supports ?brand=&product=&depth=&undertone=&hue=&page=&limit=
async function listShades(req, res, next) {
  try {
    const filter = buildShadeFilter(req.query);
    const { page, limit, skip } = parsePagination(req.query);

    const [shades, total] = await Promise.all([
      FoundationShade.find(filter).sort({ brandName: 1, productName: 1, name: 1 }).skip(skip).limit(limit),
      FoundationShade.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: shades,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (error) {
    next(error);
  }
}

async function getShadeById(req, res, next) {
  try {
    const { shadeId } = req.params;
    if (!mongoose.isValidObjectId(shadeId)) throw invalidId('shade');

    const shade = await FoundationShade.findById(shadeId).populate('brand').populate('product');
    if (!shade) throw notFound('Shade');

    res.json({ success: true, data: shade });
  } catch (error) {
    next(error);
  }
}

// GET /api/foundations/search?q= — searches brand/product/shade name/code.
// Uses the text index when the query is long enough to be meaningful,
// otherwise falls back to a simple case-insensitive regex (text indexes
// don't handle short/partial tokens like "NC4" well).
async function searchFoundations(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ success: true, data: [], pagination: buildPaginationMeta({ page: 1, limit: 20, total: 0 }) });
    }

    const { page, limit, skip } = parsePagination(req.query);
    // Text search is combined with the same depth/undertone/hue filters
    // /shades supports, so the frontend can search and filter at once.
    const filter = {
      ...buildShadeFilter(req.query),
      $or: [
        { brandName: new RegExp(escapeRegex(q), 'i') },
        { productName: new RegExp(escapeRegex(q), 'i') },
        { name: new RegExp(escapeRegex(q), 'i') },
        { code: new RegExp(escapeRegex(q), 'i') },
      ],
    };

    const [shades, total] = await Promise.all([
      FoundationShade.find(filter).sort({ brandName: 1, name: 1 }).skip(skip).limit(limit),
      FoundationShade.countDocuments(filter),
    ]);

    res.json({ success: true, data: shades, pagination: buildPaginationMeta({ page, limit, total }) });
  } catch (error) {
    next(error);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  listFoundations,
  listBrands,
  getBrandById,
  getProductById,
  listShades,
  getShadeById,
  searchFoundations,
};
