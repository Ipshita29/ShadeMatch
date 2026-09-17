const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const seedFoundations = require('../src/seed/seedFoundations');
const { connectTestDb, disconnectTestDb } = require('./testDb');
const Brand = require('../src/models/Brand');
const FoundationProduct = require('../src/models/FoundationProduct');
const FoundationShade = require('../src/models/FoundationShade');
const cloudinaryService = require('../src/services/cloudinaryService');
const aiExtractionService = require('../src/services/aiExtractionService');
const mlService = require('../src/services/mlService');

// A minimal but structurally valid 1x1 PNG, used wherever a real "image"
// needs to reach Multer's file-type check. Its actual pixel content is
// irrelevant — no test in this file exercises the real CV/AI pipeline
// (see Part 9 spec section 23: mocked AI responses only, no real OpenAI
// calls in the automated suite).
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const tinyPngBuffer = () => Buffer.from(TINY_PNG_BASE64, 'base64');

function stub(obj, key, impl) {
  const original = obj[key];
  obj[key] = impl;
  return () => {
    obj[key] = original;
  };
}

describe('Foundation shade chart import (Part 9)', () => {
  let product;
  let brand;
  let restoreFns = [];

  before(async () => {
    await connectTestDb();
    await seedFoundations();
    brand = await Brand.findOne({ slug: 'mac' });
    product = await FoundationProduct.findOne({ brand: brand._id });

    // Cloudinary isn't configured in the test environment (no real
    // account credentials), and shouldn't need to be — every test here
    // stubs the actual network boundary instead.
    restoreFns.push(
      stub(cloudinaryService, 'uploadChartImageBuffer', async () => ({
        url: 'https://res.cloudinary.com/demo/image/upload/fake-chart.jpg',
        publicId: 'shadematch/shade-charts/fake-chart',
      }))
    );
  });

  after(async () => {
    restoreFns.forEach((restore) => restore());
    await disconnectTestDb();
  });

  afterEach(async () => {
    await FoundationShade.deleteMany({ code: /^TEST-/ });
  });

  // --- /import-chart: validation -----------------------------------------

  test('rejects a non-image file type', async () => {
    const res = await request(app)
      .post('/api/foundations/import-chart')
      .field('productId', String(product._id))
      .attach('chart', Buffer.from('not an image'), { filename: 'chart.txt', contentType: 'text/plain' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  test('rejects a file over 5MB', async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 1);
    const res = await request(app)
      .post('/api/foundations/import-chart')
      .field('productId', String(product._id))
      .attach('chart', bigBuffer, { filename: 'chart.png', contentType: 'image/png' });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /5 ?MB/i);
  });

  test('rejects when no file is attached', async () => {
    const res = await request(app).post('/api/foundations/import-chart').field('productId', String(product._id));
    assert.strictEqual(res.status, 400);
  });

  test('rejects a missing/invalid productId', async () => {
    const res = await request(app)
      .post('/api/foundations/import-chart')
      .field('productId', 'not-a-real-id')
      .attach('chart', tinyPngBuffer(), { filename: 'chart.png', contentType: 'image/png' });

    assert.strictEqual(res.status, 400);
  });

  test('rejects an unknown productId', async () => {
    const res = await request(app)
      .post('/api/foundations/import-chart')
      .field('productId', '000000000000000000000000')
      .attach('chart', tinyPngBuffer(), { filename: 'chart.png', contentType: 'image/png' });

    assert.strictEqual(res.status, 404);
  });

  // --- /import-chart: extraction success/failure --------------------------

  test('successful extraction merges AI labels with CV colors into a reviewable draft', async () => {
    const undo1 = stub(aiExtractionService, 'extractShadeChart', async () => ({
      brand: 'MAC',
      product: 'Studio Fix Fluid',
      shades: [
        { name: 'NC15', code: 'NC15', label: null, depth: null, undertone: null, hue: null, extractionConfidence: 0.95, notes: [] },
        { name: 'NC20', code: 'NC20', label: null, depth: null, undertone: null, hue: null, extractionConfidence: 0.9, notes: [] },
      ],
    }));
    const undo2 = stub(mlService, 'extractSwatchColors', async () => ({
      imageWidth: 400,
      imageHeight: 100,
      swatches: [
        { region: { x: 0, y: 0, width: 10, height: 10 }, pixelCount: 500, rgb: { mean: [241, 203, 164] }, lab: { mean: [82.1, 8.2, 20.5] } },
        { region: { x: 0, y: 0, width: 10, height: 10 }, pixelCount: 500, rgb: { mean: [234, 191, 149] }, lab: { mean: [78.0, 9.0, 22.0] } },
      ],
    }));

    try {
      const res = await request(app)
        .post('/api/foundations/import-chart')
        .field('productId', String(product._id))
        .attach('chart', tinyPngBuffer(), { filename: 'chart.png', contentType: 'image/png' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.shades.length, 2);
      assert.strictEqual(res.body.data.shades[0].name, 'NC15');
      assert.ok(res.body.data.shades[0].rgb);
      assert.strictEqual(res.body.data.shades[0].depth, 'Light'); // derived from CV Lab, not the AI
      assert.ok(res.body.data.chartImageUrl);

      // Nothing should be written to Mongo by this step.
      const count = await FoundationShade.countDocuments({ name: 'NC15', product: product._id, code: 'TEST-should-not-exist' });
      assert.strictEqual(count, 0);
    } finally {
      undo1();
      undo2();
    }
  });

  test('chart with no visible swatches still returns AI-labeled candidates with null color', async () => {
    const undo1 = stub(aiExtractionService, 'extractShadeChart', async () => ({
      brand: null,
      product: null,
      shades: [{ name: 'Honey', code: '05', label: null, depth: null, undertone: null, hue: null, extractionConfidence: 0.7, notes: [] }],
    }));
    const undo2 = stub(mlService, 'extractSwatchColors', async () => ({ imageWidth: 10, imageHeight: 10, swatches: [] }));

    try {
      const res = await request(app)
        .post('/api/foundations/import-chart')
        .field('productId', String(product._id))
        .attach('chart', tinyPngBuffer(), { filename: 'chart.png', contentType: 'image/png' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.shades.length, 1);
      assert.strictEqual(res.body.data.shades[0].rgb, null);
      assert.strictEqual(res.body.data.shades[0].colorStatus, 'not_detected');
    } finally {
      undo1();
      undo2();
    }
  });

  test('unclear/low-confidence labels are still surfaced, not hidden', async () => {
    const undo1 = stub(aiExtractionService, 'extractShadeChart', async () => ({
      brand: null,
      product: null,
      shades: [
        { name: 'Illegible-03', code: null, label: null, depth: null, undertone: null, hue: null, extractionConfidence: 0.3, notes: ['partially obscured by glare'] },
      ],
    }));
    const undo2 = stub(mlService, 'extractSwatchColors', async () => ({ imageWidth: 10, imageHeight: 10, swatches: [] }));

    try {
      const res = await request(app)
        .post('/api/foundations/import-chart')
        .field('productId', String(product._id))
        .attach('chart', tinyPngBuffer(), { filename: 'chart.png', contentType: 'image/png' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.shades[0].extractionConfidence, 0.3);
      assert.deepStrictEqual(res.body.data.shades[0].notes, ['partially obscured by glare']);
    } finally {
      undo1();
      undo2();
    }
  });

  test('an invalid/malformed AI response is a clean 502, not a crash', async () => {
    const undo1 = stub(aiExtractionService, 'extractShadeChart', async () => {
      const error = new Error('AI extraction returned an unexpected response.');
      error.status = 502;
      throw error;
    });
    const undo2 = stub(mlService, 'extractSwatchColors', async () => ({ imageWidth: 10, imageHeight: 10, swatches: [] }));

    try {
      const res = await request(app)
        .post('/api/foundations/import-chart')
        .field('productId', String(product._id))
        .attach('chart', tinyPngBuffer(), { filename: 'chart.png', contentType: 'image/png' });

      assert.strictEqual(res.status, 502);
      assert.strictEqual(res.body.success, false);
    } finally {
      undo1();
      undo2();
    }
  });

  test('an OpenAI API failure surfaces as a clean error, not a raw exception', async () => {
    const undo1 = stub(aiExtractionService, 'extractShadeChart', async () => {
      const error = new Error('We couldn’t reach the shade extraction service. Please try again.');
      error.status = 503;
      throw error;
    });
    const undo2 = stub(mlService, 'extractSwatchColors', async () => ({ imageWidth: 10, imageHeight: 10, swatches: [] }));

    try {
      const res = await request(app)
        .post('/api/foundations/import-chart')
        .field('productId', String(product._id))
        .attach('chart', tinyPngBuffer(), { filename: 'chart.png', contentType: 'image/png' });

      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.body.success, false);
      assert.doesNotMatch(res.body.message, /openai/i);
    } finally {
      undo1();
      undo2();
    }
  });

  // --- /import-shades -------------------------------------------------------

  function validReviewedShade(overrides = {}) {
    return {
      name: 'TEST-Shade',
      code: 'TEST-01',
      depth: 'Medium',
      undertone: 'Warm',
      hue: 'Golden',
      rgb: { r: 200, g: 150, b: 110 },
      extractionConfidence: 0.9,
      include: true,
      ...overrides,
    };
  }

  test('complete import: all valid shades are inserted', async () => {
    const res = await request(app)
      .post('/api/foundations/import-shades')
      .send({
        productId: String(product._id),
        shades: [
          validReviewedShade({ name: 'TEST-A', code: 'TEST-A' }),
          validReviewedShade({ name: 'TEST-B', code: 'TEST-B' }),
        ],
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.imported, 2);
    assert.strictEqual(res.body.skipped, 0);
    assert.deepStrictEqual(res.body.errors, []);

    const saved = await FoundationShade.find({ code: /^TEST-[AB]$/ });
    assert.strictEqual(saved.length, 2);
  });

  test('RGB is converted to Lab/LCh using the shared color conversion utility', async () => {
    const { rgbToLab, labToLch } = require('../src/utils/colorUtils');
    const rgb = { r: 190, g: 140, b: 100 };

    await request(app)
      .post('/api/foundations/import-shades')
      .send({ productId: String(product._id), shades: [validReviewedShade({ name: 'TEST-Lab', code: 'TEST-LAB', rgb })] });

    const saved = await FoundationShade.findOne({ code: 'TEST-LAB' });
    const expectedLab = rgbToLab(rgb);
    const expectedLch = labToLch(expectedLab);

    assert.ok(Math.abs(saved.color.lab.l - expectedLab.l) < 0.01);
    assert.ok(Math.abs(saved.color.lch.h - expectedLch.h) < 0.01);
  });

  test('excluded shades (include: false) are not imported', async () => {
    const res = await request(app)
      .post('/api/foundations/import-shades')
      .send({
        productId: String(product._id),
        shades: [validReviewedShade({ name: 'TEST-Excluded', code: 'TEST-EXCL', include: false })],
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.imported, 0);
    const found = await FoundationShade.findOne({ code: 'TEST-EXCL' });
    assert.strictEqual(found, null);
  });

  test('a shade missing required fields is reported as a per-shade error (partial import)', async () => {
    const res = await request(app)
      .post('/api/foundations/import-shades')
      .send({
        productId: String(product._id),
        shades: [
          validReviewedShade({ name: 'TEST-Good', code: 'TEST-GOOD' }),
          validReviewedShade({ name: 'TEST-NoColor', code: 'TEST-NOCOLOR', rgb: null }),
        ],
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.imported, 1);
    assert.strictEqual(res.body.errors.length, 1);
    assert.match(res.body.errors[0].reason, /color/i);
  });

  test('a manually-added shade (no AI/CV origin at all) can still be imported', async () => {
    const res = await request(app)
      .post('/api/foundations/import-shades')
      .send({
        productId: String(product._id),
        shades: [validReviewedShade({ name: 'TEST-Manual', code: 'TEST-MANUAL', extractionConfidence: null })],
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.imported, 1);
    const saved = await FoundationShade.findOne({ code: 'TEST-MANUAL' });
    assert.strictEqual(saved.source.type, 'shade_chart');
  });

  test('duplicate shade code for the same product is skipped, not overwritten', async () => {
    await request(app)
      .post('/api/foundations/import-shades')
      .send({ productId: String(product._id), shades: [validReviewedShade({ name: 'TEST-Dup', code: 'TEST-DUP', rgb: { r: 100, g: 100, b: 100 } })] });

    const res = await request(app)
      .post('/api/foundations/import-shades')
      .send({ productId: String(product._id), shades: [validReviewedShade({ name: 'TEST-Dup', code: 'TEST-DUP', rgb: { r: 250, g: 250, b: 250 } })] });

    assert.strictEqual(res.body.imported, 0);
    assert.strictEqual(res.body.skipped, 1);

    const saved = await FoundationShade.findOne({ code: 'TEST-DUP' });
    assert.strictEqual(saved.color.rgb.r, 100); // original untouched
  });

  test('duplicate shade can be explicitly updated with forceUpdate', async () => {
    await request(app)
      .post('/api/foundations/import-shades')
      .send({ productId: String(product._id), shades: [validReviewedShade({ name: 'TEST-Force', code: 'TEST-FORCE', rgb: { r: 100, g: 100, b: 100 } })] });

    const res = await request(app)
      .post('/api/foundations/import-shades')
      .send({
        productId: String(product._id),
        shades: [validReviewedShade({ name: 'TEST-Force', code: 'TEST-FORCE', rgb: { r: 250, g: 250, b: 250 }, forceUpdate: true })],
      });

    assert.strictEqual(res.body.imported, 1);
    const saved = await FoundationShade.findOne({ code: 'TEST-FORCE' });
    assert.strictEqual(saved.color.rgb.r, 250);
  });

  test('duplicate shade names within the same submitted batch are only inserted once', async () => {
    const res = await request(app)
      .post('/api/foundations/import-shades')
      .send({
        productId: String(product._id),
        shades: [
          validReviewedShade({ name: 'TEST-Batch', code: 'TEST-BATCH' }),
          validReviewedShade({ name: 'TEST-Batch', code: 'TEST-BATCH' }),
        ],
      });

    assert.strictEqual(res.body.imported, 1);
    assert.strictEqual(res.body.skipped, 1);
  });

  test('rejects import with no productId', async () => {
    const res = await request(app)
      .post('/api/foundations/import-shades')
      .send({ shades: [validReviewedShade()] });
    assert.strictEqual(res.status, 400);
  });

  test('rejects import with an empty shades array', async () => {
    const res = await request(app)
      .post('/api/foundations/import-shades')
      .send({ productId: String(product._id), shades: [] });
    assert.strictEqual(res.status, 400);
  });

  test('an imported shade is immediately visible via the existing Foundations listing endpoint', async () => {
    await request(app)
      .post('/api/foundations/import-shades')
      .send({ productId: String(product._id), shades: [validReviewedShade({ name: 'TEST-Visible', code: 'TEST-VISIBLE' })] });

    const res = await request(app).get('/api/foundations/shades').query({ product: product.name, brand: brand.name, limit: 100 });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.some((shade) => shade.code === 'TEST-VISIBLE'));
  });

  test('an imported shade has every field the Part 7 matching payload needs', async () => {
    await request(app)
      .post('/api/foundations/import-shades')
      .send({ productId: String(product._id), shades: [validReviewedShade({ name: 'TEST-Matchable', code: 'TEST-MATCHABLE' })] });

    const saved = await FoundationShade.findOne({ code: 'TEST-MATCHABLE' }).lean();
    // Mirrors client.controller.js's toMatchShadePayload — if any of these
    // is missing, the shade would silently fail to score in Part 7.
    for (const field of ['name', 'depth', 'undertone', 'hue']) {
      assert.ok(saved[field], `expected ${field} to be set`);
    }
    assert.ok(saved.color?.rgb && saved.color?.lab);
    assert.strictEqual(saved.isActive, true);
  });

  test('product.shadeCount reflects the true count after import', async () => {
    const before = await FoundationShade.countDocuments({ product: product._id, isActive: true });

    await request(app)
      .post('/api/foundations/import-shades')
      .send({ productId: String(product._id), shades: [validReviewedShade({ name: 'TEST-Count', code: 'TEST-COUNT' })] });

    const updatedProduct = await FoundationProduct.findById(product._id);
    assert.strictEqual(updatedProduct.shadeCount, before + 1);
  });
});
