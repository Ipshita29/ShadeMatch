// Talks to the Python/FastAPI ML service. Uses Node's built-in fetch
// (stable since Node 18) rather than adding an HTTP client dependency.
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function callMlService(path, imageUrl) {
  let response;
  try {
    response = await fetch(`${ML_SERVICE_URL}${path}`, {
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

// Part 4 — face detection + raw region pixel/color measurements.
function analyzeSkinRegions(imageUrl) {
  return callMlService('/analyze/skin-regions', imageUrl);
}

// Part 5 — structured skin profile (depth/undertone/hue/confidence) built
// on top of the same Part 4 extraction. All classification logic lives in
// the ML service — Node only forwards the request and result.
function analyzeSkinProfile(imageUrl) {
  return callMlService('/analyze/skin-profile', imageUrl);
}

module.exports = { analyzeSkinRegions, analyzeSkinProfile };
