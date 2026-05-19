from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps


CHARACTER_ROWS = ("dad", "mom", "kid", "teen")
ENEMY_ROWS = ("banditi", "uomini_in_giacca", "ragazzini_bulli")

# Column indexes are the detected sprite order inside each row of sprite_v2.png.
# The sheet contains right-facing base frames; left-facing variants are mirrored
# where the row does not provide a complete left-facing sequence.
FAMILY_FRAME_MAP = {
    "idle_right.png": (0, False),
    "idle.png": (0, False),
    "idle_left.png": (0, True),
    "walk_right_1.png": (1, False),
    "walk_right_2.png": (2, False),
    "walk_right_3.png": (3, False),
    "walk_right_4.png": (4, False),
    "walk_right_5.png": (5, False),
    "walk_left_1.png": (1, True),
    "walk_left_2.png": (2, True),
    "walk_left_3.png": (3, True),
    "walk_left_4.png": (4, True),
    "walk_left_5.png": (5, True),
    "jump_right_1.png": (10, False),
    "jump_right_2.png": (11, False),
    "jump_right_3.png": (12, False),
    "jump_left_1.png": (10, True),
    "jump_left_2.png": (11, True),
    "jump_left_3.png": (12, True),
}

ENEMY_FRAME_MAP = {
    "idle_right.png": (0, False),
    "idle.png": (0, False),
    "idle_left.png": (0, True),
    "walk_right_1.png": (1, False),
    "walk_right_2.png": (2, False),
    "walk_right_3.png": (3, False),
    "walk_left_1.png": (1, True),
    "walk_left_2.png": (2, True),
    "walk_left_3.png": (3, True),
    "jump_right_1.png": (4, False),
    "jump_right_2.png": (5, False),
    "jump_right_3.png": (6, False),
    "jump_left_1.png": (4, True),
    "jump_left_2.png": (5, True),
    "jump_left_3.png": (6, True),
}


@dataclass(frozen=True)
class SpriteBox:
    left: int
    top: int
    right: int
    bottom: int

    def as_tuple(self) -> tuple[int, int, int, int]:
        return self.left, self.top, self.right, self.bottom


def is_background(pixel: tuple[int, int, int, int], threshold: int) -> bool:
    r, g, b, _ = pixel
    return r >= threshold and g >= threshold and b >= threshold


def foreground_mask(image: Image.Image, threshold: int) -> list[list[bool]]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    return [
        [not is_background(pixels[x, y], threshold) for x in range(width)]
        for y in range(height)
    ]


def contiguous_ranges(
    counts: list[int],
    min_count: int,
    min_size: int,
    merge_gap: int,
) -> list[tuple[int, int]]:
    ranges: list[tuple[int, int]] = []
    start: int | None = None

    for index, count in enumerate(counts):
        if count >= min_count and start is None:
            start = index
        elif count < min_count and start is not None:
            if index - start >= min_size:
                ranges.append((start, index - 1))
            start = None

    if start is not None and len(counts) - start >= min_size:
        ranges.append((start, len(counts) - 1))

    merged: list[tuple[int, int]] = []
    for left, right in ranges:
        if merged and left - merged[-1][1] <= merge_gap:
            merged[-1] = (merged[-1][0], right)
        else:
            merged.append((left, right))

    return merged


def detect_rows(mask: list[list[bool]]) -> list[tuple[int, int]]:
    width = len(mask[0])
    row_counts = [sum(row) for row in mask]
    return contiguous_ranges(
        row_counts,
        min_count=max(12, width // 260),
        min_size=30,
        merge_gap=10,
    )


def detect_columns(
    mask: list[list[bool]],
    row: tuple[int, int],
    min_height_pixels: int,
) -> list[tuple[int, int]]:
    height = len(mask)
    width = len(mask[0])
    top = max(0, row[0] - 4)
    bottom = min(height - 1, row[1] + 4)

    column_counts = [
        sum(mask[y][x] for y in range(top, bottom + 1))
        for x in range(width)
    ]
    return contiguous_ranges(
        column_counts,
        min_count=max(4, min_height_pixels // 45),
        min_size=20,
        merge_gap=24,
    )


def trim_to_foreground(image: Image.Image, threshold: int, padding: int) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    left, top = width, height
    right, bottom = -1, -1

    for y in range(height):
        for x in range(width):
            if is_background(pixels[x, y], threshold):
                pixels[x, y] = (255, 255, 255, 0)
                continue

            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 255)
            left = min(left, x)
            top = min(top, y)
            right = max(right, x)
            bottom = max(bottom, y)

    if right < left or bottom < top:
        raise ValueError("Empty sprite crop")

    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(width - 1, right + padding)
    bottom = min(height - 1, bottom + padding)
    return rgba.crop((left, top, right + 1, bottom + 1))


def detect_sprite_boxes(
    sheet: Image.Image,
    threshold: int,
    row_names: tuple[str, ...],
) -> dict[str, list[SpriteBox]]:
    mask = foreground_mask(sheet, threshold)
    rows = detect_rows(mask)

    if len(rows) != len(row_names):
        raise RuntimeError(
            f"Expected {len(row_names)} rows, detected {len(rows)}: {rows}"
        )

    boxes: dict[str, list[SpriteBox]] = {}
    for character, row in zip(row_names, rows):
        columns = detect_columns(mask, row, row[1] - row[0] + 1)
        if len(columns) < 7:
            raise RuntimeError(
                f"Expected at least 7 sprites for {character}, detected {len(columns)}"
            )
        boxes[character] = [
            SpriteBox(left, row[0], right + 1, row[1] + 1)
            for left, right in columns
        ]

    return boxes


def extract_sprites(
    source: Path,
    output_dir: Path,
    threshold: int,
    padding: int,
    write: bool,
    row_names: tuple[str, ...],
    frame_map: dict[str, tuple[int, bool]],
) -> None:
    sheet = Image.open(source).convert("RGBA")
    boxes_by_character = detect_sprite_boxes(sheet, threshold, row_names)

    for character in row_names:
        character_dir = output_dir / character
        if write:
            character_dir.mkdir(parents=True, exist_ok=True)

        boxes = boxes_by_character[character]
        for filename, (column_index, flip) in frame_map.items():
            if column_index >= len(boxes):
                raise RuntimeError(
                    f"{character}: frame {filename} needs column {column_index}, "
                    f"but only {len(boxes)} columns were detected"
                )

            crop = sheet.crop(boxes[column_index].as_tuple())
            sprite = trim_to_foreground(crop, threshold=threshold, padding=padding)
            if flip:
                sprite = ImageOps.mirror(sprite)

            target = character_dir / filename
            if write:
                sprite.save(target)
                action = "wrote"
            else:
                action = "would write"
            print(f"{action}: {target} ({sprite.width}x{sprite.height})")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract character or enemy sprites from a sprite sheet."
    )
    parser.add_argument(
        "--kind",
        choices=("family", "enemies"),
        default="family",
        help="Sheet layout to extract. Defaults to family.",
    )
    parser.add_argument(
        "source",
        nargs="?",
        default="sprite_v2.png",
        type=Path,
        help="Spritesheet path. Defaults to sprite_v2.png.",
    )
    parser.add_argument(
        "--output-dir",
        default=Path("."),
        type=Path,
        help="Directory containing dad, kid, mom and teen folders.",
    )
    parser.add_argument(
        "--threshold",
        default=245,
        type=int,
        help="RGB value used to treat near-white pixels as transparent background.",
    )
    parser.add_argument(
        "--padding",
        default=0,
        type=int,
        help="Transparent padding added around each trimmed sprite.",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write PNG files. Without this flag the script only prints a dry-run.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.kind == "enemies":
        row_names = ENEMY_ROWS
        frame_map = ENEMY_FRAME_MAP
    else:
        row_names = CHARACTER_ROWS
        frame_map = FAMILY_FRAME_MAP
    extract_sprites(
        source=args.source,
        output_dir=args.output_dir,
        threshold=args.threshold,
        padding=args.padding,
        write=args.write,
        row_names=row_names,
        frame_map=frame_map,
    )


if __name__ == "__main__":
    main()
