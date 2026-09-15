const multer = require('multer');

function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err.stack);

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be smaller than 5 MB.'
        : 'There was a problem uploading your file.';
    return res.status(400).json({ success: false, message });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : 'Internal server error',
  });
}

module.exports = { notFound, errorHandler };
