const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { rgbToLab, labToLch, hexToRgb } = require('../src/utils/colorUtils');
const { classifyDepth, classifyUndertone, classifyHue } = require('../src/utils/colorClassification');

describe('colorUtils', () => {
  test('hexToRgb parses a hex string into RGB channels', () => {
    assert.deepStrictEqual(hexToRgb('#B87950'), { r: 184, g: 121, b: 80 });
  });

  test('rgbToLab produces a lightness near 0 for black and near 100 for white', () => {
    assert.ok(Math.abs(rgbToLab({ r: 0, g: 0, b: 0 }).l - 0) < 1);
    assert.ok(Math.abs(rgbToLab({ r: 255, g: 255, b: 255 }).l - 100) < 1);
  });

  test('labToLch computes chroma/hue consistently from a/b', () => {
    const lch = labToLch({ l: 50, a: 3, b: 4 }); // 3-4-5 triangle
    assert.ok(Math.abs(lch.c - 5) < 1e-6);
    assert.ok(lch.h > 0 && lch.h < 360);
  });
});

describe('colorClassification (mirrors ml-service Part 5 thresholds)', () => {
  const depthCases = [
    [15, 'Very Deep'],
    [28, 'Deep'],
    [43, 'Medium Deep'],
    [56, 'Medium'],
    [69, 'Light Medium'],
    [85, 'Light'],
  ];

  for (const [l, expected] of depthCases) {
    test(`classifies L*=${l} as ${expected}`, () => {
      assert.strictEqual(classifyDepth({ l }), expected);
    });
  }

  test('depth boundary is deterministic (L*==20 falls into Deep, not Very Deep)', () => {
    assert.strictEqual(classifyDepth({ l: 19.9 }), 'Very Deep');
    assert.strictEqual(classifyDepth({ l: 20.0 }), 'Deep');
  });

  test('classifies a warm ratio as Warm', () => {
    assert.strictEqual(classifyUndertone({ a: 10, b: 15 }), 'Warm');
  });

  test('classifies a cool ratio as Cool', () => {
    assert.strictEqual(classifyUndertone({ a: 10, b: 7 }), 'Cool');
  });

  test('classifies a balanced ratio as Neutral', () => {
    assert.strictEqual(classifyUndertone({ a: 10, b: 10 }), 'Neutral');
  });

  test('classifies low-a/retained-b as Olive hue, not Golden', () => {
    assert.strictEqual(classifyHue({ a: 5, b: 15 }), 'Olive');
  });

  test('classifies a clearly warm, non-desaturated color as Golden hue', () => {
    assert.strictEqual(classifyHue({ a: 14, b: 22 }), 'Golden');
  });

  test('classifies a cool color as Rosy hue', () => {
    assert.strictEqual(classifyHue({ a: 12, b: 8 }), 'Rosy');
  });
});
