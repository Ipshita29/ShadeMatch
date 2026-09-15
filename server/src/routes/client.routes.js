const express = require('express');
const upload = require('../middleware/upload');
const { uploadClientPhoto, createClient } = require('../controllers/client.controller');

const router = express.Router();

router.post('/upload-photo', upload.single('photo'), uploadClientPhoto);
router.post('/', createClient);

module.exports = router;
