# Reconstructed assets

This project uses extracted PNG assets and a hand-authored terrain profile.

- `character-sprites/`: transparent frame exports derived from `sprite_v2.png`.
- `character-sprites/<character>/`: per-character sprites named by state, for example `idle_right.png`, `walk_right_1.png`, `jump_left_2.png`.
- `terrain.json`: editable terrain profile and gap data loaded by the game.

All rendering uses nearest-neighbor pixel drawing with smoothing disabled.
The runtime loads the character sprites directly from disk and switches among `idle`, `walk`, and `jump` frames based on movement state.
Use `terrain-editor.html` to edit the ground profile and export JSON back into the game.
