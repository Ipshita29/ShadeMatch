const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { connectTestDb, disconnectTestDb } = require('./testDb');
const Brand = require('../src/models/Brand');
const FoundationProduct = require('../src/models/FoundationProduct');
const FoundationShade = require('../src/models/FoundationShade');

function validShadeInput(brandId, productId, overrides = {}) {
  return {
    brand: brandId,
    product: productId,
    brandName: 'Test Brand',
    productName: 'Test Product',
    name: 'T10',
    depth: 'Medium',
    undertone: 'Warm',
    hue: 'Golden',
    color: {
      rgb: { r: 180, g: 130, b: 100 },
      lab: { l: 60, a: 15, b: 20 },
      lch: { l: 60, c: 25, h: 53 },
    },
    ...overrides,
  };
}

describe('Foundation database models', () => {
  let brand;
  let product;

  before(async () => {
    await connectTestDb();
  });

  after(async () => {
    await Brand.deleteMany({ slug: /^test-/ });
    await FoundationProduct.deleteMany({ slug: /^test-/ });
    await FoundationShade.deleteMany({ name: /^T[\d-]/ });
    await disconnectTestDb();
  });

  // 1. Brand creation
  test('creates a valid brand', async () => {
    brand = await Brand.create({ name: 'Test Brand', slug: 'test-brand' });
    assert.ok(brand._id);
    assert.strictEqual(brand.isActive, true);
  });

  test('rejects a brand without a slug', async () => {
    await assert.rejects(() => Brand.create({ name: 'No Slug Brand' }));
  });

  test('rejects a duplicate brand slug', async () => {
    await assert.rejects(() => Brand.create({ name: 'Duplicate', slug: 'test-brand' }));
  });

  // 2. Product creation
  test('creates a valid product referencing a brand', async () => {
    product = await FoundationProduct.create({
      brand: brand._id,
      name: 'Test Product',
      slug: 'test-product',
    });
    assert.strictEqual(product.brand.toString(), brand._id.toString());
  });

  test('rejects a product without a brand', async () => {
    await assert.rejects(() => FoundationProduct.create({ name: 'Orphan Product', slug: 'test-orphan' }));
  });

  // 3. Shade creation + Brand -> Product -> Shade reference correctness
  test('creates a valid shade referencing brand and product', async () => {
    const shadeInput = validShadeInput(brand._id, product._id, { name: 'T10-create' });
    const shadeDoc = await FoundationShade.create(shadeInput);

    assert.strictEqual(shadeDoc.brand.toString(), brand._id.toString());
    assert.strictEqual(shadeDoc.product.toString(), product._id.toString());
    assert.strictEqual(shadeDoc.calibration.status, 'estimated'); // schema default
  });

  test('rejects a shade without a required name', async () => {
    const input = validShadeInput(brand._id, product._id);
    delete input.name;
    await assert.rejects(() => FoundationShade.create(input));
  });

  // 4. Invalid RGB
  for (const [label, badValue] of [
    ['negative', -1],
    ['over 255', 256],
  ]) {
    test(`rejects an RGB channel that is ${label}`, async () => {
      const input = validShadeInput(brand._id, product._id, { name: `T-bad-rgb-${label.replace(/\s/g, '')}` });
      input.color.rgb.r = badValue;
      await assert.rejects(() => FoundationShade.create(input));
    });
  }

  // 5. Invalid depth
  test('rejects an invalid depth value', async () => {
    const input = validShadeInput(brand._id, product._id, { name: 'T-bad-depth', depth: 'Super Deep' });
    await assert.rejects(() => FoundationShade.create(input));
  });

  // 6. Invalid undertone
  test('rejects an invalid undertone value', async () => {
    const input = validShadeInput(brand._id, product._id, { name: 'T-bad-undertone', undertone: 'Sunny' });
    await assert.rejects(() => FoundationShade.create(input));
  });

  // 7. Invalid hue
  test('rejects an invalid hue value', async () => {
    const input = validShadeInput(brand._id, product._id, { name: 'T-bad-hue', hue: 'Sparkly' });
    await assert.rejects(() => FoundationShade.create(input));
  });

  test('accepts the documented calibration/colorSource enum values', async () => {
    const input = validShadeInput(brand._id, product._id, {
      name: 'T-calibration',
      calibration: { status: 'calibrated', confidence: 0.95, colorSource: 'calibrated_photo' },
    });
    const shadeDoc = await FoundationShade.create(input);
    assert.strictEqual(shadeDoc.calibration.status, 'calibrated');
    assert.strictEqual(shadeDoc.calibration.colorSource, 'calibrated_photo');
  });
});
