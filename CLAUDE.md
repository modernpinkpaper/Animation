# Animation repo: house style and rules

Owner: Dalia (modern pink paper). Reply to her in **simple English**. She likes "just do it".

## The animation style (use it for EVERY video made here)
The look is the "Robot Print Room" style. It is already built, in `robot-podcast/`.
- Engine: `robot-podcast/anim/index_pod3.html` (three.js). It draws the cute 3D robots
  (rounded white bodies, dark screen faces with blushing cheeks, colored ears and antennas),
  the pastel studio with three tiers, the caption bubbles, the name tags, and the info cards.
- Vertical 9:16 video, 576x1024, 24 fps.
- Cast: MICA (host), LEFTY, KRAFT, DUSTY, DYMO, STATUS and others (see `robot-podcast/pod/voices_cfg.py`).
- Themes: lilac, peach, mint, sky, rose.

## Rules
1. **Never invent a new animation style or rebuild the engine.** Always reuse `robot-podcast/`.
   If she says "make a video", "make an episode" or shares another creator's video as a style
   reference, copy the structure and pacing of that reference but draw it with THIS robot style.
2. To make an episode: copy `robot-podcast/pod/eps/e10.py` to a new file, change the script, then
   run (from inside `robot-podcast/`): `./setup.sh` (first time only), `python3 pod/mk.py N`, `./run_ep.sh N`.
3. Do not edit `index_pod3.html`, `render_ep.js`, `mk.py` or `voices_cfg.py` unless she asks.
   If something must change, add an option, do not rewrite.
4. Keep staff names, kids' names, exact money, medical details and passwords off screen.
5. Before sending a video: look at at least 4 frames. Then say honestly what you checked and what you
   could not (you cannot hear audio).
6. Rendering is slow (about 40 min per 3 minutes). Run it in the background and tell her.
