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

  // express.json() throws a raw SyntaxError (with body-parser's engine
  // message, e.g. "Expected property name or '}' in JSON at position 1")
  // for a malformed request body — that message is an implementation
  // detail, not something to show a user.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'The request body is not valid JSON.' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : 'Internal server error',
  });
}

module.exports = { notFound, errorHandler };
