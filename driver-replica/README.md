# Driver replica

A vector copy of a 5-second driving clip (464x832, 24 fps, 122 frames). The source video is the owner's own work
(image from ChatGPT, motion from Midjourney). The copy is made of flat vector shapes drawn by a canvas, not pixels.

- `driver-replica.mp4`: the copy.
- `compare_original_top_traced_bottom.png`: four frames, original on top, the copy below.
- `tools/trace.py`: the tracer (video frames to stacked vector layers).
- `tools/scene.js`: replays the traced layers inside the [drawn-by-code](https://github.com/illodev/drawn-by-code) engine.
- `tools/score.mjs`, `tools/score2.mjs`: measure how close a render is to the original.
- `data/trace.js.gz`: the traced shapes for all 122 frames (65 MB when unzipped).

## How close is it

Measured on all 122 frames against the original (the copy has a very light blur, sigma 0.6, like the original's soft edges):

| Measure | Score |
|---|---|
| Edge match (outlines within 2 px) | 97.6% |
| Pixel colour match (each channel within 24 of 255) | 93.4% |
| Pixel colour match (within 32) | 95.7% |
| SSIM (structure similarity) | 91.5% |

Weakest regions: the face (colour match 88.6%) and the left arm (89.5%). Reason: the original has soft shading and fine
grain that flat shapes cannot copy. Small pale patches on the forearm and some dotted lines on the ceiling edge are visible.
SSIM did not reach 93%.

## Make it again

```bash
# 1. extract frames (f_001.png ...)
ffmpeg -i original.mp4 frames/f_%03d.png
# 2. trace
pip install opencv-python-headless numpy
python3 tools/trace.py frames private/trace.js --k 36 --extra 5 --scale 2 --eps 1.6 --ink-eps 0.9 \
  --min 30 --ink-min 8 --mode 2 --smooth 1.0 --ink-thresh 24 --thin 26 --aa 3 --ms 4 --sr 14
# 3. replay: put this folder under drawn-by-code/sandbox/<name>/ and render
node engine/render.mjs sandbox/<name>/scene.js --size 464
# 4. score (needs out/reference.mp4 = the original)
node score2.mjs out/<name>.mp4
```

To skip the trace, `gunzip -c data/trace.js.gz > private/trace.js`.

## How the tracer works

1. Make a colour palette over the whole video (k-means). Dark pixels and thin dark lines become one crisp "ink" colour.
2. Per frame: colours come from a smoothed copy, ink comes from the sharp one. Remove specks and the blurry fringe next to ink.
3. Trace each colour region to a polygon, smooth it and simplify it.
4. Stack the layers (big areas first, ink last) so neighbouring colours never leave gaps.
