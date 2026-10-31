#!/usr/bin/env bash
# Run after: npm install; npx vite --port 9000 &; npm run render
set -euo pipefail
ffmpeg -y -framerate 30 -i output/print-wait/%06d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart ../output/print_wait_explainer.mp4
