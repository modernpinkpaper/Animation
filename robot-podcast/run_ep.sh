#!/bin/bash
# usage: ./run_ep.sh N   (after: python3 pod/mk.py N)
EP=$1; ROOT="$(cd "$(dirname "$0")" && pwd)"; cd "$ROOT/anim"
(python3 -m http.server 8765 >/dev/null 2>&1 &) ; sleep 1
TOT=$(python3 -c "import json;print(int(json.load(open('ep$EP.json'))['total']*24))")
rm -rf frames_ep$EP; mkdir -p frames_ep$EP; Q=$(( (TOT+3)/4 ))
for i in 0 1 2 3; do a=$((i*Q)); b=$(( (i+1)*Q )); [ $b -gt $TOT ] && b=$TOT; node render_ep.js $EP $a $b > r_ep${EP}_$i.log 2>&1 & done
wait
DUR=$(python3 -c "import json;print(json.load(open('ep$EP.json'))['total'])")
ffmpeg -v error -y -framerate 24 -i frames_ep$EP/f_%04d.jpg -i ../pod/e${EP}_raw.wav -t $DUR -af loudnorm=I=-16:TP=-1.5 -c:v libx264 -pix_fmt yuv420p -crf 21 -c:a aac -b:a 160k -shortest ../out_ep$EP.mp4
rm -rf frames_ep$EP; pkill -f "http.server 8765"; echo "done: out_ep$EP.mp4"
