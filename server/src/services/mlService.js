// Talks to the Python/FastAPI ML service. Uses Node's built-in fetch
// (stable since Node 18) rather than adding an HTTP client dependency.
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function postToMlService(
  path,
  body,
  {
    unreachableMessage = 'Could not reach the skin analysis service. Please try again.',
    failureMessage = 'Unable to analyze the photo. Please try again.',
  } = {}
) {
  let response;
  try {
    response = await fetch(`${ML_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    const error = new Error(unreachableMessage);
    error.status = 503;
    throw error;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.error || failureMessage);
    error.status = 422;
    throw error;
  }

  return payload.data;
}

// Part 4 — face detection + raw region pixel/color measurements.
function analyzeSkinRegions(imageUrl) {
  // debug:true asks the ML service for an annotated preview image so the
  // artist can see which regions were sampled — small extra cost, not
  // required by the core pipeline.
  return postToMlService('/analyze/skin-regions', { imageUrl, debug: true });
}

// Part 5 — structured skin profile (depth/undertone/hue/confidence) built
// on top of the same Part 4 extraction. All classification logic lives in
// the ML service — Node only forwards the request and result.
function analyzeSkinProfile(imageUrl) {
  return postToMlService('/analyze/skin-profile', { imageUrl, debug: true });
}

// Part 7 — scores a set of foundation shades against a client's skin
// profile. All matching math lives in the ML service; Node only retrieves
// the profile + shades from MongoDB and forwards them (see Part 7 spec:
// the ML service never queries the database itself).
function matchShades(skinProfile, shades) {
  return postToMlService(
    '/match',
    { skinProfile, shades },
    {
      unreachableMessage: 'We couldn’t complete the match right now. Please try again.',
      failureMessage: 'We couldn’t complete the match right now. Please try again.',
    }
  );
}

// Part 9 — pure computer-vision swatch color estimation for an uploaded
// shade chart image. Deliberately separate from the AI/vision label
// extraction call (see services/aiExtractionService.js): this only ever
// samples pixels, it has no idea what a shade's name is.
function extractSwatchColors(imageUrl) {
  return postToMlService(
    '/shade-chart/extract-colors',
    { imageUrl },
    {
      unreachableMessage: 'We couldn’t read the colors on this shade chart right now. Please try again.',
      failureMessage: 'We couldn’t read the colors on this shade chart right now. Please try again.',
    }
  );
}

module.exports = { analyzeSkinRegions, analyzeSkinProfile, matchShades, extractSwatchColors };
