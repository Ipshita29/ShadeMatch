// Shared MongoDB connect/disconnect for tests. Uses a real local MongoDB
// (via MONGO_URI, same as the app itself) rather than an in-memory server —
// this project already assumes a local mongod for development, so tests
// reuse that rather than adding a separate in-memory DB dependency.
//
// Because every test file shares that one real mongod, `npm test` runs
// files with --test-concurrency=1 (see package.json): with the default
// concurrency, node:test runs multiple files in parallel workers, and one
// file's disconnectTestDb() can tear down a connection another file's
// still-running requests depend on — surfacing as unrelated tests being
// cancelled mid-run rather than a clean failure.
require('dotenv').config();
const mongoose = require('mongoose');

async function connectTestDb() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be set to run tests (see server/.env.example).');
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
}

async function disconnectTestDb() {
  await mongoose.disconnect();
}

module.exports = { connectTestDb, disconnectTestDb };
