#!/bin/bash
# One-time setup: tools + voices
pip install piper-tts numpy
npm install playwright && npx playwright install chromium
sudo apt-get install -y ffmpeg 2>/dev/null || true
cd "$(dirname "$0")/voices"
H=https://huggingface.co/rhasspy/piper-voices/resolve/main
get(){ for e in onnx onnx.json; do [ -f $2-$3.$e ] || curl -sSL -o $2-$3.$e "$H/${2%%_*}/$2/$4/$5/$2-$3-$5.$e" 2>/dev/null; done; }
for v in "en_US amy" "en_GB alba" "en_US ryan" "en_US kristin" "en_US joe" "en_US lessac" "en_US hfc_female" "en_US ljspeech"; do set -- $v
  loc=$1; n=$2; q=medium; [ -f $loc-$n-$q.onnx ] || { curl -sSL -o $loc-$n-$q.onnx "$H/${loc%%_*}/$loc/$n/$q/$loc-$n-$q.onnx"; curl -sSL -o $loc-$n-$q.onnx.json "$H/${loc%%_*}/$loc/$n/$q/$loc-$n-$q.onnx.json"; }; done
ls
