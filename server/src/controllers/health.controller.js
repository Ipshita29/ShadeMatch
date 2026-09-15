function getHealth(req, res) {
  res.json({
    success: true,
    message: 'ShadeMatch API is running',
  });
}

module.exports = { getHealth };
