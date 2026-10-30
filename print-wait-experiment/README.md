# Print queue wait experiment

One small experiment: find one operational pattern in PC activity logs, then explain it in a 17-second animation.
Tools: DuckDB (analysis), Motion Canvas (animation), FFmpeg (MP4). No GPU, no paid APIs, no uploads.

**Privacy:** raw logs, results, the report and the video stay local (git-ignored). This repo holds code only.
The committed `animation/src/data.example.json` is fictional.

## Run it
```bash
pip install duckdb numpy
python3 -I analysis/ingest.py <dir-of-downloaded-json> data/slim.jsonl
python3 -I analysis/analyze.py data/slim.jsonl results/summary.json
python3 -I report/build_report.py results/summary.json report/report.html   # open in a browser

cd animation && npm install
npx vite --port 9000 &            # Motion Canvas editor (also lets you preview/edit)
npm run render                    # headless Chromium clicks Render -> output/print-wait/*.png
./make_mp4.sh                     # FFmpeg -> ../output/print_wait_explainer.mp4
```
Put real numbers in `animation/src/data.local.json` (same shape as the example).
