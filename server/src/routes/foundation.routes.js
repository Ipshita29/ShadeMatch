const express = require('express');
const upload = require('../middleware/upload');
const {
  listFoundations,
  listBrands,
  getBrandById,
  getProductById,
  listShades,
  getShadeById,
  searchFoundations,
} = require('../controllers/foundation.controller');
const { importChart, importShades } = require('../controllers/foundationImport.controller');

const router = express.Router();

// Order matters: /search and /shades must be declared before any
// conflicting :param route so Express doesn't try to match them as an id.
router.get('/search', searchFoundations);
router.get('/brands/:brandId', getBrandById);
router.get('/brands', listBrands);
router.get('/products/:productId', getProductById);
router.get('/shades/:shadeId', getShadeById);
router.get('/shades', listShades);

// Part 9 — shade chart import. /import-chart returns a reviewable draft
// only; /import-shades is the separate, explicit confirmation that writes
// to MongoDB (see foundationImport.controller.js).
router.post('/import-chart', upload.single('chart'), importChart);
router.post('/import-shades', importShades);

router.get('/', listFoundations);

module.exports = router;
