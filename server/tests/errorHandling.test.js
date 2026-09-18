const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');

// Cross-cutting error-handling middleware behavior (src/middleware/
// errorHandler.js) — not specific to any one route, so it doesn't need a
// database connection.
describe('Error handling', () => {
  test('a malformed JSON body returns a clean 400, not the raw parser error', async () => {
    const res = await request(app)
      .post('/api/foundations/import-shades')
      .set('Content-Type', 'application/json')
      .send('{not valid json');

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'The request body is not valid JSON.');
    // The raw V8/JSON.parse engine message must never reach the client.
    assert.doesNotMatch(res.body.message, /position \d+|unexpected token/i);
  });

  test('an unknown API route returns a clean 404', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
  });

  test('an unexpected server error never leaks a message or stack trace to the client', async () => {
    // Build a tiny app that reuses the real error handler, since triggering
    // a genuine uncaught 500 through the real app would mean corrupting
    // real app state (e.g. disconnecting Mongo mid-suite).
    const express = require('express');
    const { errorHandler } = require('../src/middleware/errorHandler');
    const testApp = express();
    testApp.get('/boom', () => {
      throw new Error('sensitive internal detail: db password is hunter2');
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/boom');
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Internal server error');
    assert.doesNotMatch(JSON.stringify(res.body), /hunter2/);
    assert.strictEqual(res.body.stack, undefined);
  });
});
