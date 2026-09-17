"""Part 9 — shade chart CV pipeline tests. These build small synthetic
chart images in-process (colored rectangles + printed text via PIL) rather
than relying on real brand chart photos, so results are deterministic and
don't depend on any external asset.

No AI/OpenAI calls happen anywhere in this module — that extraction step
lives entirely on the Node side (services/aiExtractionService.js) and is
tested there with a mocked response. This file only exercises computer
vision: detection and color sampling.
"""

import numpy as np
import pytest
from PIL import Image, ImageDraw

from app.shade_chart.shade_color_extractor import extract_swatch_colors
from app.shade_chart.swatch_detector import detect_swatch_regions
from app.shade_chart.swatch_sampler import inset_box, sample_swatch
from app.utils.color_utils import rgb_to_lab


def make_strip_chart(colors, swatch_size=110, gap=40, margin=20, bg=(255, 255, 255)):
    """A single horizontal row of solid color blocks with a text label
    under each — the most common real-world shade chart layout."""
    width = margin * 2 + len(colors) * swatch_size + (len(colors) - 1) * gap
    height = margin * 2 + swatch_size + 30
    img = Image.new("RGB", (width, height), bg)
    draw = ImageDraw.Draw(img)
    for index, color in enumerate(colors):
        x0 = margin + index * (swatch_size + gap)
        y0 = margin
        draw.rectangle([x0, y0, x0 + swatch_size, y0 + swatch_size], fill=color)
        draw.text((x0 + swatch_size // 3, y0 + swatch_size + 5), f"{index + 1:02d}", fill=(20, 20, 20))
    return np.array(img)


def make_grid_chart(rows_of_colors, swatch_size=100, gap=30, margin=20, bg=(245, 245, 245)):
    n_cols = len(rows_of_colors[0])
    width = margin * 2 + n_cols * swatch_size + (n_cols - 1) * gap
    height = margin * 2 + len(rows_of_colors) * (swatch_size + 30) - 30
    img = Image.new("RGB", (width, height), bg)
    draw = ImageDraw.Draw(img)
    for row_index, row in enumerate(rows_of_colors):
        for col_index, color in enumerate(row):
            x0 = margin + col_index * (swatch_size + gap)
            y0 = margin + row_index * (swatch_size + 30)
            draw.rectangle([x0, y0, x0 + swatch_size, y0 + swatch_size], fill=color)
    return np.array(img)


# --- Swatch detection ---------------------------------------------------


class TestSwatchDetection:
    def test_detects_expected_number_of_swatches_in_a_strip(self):
        colors = [(241, 203, 164), (220, 185, 150), (200, 160, 120), (170, 120, 90)]
        image = make_strip_chart(colors)
        regions = detect_swatch_regions(image)
        assert len(regions) == len(colors)

    def test_orders_strip_swatches_left_to_right(self):
        colors = [(240, 210, 180), (200, 160, 120), (150, 100, 70)]
        image = make_strip_chart(colors)
        regions = detect_swatch_regions(image)
        xs = [r["x"] for r in regions]
        assert xs == sorted(xs)

    def test_orders_grid_swatches_in_reading_order(self):
        rows = [
            [(240, 210, 180), (220, 185, 150)],
            [(150, 100, 70), (120, 80, 55)],
        ]
        image = make_grid_chart(rows)
        regions = detect_swatch_regions(image)
        assert len(regions) == 4
        # first two returned should be the top row (smaller y), in x order
        top_two = regions[:2]
        assert all(r["y"] < regions[2]["y"] for r in top_two)
        assert top_two[0]["x"] < top_two[1]["x"]

    def test_no_swatches_on_pure_noise_image(self):
        noise = (np.random.default_rng(7).random((300, 400, 3)) * 255).astype(np.uint8)
        regions = detect_swatch_regions(noise)
        assert regions == []

    def test_no_swatches_on_single_flat_color_image(self):
        # A single uniform-color image looks like "one giant swatch" only
        # in the trivial sense — it's excluded as page background, not a
        # real chart with distinguishable shades.
        solid = np.full((300, 400, 3), 180, dtype=np.uint8)
        regions = detect_swatch_regions(solid)
        assert regions == []

    def test_handles_tiny_image_without_crashing(self):
        tiny = np.zeros((2, 2, 3), dtype=np.uint8)
        regions = detect_swatch_regions(tiny)
        assert isinstance(regions, list)


# --- Pixel sampling -------------------------------------------------------


class TestSwatchSampling:
    def test_samples_close_to_the_true_swatch_color(self):
        color = (200, 150, 100)
        image = make_strip_chart([color])
        regions = detect_swatch_regions(image)
        assert len(regions) == 1

        rng = np.random.default_rng(1)
        result = sample_swatch(image, regions[0], rng)
        assert result is not None
        for channel_true, channel_sampled in zip(color, result["rgb"]["mean"]):
            assert abs(channel_true - channel_sampled) <= 2

    def test_rejects_text_pixels_as_outliers(self):
        # A swatch with a large, high-contrast label baked INSIDE its area
        # (not just below it) should still sample close to the fill color —
        # the black text pixels must not drag the average down.
        color = (210, 170, 140)
        img = Image.new("RGB", (140, 140), color)
        draw = ImageDraw.Draw(img)
        draw.text((40, 60), "TEXT", fill=(0, 0, 0))
        array = np.array(img)

        box = {"x": 0, "y": 0, "width": 140, "height": 140}
        rng = np.random.default_rng(2)
        result = sample_swatch(array, box, rng)
        assert result is not None
        for channel_true, channel_sampled in zip(color, result["rgb"]["mean"]):
            assert abs(channel_true - channel_sampled) <= 3

    def test_returns_none_for_empty_region(self):
        image = np.zeros((50, 50, 3), dtype=np.uint8)
        box = {"x": 1000, "y": 1000, "width": 10, "height": 10}  # entirely outside the image
        rng = np.random.default_rng(3)
        assert sample_swatch(image, box, rng) is None

    def test_inset_box_shrinks_toward_center(self):
        box = {"x": 10, "y": 10, "width": 100, "height": 100}
        inset = inset_box(box, ratio=0.4)
        assert inset["x"] > box["x"]
        assert inset["y"] > box["y"]
        assert inset["width"] < box["width"]
        assert inset["height"] < box["height"]


# --- End-to-end extraction + Lab conversion consistency -------------------


class TestExtractSwatchColors:
    def test_returns_rgb_and_lab_in_reading_order(self):
        colors = [(230, 200, 170), (180, 130, 95), (120, 80, 55)]
        image = make_strip_chart(colors)
        results = extract_swatch_colors(image)

        assert len(results) == 3
        for expected_rgb, result in zip(colors, results):
            sampled_rgb = result["rgb"]["mean"]
            for a, b in zip(expected_rgb, sampled_rgb):
                assert abs(a - b) <= 2

    def test_lab_matches_the_shared_color_conversion_utility(self):
        color = (190, 140, 100)
        image = make_strip_chart([color])
        results = extract_swatch_colors(image)
        assert len(results) == 1

        expected_lab = rgb_to_lab(np.array([color], dtype=np.uint8))[0]
        actual_lab = results[0]["lab"]["mean"]
        for expected, actual in zip(expected_lab, actual_lab):
            assert actual == pytest.approx(expected, abs=1.0)

    def test_empty_image_yields_empty_list_not_a_crash(self):
        noise = (np.random.default_rng(9).random((200, 200, 3)) * 255).astype(np.uint8)
        assert extract_swatch_colors(noise) == []
