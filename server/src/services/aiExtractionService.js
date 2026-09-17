// Part 9 — the ONLY place in the app that calls OpenAI, and the only job
// it's given: "what shade labels/codes/names are visible in this image?"
// It never determines depth/undertone/hue/RGB (that's forbidden in the
// prompt below and re-enforced by sanitizeExtractionResponse stripping
// anything that slips through anyway), and it never touches the matching
// engine — see Part 9 spec section 8 for why AI, computer vision and the
// matching engine stay three separate responsibilities.
//
// Runs entirely on the backend; the API key never reaches the browser.
const { sanitizeExtractionResponse } = require('../utils/shadeChartValidation');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are a strict visual data-extraction assistant for a professional makeup artist tool. You will be shown an image of a foundation shade chart.

Your ONLY job is to identify what shade names, codes and labels are VISIBLE in the image as printed text. You are not a color scientist and you must not act like one.

Rules (follow exactly):
- Only report a shade if a name or code for it is legibly visible as text in the image.
- List shades in the order they appear: top-to-bottom, then left-to-right.
- Do NOT guess brand or product name if it is not visible as text in the image — use null instead.
- depth, undertone and hue must ALWAYS be null. Never infer them from a swatch's visual color, even if you are confident. That classification is done separately, deterministically, from measured pixel data — never from your visual impression.
- Do NOT invent RGB or Lab color values. You will not be asked for them and must not include them.
- extractionConfidence (0 to 1) reflects only how legible/certain the extracted TEXT is for that shade — it is not a measure of color accuracy, skin match quality, or scientific certainty.
- If the image contains no legible shade chart at all, return an empty "shades" array rather than guessing.

Respond with ONLY a JSON object matching exactly this schema, no other text:
{
  "brand": string or null,
  "product": string or null,
  "shades": [
    {
      "name": string,
      "code": string or null,
      "label": string or null,
      "depth": null,
      "undertone": null,
      "hue": null,
      "extractionConfidence": number between 0 and 1,
      "notes": array of short strings (e.g. ["partially obscured by glare"])
    }
  ]
}`;

function buildUserPrompt({ brandName, productName } = {}) {
  const context = [];
  if (brandName) context.push(`The selected brand is "${brandName}".`);
  if (productName) context.push(`The selected product is "${productName}".`);
  context.push('Extract every visible shade from this chart image.');
  return context.join(' ');
}

// `fetchImpl` is injectable so tests can supply a fake implementation and
// never make a real network call (see Part 9 spec section 23/18: mocked AI
// responses only in the automated test suite).
async function extractShadeChart(imageUrl, context = {}, { fetchImpl = fetch } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('Shade chart extraction is not available right now.');
    error.status = 503;
    throw error;
  }

  const model = process.env.OPENAI_VISION_MODEL || DEFAULT_MODEL;

  let response;
  try {
    response = await fetchImpl(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: buildUserPrompt(context) },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });
  } catch {
    const error = new Error('We couldn’t reach the shade extraction service. Please try again.');
    error.status = 503;
    throw error;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    const error = new Error('We couldn’t read this shade chart. Please try again.');
    error.status = 502;
    throw error;
  }

  const rawContent = payload.choices?.[0]?.message?.content;
  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const error = new Error('We couldn’t reliably read this shade chart.');
    error.status = 502;
    throw error;
  }

  // Never trust the parsed JSON blindly, even though it came back
  // structurally valid — every field is re-checked against the expected
  // types/enums before anything reaches the review UI (Part 9 spec
  // section 5: "Validate the response on the backend before returning it").
  return sanitizeExtractionResponse(parsed);
}

module.exports = { extractShadeChart };
