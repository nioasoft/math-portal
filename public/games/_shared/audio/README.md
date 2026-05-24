# Shared SFX

These files are preloaded by `SceneEngine` on every 3D game start.

| File          | Used for                       | Source     | License        |
|---------------|--------------------------------|------------|----------------|
| `success.ogg` | Correct answer / score gain    | Synthesized (ffmpeg sine waves: A4 + C5) | Public domain (synthetic) |
| `fail.ogg`    | Wrong answer (gentle)          | Synthesized (ffmpeg sine waves: E4 + B3) | Public domain (synthetic) |
| `click.ogg`   | Neutral UI selection feedback  | Synthesized (ffmpeg sine wave: 1kHz)     | Public domain (synthetic) |

Format: OGG Vorbis, mono, 44.1 kHz, 96 kbps. Each ≤ 20 KB.

These are placeholder synthesized sounds. They can be replaced with more polished SFX
when the games launch to real users — source replacements from CC0 libraries:

- https://opengameart.org/ (filter by CC0)
- https://freesound.org/ (filter by CC0)
- https://kenney.nl/assets/category:Audio (CC0)

When replacing, keep the same constraints (mono OGG, 44.1 kHz, ≤ 20 KB) and update
this table.
