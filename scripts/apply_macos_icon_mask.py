#!/usr/bin/env python3
"""Apply macOS squircle mask to icon PNGs and regenerate icon.icns."""

import os
import subprocess
import numpy as np
from PIL import Image

ICONS_DIR = os.path.join(os.path.dirname(__file__), '..', 'src-tauri', 'icons')
ICONSET_DIR = os.path.join(ICONS_DIR, 'macos.iconset')
OUTPUT_ICNS = os.path.join(ICONS_DIR, 'icon.icns')

# macOS squircle parameters (Apple icon grid)
# Superellipse: |x|^n + |y|^n <= 1, n ≈ 5
SUPERELLIPSE_EXPONENT = 5.0
# Apple's icon has ~82% content area (the shape itself covers ~78% of the canvas)
SHAPE_SCALE = 0.78


def generate_squircle_mask(size: int) -> np.ndarray:
    """Generate a squircle (superellipse) alpha mask at the given size."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float64)
    # Normalize to [-1, 1]
    cx, cy = size / 2.0, size / 2.0
    x_norm = (x - cx) / cx
    y_norm = (y - cy) / cy

    # Apply inverse of shape scale so the shape fills the right portion
    # We want the squircle boundary at SHAPE_SCALE from center
    x_scaled = np.abs(x_norm) / SHAPE_SCALE
    y_scaled = np.abs(y_norm) / SHAPE_SCALE

    # Superellipse equation: |x|^n + |y|^n
    dist = np.power(x_scaled, SUPERELLIPSE_EXPONENT) + np.power(y_scaled, SUPERELLIPSE_EXPONENT)

    # Anti-aliasing: smooth edge over ~2 pixels
    pixel_width = 2.0 / size  # normalized width of 2 pixels
    alpha = np.clip((1.0 - dist) / pixel_width, 0, 1)

    return (alpha * 255).astype(np.uint8)


def apply_mask_to_image(img: Image.Image, mask: np.ndarray) -> Image.Image:
    """Apply the squircle mask to an RGBA image."""
    img = img.convert('RGBA')
    r, g, b, a = img.split()

    # Combine original alpha with mask
    original_alpha = np.array(a, dtype=np.float64)
    mask_alpha = mask.astype(np.float64)
    combined = np.clip(original_alpha * mask_alpha / 255.0, 0, 255).astype(np.uint8)

    a = Image.fromarray(combined, mode='L')
    img.putalpha(a)
    return img


def process_iconset():
    """Apply squircle mask to all PNGs in macos.iconset/."""
    mask_cache = {}

    for filename in sorted(os.listdir(ICONSET_DIR)):
        if not filename.endswith('.png'):
            continue

        filepath = os.path.join(ICONSET_DIR, filename)
        img = Image.open(filepath)
        size = img.size[0]  # square icons

        if size not in mask_cache:
            mask_cache[size] = generate_squircle_mask(size)
            print(f"  Generated {size}x{size} mask")

        mask = mask_cache[size]
        result = apply_mask_to_image(img, mask)
        result.save(filepath, 'PNG')
        print(f"  Applied mask to {filename} ({size}x{size})")


def process_standalone_pngs():
    """Apply squircle mask to standalone icon PNGs."""
    standalone_files = [
        'icon.png',
        '128x128.png',
        '128x128@2x.png',
        '32x32.png',
        '64x64.png',
    ]
    mask_cache = {}

    for filename in standalone_files:
        filepath = os.path.join(ICONS_DIR, filename)
        if not os.path.exists(filepath):
            print(f"  Skipping {filename} (not found)")
            continue

        img = Image.open(filepath)
        size = img.size[0]

        if size not in mask_cache:
            mask_cache[size] = generate_squircle_mask(size)

        mask = mask_cache[size]
        result = apply_mask_to_image(img, mask)
        result.save(filepath, 'PNG')
        print(f"  Applied mask to {filename} ({size}x{size})")


def rebuild_icns():
    """Rebuild icon.icns from the iconset."""
    print("  Rebuilding icon.icns...")
    result = subprocess.run(
        ['iconutil', '--convert', 'icns', '--output', OUTPUT_ICNS, ICONSET_DIR],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr}")
        return False
    print(f"  Created {OUTPUT_ICNS}")
    return True


def main():
    print("=== Applying macOS squircle mask to icons ===\n")

    print("[1/3] Processing macos.iconset/ ...")
    process_iconset()

    print("\n[2/3] Processing standalone PNGs ...")
    process_standalone_pngs()

    print("\n[3/3] Rebuilding icon.icns ...")
    rebuild_icns()

    print("\nDone!")


if __name__ == '__main__':
    main()
