const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');

const { chartExtractionLimiter } = require('../src/middleware/rateLimit');

// Built on an isolated mini-app (not the real app/foundationImport.test.js's
// shared route) so exercising the limit here doesn't eat into the request
// budget the other Part 9 import-chart tests rely on — they share the same
// in-memory limiter store within one test process.
describe('Chart extraction rate limiting', () => {
  test('blocks requests past the configured limit with a friendly 429', async () => {
    const app = express();
    app.get('/limited', chartExtractionLimiter, (req, res) => res.json({ success: true }));

    let lastStatus;
    let lastBody;
    for (let i = 0; i < 16; i += 1) {
      // eslint-disable-next-line no-await-in-loop -- requests must be sequential to exercise the counter deterministically
      const res = await request(app).get('/limited');
      lastStatus = res.status;
      lastBody = res.body;
    }

    assert.strictEqual(lastStatus, 429);
    assert.strictEqual(lastBody.success, false);
    assert.match(lastBody.message, /too many/i);
  });
});
