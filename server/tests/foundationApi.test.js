const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const seedFoundations = require('../src/seed/seedFoundations');
const { connectTestDb, disconnectTestDb } = require('./testDb');
const Brand = require('../src/models/Brand');
const FoundationShade = require('../src/models/FoundationShade');

describe('Foundation API', () => {
  before(async () => {
    await connectTestDb();
    await seedFoundations(); // real seed data — same as `npm run seed`
  });

  after(async () => {
    await disconnectTestDb();
  });

  test('GET /api/foundations returns products with brand populated', async () => {
    const res = await request(app).get('/api/foundations');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data[0].brand.name);
  });

  test('GET /api/foundations/brands lists brands', async () => {
    const res = await request(app).get('/api/foundations/brands');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length >= 5);
  });

  test('GET /api/foundations/brands/:brandId returns a brand with its products', async () => {
    const brand = await Brand.findOne({ slug: 'mac' });
    const res = await request(app).get(`/api/foundations/brands/${brand._id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.name, 'MAC');
    assert.ok(res.body.data.products.length > 0);
  });

  test('GET /api/foundations/brands/:brandId with a malformed id returns 400', async () => {
    const res = await request(app).get('/api/foundations/brands/not-an-id');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  test('GET /api/foundations/brands/:brandId with a well-formed but unknown id returns 404', async () => {
    const res = await request(app).get('/api/foundations/brands/000000000000000000000000');
    assert.strictEqual(res.status, 404);
  });

  test('GET /api/foundations/products/:productId returns a product with brand populated', async () => {
    const shadeDoc = await FoundationShade.findOne({});
    const res = await request(app).get(`/api/foundations/products/${shadeDoc.product}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.brand.name);
  });

  test('GET /api/foundations/shades?brand=MAC filters by brand', async () => {
    const res = await request(app).get('/api/foundations/shades?brand=MAC');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((s) => s.brandName === 'MAC'));
  });

  test('GET /api/foundations/shades?undertone=Cool filters by undertone', async () => {
    const res = await request(app).get('/api/foundations/shades?undertone=Cool');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((s) => s.undertone === 'Cool'));
  });

  test('GET /api/foundations/shades?depth=Deep filters by depth', async () => {
    const res = await request(app).get('/api/foundations/shades?depth=Deep');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.every((s) => s.depth === 'Deep'));
  });

  test('GET /api/foundations/shades?depth=Deep&undertone=Warm combines filters', async () => {
    const res = await request(app).get('/api/foundations/shades?depth=Deep&undertone=Warm');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.every((s) => s.depth === 'Deep' && s.undertone === 'Warm'));
  });

  test('an invalid enum filter value is ignored rather than erroring', async () => {
    const res = await request(app).get('/api/foundations/shades?undertone=NotARealValue');
    assert.strictEqual(res.status, 200);
  });

  test('a filter combination with no matches returns an empty array, not an error', async () => {
    const res = await request(app).get('/api/foundations/shades?brand=NonexistentBrandXYZ');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body.data, []);
    assert.strictEqual(res.body.pagination.total, 0);
  });

  // Regression: ?brand=/?product= used to be passed straight into `new
  // RegExp(...)` unescaped, so regex special characters (and a
  // catastrophic-backtracking pattern) either broke the query or could hang
  // the process. These must return a clean, fast 200 with no matches.
  test('a ?brand= value containing regex special characters does not error or hang', async () => {
    const res = await request(app).get('/api/foundations/shades').query({ brand: 'MAC(' });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body.data, []);
  });

  test('a pathological ?brand= regex pattern resolves quickly rather than hanging (ReDoS)', async () => {
    const start = Date.now();
    const res = await request(app).get('/api/foundations/shades').query({ brand: '(a+)+$' });
    assert.strictEqual(res.status, 200);
    assert.ok(Date.now() - start < 2000, 'query should resolve well under a ReDoS timescale');
  });

  test('GET /api/foundations?brand= with regex special characters does not error', async () => {
    const res = await request(app).get('/api/foundations').query({ brand: 'MAC[' });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body.data, []);
  });

  test('GET /api/foundations/search?q= with regex special characters does not error', async () => {
    const res = await request(app).get('/api/foundations/search').query({ q: 'NC40(' });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body.data, []);
  });

  test('GET /api/foundations/search?q=NC40 finds the shade by code', async () => {
    const res = await request(app).get('/api/foundations/search?q=NC40');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.some((s) => s.name === 'NC40'));
  });

  test('GET /api/foundations/search?q=MAC finds shades by brand name', async () => {
    const res = await request(app).get('/api/foundations/search?q=MAC');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length > 0);
  });

  test('GET /api/foundations/search with no q returns an empty result, not an error', async () => {
    const res = await request(app).get('/api/foundations/search');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body.data, []);
  });

  test('GET /api/foundations/shades paginates results', async () => {
    const res = await request(app).get('/api/foundations/shades?page=1&limit=5');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length <= 5);
    assert.strictEqual(res.body.pagination.page, 1);
    assert.strictEqual(res.body.pagination.limit, 5);
    assert.ok(res.body.pagination.totalPages > 1);
  });

  test('pagination page 2 returns different shades than page 1', async () => {
    const page1 = await request(app).get('/api/foundations/shades?page=1&limit=5');
    const page2 = await request(app).get('/api/foundations/shades?page=2&limit=5');
    const idsPage1 = page1.body.data.map((s) => s._id);
    const idsPage2 = page2.body.data.map((s) => s._id);
    assert.ok(!idsPage1.some((id) => idsPage2.includes(id)));
  });

  test('an excessive ?limit is capped rather than returning everything', async () => {
    const res = await request(app).get('/api/foundations/shades?limit=99999');
    assert.ok(res.body.pagination.limit <= 100);
  });

  test('GET /api/foundations/shades/:shadeId returns full shade detail with brand+product populated', async () => {
    const shadeDoc = await FoundationShade.findOne({ name: 'NC40' });
    const res = await request(app).get(`/api/foundations/shades/${shadeDoc._id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.name, 'NC40');
    assert.ok(res.body.data.brand.name);
    assert.ok(res.body.data.product.name);
    assert.ok('l' in res.body.data.color.lab);
    assert.ok('h' in res.body.data.color.lch);
  });

  test('GET /api/foundations/shades/:shadeId with unknown id returns 404', async () => {
    const res = await request(app).get('/api/foundations/shades/000000000000000000000000');
    assert.strictEqual(res.status, 404);
  });

  test('shade responses do not include any match-score/ranking fields', async () => {
    const shadeDoc = await FoundationShade.findOne({ name: 'NC40' });
    const res = await request(app).get(`/api/foundations/shades/${shadeDoc._id}`);
    const keys = JSON.stringify(res.body.data).toLowerCase();
    assert.ok(!/matchscore|deltae|ranking|topmatch/.test(keys));
  });
});
