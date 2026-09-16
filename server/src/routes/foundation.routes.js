const express = require('express');
const {
  listFoundations,
  listBrands,
  getBrandById,
  getProductById,
  listShades,
  getShadeById,
  searchFoundations,
} = require('../controllers/foundation.controller');

const router = express.Router();

// Order matters: /search and /shades must be declared before any
// conflicting :param route so Express doesn't try to match them as an id.
router.get('/search', searchFoundations);
router.get('/brands/:brandId', getBrandById);
router.get('/brands', listBrands);
router.get('/products/:productId', getProductById);
router.get('/shades/:shadeId', getShadeById);
router.get('/shades', listShades);
router.get('/', listFoundations);

module.exports = router;
