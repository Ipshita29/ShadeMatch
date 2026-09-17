const express = require('express');
const upload = require('../middleware/upload');
const {
  uploadClientPhoto,
  createClient,
  analyzeSkinRegions,
  analyzeSkin,
  matchClient,
} = require('../controllers/client.controller');

const router = express.Router();

router.post('/upload-photo', upload.single('photo'), uploadClientPhoto);
router.post('/', createClient);
router.post('/:clientId/analyze-skin-regions', analyzeSkinRegions);
router.post('/:clientId/analyze-skin', analyzeSkin);
router.post('/:clientId/match', matchClient);

module.exports = router;
