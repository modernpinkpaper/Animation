# city-walk: 10 s blocky street proof of concept

One 10 s, 9:16 (720x1280, 30 fps) animation: a person walks along a sidewalk, stops in front of
another person, and turns to face them. The camera trails the walker, then slowly arcs to a side view.
No text, audio or dialogue.

Output: `city-walk.mp4` (sample frames: `contact-sheet.png`).

## Run

```bash
npm install                 # three@0.170.0 (MIT); playwright is only needed for the MP4 export
npx playwright install chromium   # skip if a Chromium is already installed
npm run render              # -> city-walk.mp4  (about 2.5 min on 4 CPU cores, no GPU)
npm run preview             # live looping preview at http://localhost:8080/
```

`render.mjs` drives headless Chromium with software WebGL (ANGLE + SwiftShader), renders each frame at
an exact timestamp, and pipes PNGs into `ffmpeg` (libx264, yuv420p). Needs `ffmpeg` on PATH.
`SAVE_FRAMES=dir npm run render` also keeps the PNG frames.

## Files

- `scene.js`: the whole scene: buildings, props, two characters, timeline, camera.
- `index.html`: live preview, and the page `render.mjs` drives.
- `render.mjs`: frame-by-frame export to MP4.

## Sources and licences

Everything is original procedural geometry and canvas textures. Only dependency in the scene: three.js (MIT).
The other repos in the brief (ReinaldoMT/block, Gaurav-Gosain/city, gobkit-free-assets) were **not**
used, and no code or assets were copied from them.
