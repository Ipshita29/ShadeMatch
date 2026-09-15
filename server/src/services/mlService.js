// Talks to the Python/FastAPI ML service. Uses Node's built-in fetch
// (stable since Node 18) rather than adding an HTTP client dependency.
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function analyzeSkinRegions(imageUrl) {
  let response;
  try {
    response = await fetch(`${ML_SERVICE_URL}/analyze/skin-regions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // debug:true asks the ML service for an annotated preview image so
      // the artist can see which regions were sampled — small extra cost,
      // not required by the core pipeline.
      body: JSON.stringify({ imageUrl, debug: true }),
    });
  } catch {
    const error = new Error('Could not reach the skin analysis service. Please try again.');
    error.status = 503;
    throw error;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.error || 'Unable to analyze the photo. Please try again.');
    error.status = 422;
    throw error;
  }

  return payload.data;
}

module.exports = { analyzeSkinRegions };
