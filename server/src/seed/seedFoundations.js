// Seeds the foundation shade database: Brand -> FoundationProduct ->
// FoundationShade. Safe to re-run — it clears ONLY these three collections
// (never touches Client or anything else) and rebuilds them from the data
// files in src/data/foundations/.
//
// Run with: npm run seed

require('dotenv').config();
const mongoose = require('mongoose');

const Brand = require('../models/Brand');
const FoundationProduct = require('../models/FoundationProduct');
const FoundationShade = require('../models/FoundationShade');

const brandsData = require('../data/foundations/brands');
const productsData = require('../data/foundations/products');
const shadesData = require('../data/foundations/shades');

const { rgbToLab, labToLch, hexToRgb, round } = require('../utils/colorUtils');
const { classifyDepth, classifyUndertone, classifyHue } = require('../utils/colorClassification');

async function seedFoundations() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set — cannot seed the database.');
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB for seeding.');

  // Explicit: this seed script clears ONLY the foundation collections. It
  // never touches Client or any other collection.
  console.log('Clearing existing Brand / FoundationProduct / FoundationShade collections...');
  await Promise.all([Brand.deleteMany({}), FoundationProduct.deleteMany({}), FoundationShade.deleteMany({})]);

  const brandBySlug = new Map();
  for (const brandInput of brandsData) {
    const brand = await Brand.create(brandInput);
    brandBySlug.set(brand.slug, brand);
  }
  console.log(`Inserted ${brandBySlug.size} brands.`);

  const productBySlugPair = new Map();
  for (const productInput of productsData) {
    const { brandSlug, ...rest } = productInput;
    const brand = brandBySlug.get(brandSlug);
    if (!brand) {
      throw new Error(`Product "${rest.name}" references unknown brandSlug "${brandSlug}".`);
    }
    const product = await FoundationProduct.create({ ...rest, brand: brand._id });
    productBySlugPair.set(`${brandSlug}:${rest.slug}`, product);
  }
  console.log(`Inserted ${productBySlugPair.size} products.`);

  const shadeCountByProductId = new Map();

  for (const shadeInput of shadesData) {
    const { brandSlug, productSlug, name, code, hex, source } = shadeInput;

    const brand = brandBySlug.get(brandSlug);
    const product = productBySlugPair.get(`${brandSlug}:${productSlug}`);
    if (!brand || !product) {
      throw new Error(`Shade "${name}" references unknown brand/product (${brandSlug}/${productSlug}).`);
    }

    const rgb = hexToRgb(hex);
    const lab = rgbToLab(rgb);
    const lch = labToLch(lab);

    // Depth/undertone/hue are DERIVED from the RGB value via the same
    // classification thresholds Part 5 uses — never hand-typed — so a
    // shade's category always matches what a client's skin profile would
    // read as for the same color. See utils/colorClassification.js.
    const depth = classifyDepth(lab);
    const undertone = classifyUndertone(lab);
    const hue = classifyHue(lab);

    await FoundationShade.create({
      brand: brand._id,
      product: product._id,
      brandName: brand.name,
      productName: product.name,
      name,
      code,
      depth,
      undertone,
      hue,
      color: {
        rgb,
        lab: { l: round(lab.l, 1), a: round(lab.a, 1), b: round(lab.b, 1) },
        lch: { l: round(lch.l, 1), c: round(lch.c, 1), h: round(lch.h, 1) },
      },
      source,
      calibration: {
        status: 'estimated',
        confidence: 0.5,
        colorSource: 'estimated',
      },
    });

    shadeCountByProductId.set(String(product._id), (shadeCountByProductId.get(String(product._id)) || 0) + 1);
  }
  console.log(`Inserted ${shadesData.length} shades.`);

  // shadeCount reflects what's actually seeded, not a brand's real-world
  // full range — see FoundationProduct model comment.
  await Promise.all(
    Array.from(shadeCountByProductId.entries()).map(([productId, count]) =>
      FoundationProduct.findByIdAndUpdate(productId, { shadeCount: count })
    )
  );

  console.log('Seed complete.');
}

if (require.main === module) {
  seedFoundations()
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = seedFoundations;
