# Robot Print Room podcast kit

Makes the 9:16 robot podcast videos (3D robots in a studio, talking, info cards, captions).

## How it works (3 steps)
1. Write the script: `pod/eps/eN.py`  (copy `e10.py` and change the lines)
2. `python3 pod/mk.py N`   -> makes voices + `anim/epN.json` + audio
3. `./run_ep.sh N`         -> renders frames, makes `out_epN.mp4`

## Script file format (see pod/eps/e10.py)
- META: cast (6 robots), theme (lilac/peach/mint/sky/rose), intro=[line numbers], music=(bpm, 0-3), roles, badge, end1, end2
- Cards: `NAME=('TITLE',['bullet','bullet'],'#hexcolor')`
- Lines: `('WHO','Words to say.','emotion',pause_seconds[,CARD])`
  - WHO: MICA HOOKY CHARGEY DRAFTY LISTER LOGBOT LEFTY KRAFT DUSTY DYMO STATUS DALIA
  - emotion: happy excited deadpan sweet stern tired dramatic
- Keep each line short. Plain English. No staff names, money or private info on screen.

## Do not change
`anim/index_pod3.html`, `three.module.js`, `RoundedBoxGeometry.js`, `render_ep.js`, `pod/mk.py`, `pod/voices_cfg.py`.
Only write new scripts in `pod/eps/`. Same look every time.

Note: this repo is public, so only the example script e10.py is included. Keep your own scripts private if they hold personal details.
All commands are run from inside the robot-podcast folder.
