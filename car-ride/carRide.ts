import type { Ctx, Env, P } from "./core";
import type { Film } from "./film";

// CAR RIDE · a woman talking at the wheel. A flat cartoon in the "clean outline" hand.
//
// MEDIUM, physically: a vector cartoon. Every shape is a closed path filled with ONE flat colour
// and then outlined in a thick, even, near-black line with round joins. No gradients, no texture.
// MARKS: anchor, anchor, anchor, close, fill, then outline. ORDER: the dark cabin (roof, window,
// pillar, rear seat), then the figure from back to front (hair behind, torso, seat belt, neck and
// face, face features, ponytail), then the foreground (steering wheel, hands).
// PALETTE: charcoal cabin greys, one warm tan skin, deep chestnut hair, black top, a pale sky
// and sage bush in the window. Lines are #111 at 5 px.
// SUBJECT: a woman seen three-quarters from the passenger side, both hands on the wheel, hair in a
// high ponytail that drapes over her shoulder, one earbud in, mid-sentence.
// NOT ITS NEIGHBOUR (flatVector): that hand has no outlines at all; here every shape is outlined.

const W = 941, H = 1672, N = 30;
const INK = "#111114", LW = 5;
const C = {
  cabin: "#2b2d33", roof: "#23252b", trim: "#3a3d45", vent: "#6d7078", pillar: "#80838b", pillarD: "#5d6068",
  seat: "#33363d", seatEdge: "#d6d9de", sky: "#bfe2f2", bush: "#80ad6e", wall: "#f2e4cf", road: "#d8d4cb",
  skin: "#fbb774", skinS: "#ee9f5e", hair: "#3b2418", hairL: "#5a3a28", top: "#1b1c21", belt: "#575b65", beltE: "#7e828c",
  wheel: "#2c2e34", wheelH: "#41444c", mouth: "#a3303e", tongue: "#e8707f", teeth: "#fdf6f0",
};

// closed (or open) smooth path through anchors: Catmull-Rom turned into bezier segments
const trace = (c: Ctx, pts: P[], smoothed: boolean, closed = true) => {
  c.beginPath();
  if (!smoothed) { pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); if (closed) c.closePath(); return; }
  const n = pts.length, at = (i: number): P => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  c.moveTo(pts[0][0], pts[0][1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) c.closePath();
};
const shape = (c: Ctx, pts: P[], fill: string, smoothed = true, lw = LW) => {
  trace(c, pts, smoothed); c.fillStyle = fill; c.fill();
  if (lw > 0) { c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = "round"; c.lineCap = "round"; c.stroke(); }
};
const line = (c: Ctx, pts: P[], lw = LW, col = INK, smoothed = true) => {
  trace(c, pts, smoothed, false); c.lineWidth = lw; c.strokeStyle = col; c.lineJoin = "round"; c.lineCap = "round"; c.stroke();
};
const oval = (c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0, lw = 0) => {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
};

export const drawCarRide = (c: Ctx, _f: number, env: Env) => {
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  c.fillStyle = C.cabin; c.fillRect(0, 0, W, H);

  // ---- roof lining and its seams
  shape(c, [[0, 0], [330, 0], [250, 40], [90, 80], [0, 120]], C.roof, false, 0);
  line(c, [[0, 118], [150, 70], [330, 0]], 4, INK, true);
  line(c, [[705, 345], [790, 318], [941, 300]], 4);
  line(c, [[705, 345], [740, 372], [820, 420], [941, 418]], 4);
  // vent
  shape(c, [[430, 148], [548, 128], [575, 140], [572, 160], [455, 176], [432, 165]], C.vent, false, 4);
  for (let i = 0; i < 4; i++) line(c, [[445 + i * 4, 152 + i * 4 - 4], [560 + i * 3, 133 + i * 4]], 2, "#3d4047", false);
  // grab handle
  shape(c, [[38, 248], [100, 206], [180, 214], [305, 255], [326, 288], [286, 322], [240, 300], [186, 268], [108, 252], [62, 278]], C.trim, true, 5);
  line(c, [[110, 226], [180, 232], [260, 262]], 3, "#5a5e67");

  // ---- window with the world outside
  c.save();
  trace(c, [[0, 312], [197, 362], [184, 425], [70, 790], [0, 880]], false); c.clip();
  c.fillStyle = C.sky; c.fillRect(0, 300, 260, 260);
  [[10, 440, 34], [60, 470, 40], [112, 462, 30]].forEach(([x, y, r]) => oval(c, x, y, r, r * 0.9, C.bush));
  c.fillStyle = C.wall; c.fillRect(0, 528, 260, 240);
  c.fillStyle = C.road; c.fillRect(0, 650, 260, 40);
  c.fillStyle = "#c9c5bc"; c.fillRect(0, 760, 260, 130);
  c.restore();
  line(c, [[0, 312], [197, 362], [184, 425], [70, 790], [0, 880]], 5, INK, false);
  // door pillar
  shape(c, [[197, 362], [250, 376], [240, 450], [150, 700], [70, 960], [0, 955], [0, 880], [70, 790], [184, 425]], C.pillar, false, 5);
  line(c, [[236, 400], [225, 470], [135, 705], [62, 930]], 4, C.pillarD, false);
  // seat-belt anchor post behind her
  shape(c, [[272, 560], [326, 552], [318, 700], [262, 790], [205, 772], [250, 690]], C.trim, true, 5);

  // ---- rear seat: headrest and back, with its light piping
  shape(c, [[312, 600], [340, 545], [520, 515], [760, 525], [815, 560], [838, 690], [832, 800], [600, 840], [420, 830], [330, 760]], C.seat, true, 5);
  shape(c, [[838, 620], [941, 600], [941, 790], [850, 800]], "#2a2c32", false, 5);
  shape(c, [[580, 835], [800, 830], [876, 860], [915, 1000], [920, 1672], [560, 1672]], C.seat, true, 5);
  line(c, [[592, 842], [790, 838], [862, 868], [896, 1000], [902, 1672]], 13, INK, true);
  line(c, [[592, 842], [790, 838], [862, 868], [896, 1000], [902, 1672]], 6, C.seatEdge, true);

  // ---- hair behind the head
  shape(c, [[352, 610], [366, 520], [418, 442], [500, 382], [592, 366], [664, 402], [708, 474], [726, 566], [716, 656], [690, 732], [640, 780], [560, 800], [480, 770]], C.hair);

  // ---- torso in the black top
  shape(c, [[0, 988], [95, 950], [200, 905], [320, 890], [395, 942], [430, 1020], [500, 1062], [562, 1050], [640, 990], [660, 900], [760, 930], [832, 1010], [856, 1180], [804, 1400], [700, 1530], [590, 1672], [0, 1672]], C.top);
  // seat belt, over the top
  shape(c, [[392, 944], [468, 950], [640, 1672], [545, 1672], [405, 1330], [352, 1090]], C.belt, false, 5);
  line(c, [[412, 960], [425, 1090], [480, 1280], [565, 1672]], 4, C.beltE, false);

  // ---- forearm and hand on the wheel (her left arm, far side)
  shape(c, [[830, 1010], [858, 1240], [790, 1420], [620, 1500], [500, 1470], [470, 1330], [560, 1292], [655, 1262], [712, 1150], [700, 1050]], C.top);
  line(c, [[484, 1330], [470, 1440], [488, 1462]], LW);
  shape(c, [[150, 1285], [192, 1226], [262, 1214], [340, 1250], [432, 1302], [502, 1332], [506, 1440], [450, 1462], [382, 1442], [300, 1416], [238, 1402], [182, 1338]], C.skin);
  line(c, [[238, 1262], [290, 1292], [334, 1336]], 4);
  line(c, [[208, 1322], [262, 1356], [306, 1388]], 4);
  line(c, [[178, 1300], [222, 1336], [250, 1380]], 4);

  // ---- neck and chest
  shape(c, [[440, 822], [645, 818], [652, 902], [622, 990], [562, 1048], [500, 1060], [430, 1020], [396, 950], [412, 880]], C.skin);
  shape(c, [[440, 826], [540, 826], [640, 830], [648, 890], [590, 905], [510, 890], [452, 860]], C.skinS, true, 0);

  // ---- face
  shape(c, [[362, 575], [400, 525], [470, 508], [552, 518], [612, 560], [642, 640], [640, 705], [610, 772], [540, 816], [470, 833], [420, 820], [376, 772], [346, 702], [336, 640], [346, 598]], C.skin);
  // hairline strands over the forehead
  line(c, [[402, 524], [470, 504], [552, 514], [596, 530], [640, 560]], 5, INK, true);
  // ear and earbud
  shape(c, [[640, 640], [668, 640], [690, 668], [682, 705], [650, 722], [638, 700]], C.skin);
  oval(c, 648, 696, 20, 15, "#0d0d10", -0.4, 0);
  // brows
  line(c, [[360, 565], [398, 546], [448, 552]], 8);
  line(c, [[488, 568], [540, 570], [588, 596]], 8);
  // eyes with lash flicks
  oval(c, 398, 598, 16, 22, INK, 0.05);
  oval(c, 527, 625, 16, 22, INK, 0.12);
  line(c, [[364, 582], [378, 588], [384, 592]], 4, INK, false);
  line(c, [[368, 598], [380, 598]], 4, INK, false);
  line(c, [[566, 606], [582, 612], [576, 624]], 4, INK, true);
  line(c, [[562, 626], [578, 632]], 4, INK, false);
  // mouth, open mid-word
  shape(c, [[397, 716], [430, 708], [488, 724], [472, 750], [432, 762], [406, 746]], C.mouth, true, 5);
  c.save(); trace(c, [[397, 716], [430, 708], [488, 724], [472, 750], [432, 762], [406, 746]], true); c.clip();
  shape(c, [[412, 714], [450, 712], [486, 724], [466, 730], [430, 726]], C.teeth, true, 0);
  oval(c, 440, 756, 28, 13, C.tongue);
  c.restore();
  line(c, [[397, 716], [430, 708], [488, 724], [472, 750], [432, 762], [406, 746], [397, 716]], 5, INK, true);

  // ---- ponytail swept over the shoulder
  shape(c, [[404, 800], [470, 830], [440, 880], [372, 990], [276, 1110], [200, 1196], [194, 1130], [250, 1000], [330, 890], [380, 822]], C.hair);
  [[[430, 830], [370, 960], [260, 1120]], [[410, 820], [330, 940], [226, 1100]], [[448, 850], [400, 940], [310, 1060]]].forEach((p) => line(c, p as P[], 3, C.hairL, true));
  // top of the hair, a sleek crown with a few light strands
  shape(c, [[364, 584], [378, 500], [440, 432], [520, 392], [600, 392], [668, 436], [708, 520], [700, 570], [640, 560], [596, 530], [552, 514], [470, 504], [402, 524]], C.hair, true, 0);
  line(c, [[364, 584], [378, 500], [440, 432], [520, 392], [600, 392], [668, 436], [708, 520]], 5, INK, true);
  line(c, [[420, 470], [500, 410], [600, 400], [670, 440]], 3, C.hairL, true);
  line(c, [[430, 500], [520, 440], [620, 440]], 3, C.hairL, true);

  // ---- steering wheel in the foreground
  c.save();
  c.lineCap = "butt";
  c.beginPath(); c.arc(-260, 1500, 530, -1.05, 0.62); c.lineWidth = 108; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.arc(-260, 1500, 530, -1.05, 0.62); c.lineWidth = 98; c.strokeStyle = C.wheel; c.stroke();
  c.beginPath(); c.arc(-260, 1500, 556, -0.95, 0.5); c.lineWidth = 8; c.strokeStyle = C.wheelH; c.stroke();
  c.restore();
  shape(c, [[0, 1385], [90, 1420], [140, 1530], [150, 1672], [0, 1672]], "#222429", true, 5);
  // near hand gripping the rim, left edge
  shape(c, [[0, 990], [44, 1004], [92, 1050], [104, 1098], [66, 1122], [0, 1146]], C.skin);
  line(c, [[30, 1040], [62, 1070]], 4, INK, true);
  // her right thumb and fingers across the rim
  shape(c, [[150, 1285], [168, 1262], [205, 1256], [246, 1290], [220, 1318], [176, 1326]], C.skin, true, 0);
};

export const STYLE = { id: "carRide", name: "Clean outline cartoon", family: "vector cartoon", medium: "closed flat-fill paths with a thick even near-black outline", order: "cabin, figure back to front, wheel and hands last" };

export const carRide: Film = {
  meta: { title: "Car ride · woman driving", W, H, fps: 30, bpm: 120, durationFrames: N, holds: [[0, N, "a still"]] },
  assets: { images: {} },
  shots: [{ id: "still", start: 0, end: N, draw: drawCarRide }],
};
