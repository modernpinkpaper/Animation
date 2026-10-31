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

// sample a smooth Catmull-Rom curve into plain points (so smooth arcs and sharp zigzags can share one polygon)
const sample = (pts: P[], per = 10): P[] => {
  const out: P[] = [], n = pts.length, at = (i: number) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < per; k++) {
    const t = k / per, p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2), t2 = t * t, t3 = t2 * t;
    out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
              0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
  }
  out.push(pts[n - 1]); return out;
};
const grad = (c: Ctx, a: P, b: P, stops: [number, string][]) => { const g = c.createLinearGradient(a[0], a[1], b[0], b[1]); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const fillShape = (c: Ctx, pts: P[], fill: string | CanvasGradient, smoothed = true, lw = LW) => {
  trace(c, pts, smoothed); c.fillStyle = fill; c.fill();
  if (lw > 0) { c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = "round"; c.lineCap = "round"; c.stroke(); }
};

export const drawCarRide = (c: Ctx, _f: number, env: Env) => {
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  c.fillStyle = C.cabin; c.fillRect(0, 0, W, H);

  // ---- roof lining: a lighter panel up and to the left, fading into the dark headliner
  c.fillStyle = grad(c, [0, 0], [520, 230], [[0, "#43464c"], [1, "#2a2b30"]]);
  trace(c, [[0, 0], [941, 0], [941, 12], [0, 218]], false); c.fill();
  line(c, [[0, 120], [150, 66], [326, 0]], 5, INK, true);
  line(c, [[941, 298], [790, 312], [738, 328], [708, 346], [718, 366], [780, 402], [941, 426]], 4, INK, true);
  // vent: a tilted rounded slot with three slats
  c.save(); c.translate(502, 152); c.rotate(-0.13);
  c.beginPath(); c.roundRect(-74, -24, 148, 48, 20); c.fillStyle = "#383b41"; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.roundRect(-58, -13, 116, 26, 10); c.fillStyle = "#1e2024"; c.fill(); c.lineWidth = 2.5; c.strokeStyle = "#8a8d94"; c.stroke();
  [-6, 0, 6].forEach((y) => line(c, [[-52, y], [52, y]], 3, "#9a9da4", false));
  c.restore();
  // grab handle: a bar with a hooked leg at the right
  fillShape(c, [[35, 244], [70, 222], [108, 205], [152, 202], [230, 222], [306, 255], [323, 274], [306, 308], [268, 322], [240, 306], [238, 284], [214, 272], [150, 252], [100, 270], [55, 268]], grad(c, [40, 205], [300, 320], [[0, "#4a4d55"], [1, "#2f3238"]]), true, 5);
  line(c, [[56, 240], [90, 222], [118, 214]], 4, "#6b6f78");

  // ---- window with the world outside, then three frame bands
  const pane: P[] = [[0, 305], [196, 357], [205, 366], [150, 500], [100, 612], [45, 722], [0, 806]];
  c.save(); trace(c, pane, false); c.clip();
  c.fillStyle = "#c9e6f8"; c.fillRect(0, 290, 260, 260);
  const bush = (x: number, y: number, rx: number, ry: number, col = "#86ae70") => oval(c, x, y, rx, ry, col);
  bush(24, 446, 54, 72); bush(60, 456, 30, 46); bush(8, 520, 70, 40); bush(60, 520, 70, 30); bush(135, 494, 36, 42, "#86ae70"); bush(162, 512, 38, 36, "#7da66a"); bush(112, 474, 24, 22);
  c.fillStyle = "#f4e6d2"; c.fillRect(0, 540, 260, 230);
  c.fillStyle = "#e9d8c0"; c.fillRect(0, 632, 260, 34);
  c.fillStyle = "#e3e5c9"; c.fillRect(0, 770, 260, 60);
  c.restore();
  const A: P[] = [[205, 364], [150, 500], [100, 612], [45, 722], [0, 806]];
  const B: P[] = [[229, 368], [172, 500], [120, 625], [66, 745], [10, 870]];
  const Cc: P[] = [[262, 372], [204, 500], [152, 622], [100, 745], [48, 868], [0, 960]];
  const D: P[] = [[306, 384], [282, 450], [252, 530], [222, 640], [196, 760], [190, 870], [170, 960], [140, 1010]];
  fillShape(c, [...A, ...[...B].reverse()], "#9a9da4", false, 0);                  // band 1, light
  fillShape(c, [...B, ...[...Cc].reverse()], "#2c2e34", false, 0);                // band 2, dark
  fillShape(c, [...Cc, ...[...D].reverse()], grad(c, [180, 400], [300, 700], [[0, "#8b8e95"], [0.5, "#a7aab0"], [1, "#8f9299"]]), false, 0);
  [A, B, Cc, D].forEach((l) => line(c, l, 6, INK, false));
  line(c, [[205, 364], [229, 368], [262, 372], [290, 376], [306, 384]], 5, INK, true);
  line(c, [[0, 305], [196, 357], [205, 366]], 6, INK, false);
  // dashboard / door panel at the bottom-left
  fillShape(c, [[0, 806], [45, 722], [0, 960]], "#2c2e34", false, 0);

  // ---- seat behind her: side post, headrest, back and piping
  fillShape(c, [[318, 548], [344, 545], [354, 810], [306, 870], [282, 760], [300, 640]], "#4b4f58", true, 5);
  fillShape(c, [[272, 562], [330, 552], [322, 700], [262, 792], [205, 774], [252, 690]], "#33363d", true, 5);
  fillShape(c, [[312, 600], [340, 545], [520, 515], [760, 525], [815, 560], [838, 690], [832, 800], [600, 840], [420, 830], [330, 760]], C.seat, true, 5);
  line(c, [[722, 500], [782, 512], [832, 540]], 8, "#c9ccd2", true);
  fillShape(c, [[838, 620], [941, 600], [941, 790], [850, 800]], "#2a2c32", false, 5);
  fillShape(c, [[470, 820], [782, 852], [941, 880], [941, 1672], [560, 1672], [580, 835]], C.seat, true, 0);
  line(c, [[478, 816], [780, 845]], 12, INK, false); line(c, [[478, 816], [780, 845]], 6, "#c9ccd2", false);
  line(c, [[478, 800], [780, 830]], 3, INK, false);
  fillShape(c, [[750, 880], [800, 860], [870, 900], [890, 1100], [880, 1672], [760, 1672], [780, 1300], [770, 1000]], grad(c, [760, 0], [900, 0], [[0, "#3a3d45"], [0.5, "#4a4e57"], [1, "#3c3f47"]]), true, 0);
  line(c, [[798, 858], [856, 878], [882, 1000], [884, 1250], [876, 1400], [856, 1500], [834, 1620], [826, 1672]], 13, INK, true);
  line(c, [[798, 858], [856, 878], [882, 1000], [884, 1250], [876, 1400], [856, 1500], [834, 1620], [826, 1672]], 6, C.seatEdge, true);
  line(c, [[905, 880], [922, 1000], [930, 1250], [920, 1500], [900, 1672]], 5, INK, true);

  // ---- hair behind the head
  fillShape(c, [[352, 610], [366, 520], [418, 442], [500, 382], [592, 366], [664, 402], [708, 474], [726, 566], [716, 656], [690, 732], [640, 780], [560, 800], [480, 770]], C.hair, true, 0);

  // ---- torso in the black top
  fillShape(c, [[0, 1000], [100, 948], [210, 884], [310, 866], [398, 935], [402, 985], [425, 1032], [465, 1060], [522, 1050], [572, 1010], [612, 950], [642, 894], [720, 868], [790, 898], [830, 980], [834, 1100], [806, 1190], [748, 1250], [714, 1310], [706, 1420], [712, 1520], [730, 1600], [744, 1672], [0, 1672]], C.top, true, 5);
  line(c, [[722, 888], [672, 990], [642, 1090], [604, 1200], [566, 1318]], 5, INK, true);
  line(c, [[660, 1000], [648, 1040]], 4, INK, false);
  // left arm sleeve
  fillShape(c, [[310, 866], [210, 884], [100, 948], [0, 1000], [0, 1072], [120, 1060], [240, 1010], [330, 960]], "#202126", true, 5);

  // ---- seat belt
  fillShape(c, [[385, 940], [440, 940], [420, 1000], [445, 1075], [492, 1172], [540, 1282], [572, 1360], [530, 1490], [470, 1330], [405, 1232], [376, 1148], [347, 1036]], grad(c, [350, 940], [560, 1400], [[0, "#4f535c"], [1, "#5d626c"]]), false, 5);
  fillShape(c, [[518, 1470], [640, 1500], [700, 1672], [600, 1672]], "#585d68", false, 5);
  line(c, [[420, 960], [470, 1100]], 4, "#6b707b", false);

  // ---- forearm on the right (black sleeve), cuff at the wrist
  fillShape(c, [[490, 1325], [560, 1317], [640, 1320], [716, 1330], [722, 1400], [726, 1462], [690, 1494], [620, 1502], [540, 1490], [482, 1456], [502, 1400]], "#1d1e23", true, 0);
  line(c, [[490, 1325], [560, 1317], [640, 1320], [716, 1330]], 5, INK, true);
  line(c, [[482, 1456], [540, 1490], [620, 1502], [690, 1494], [728, 1462]], 5, INK, true);
  [[[648, 1282], [690, 1300], [712, 1338]], [[662, 1272], [704, 1292], [724, 1330]], [[640, 1292], [676, 1312], [694, 1342]]].forEach((p) => line(c, p as P[], 3, INK, true));

  // ---- ponytail swept over the shoulder, with long strands
  fillShape(c, [[330, 790], [395, 830], [446, 850], [402, 902], [346, 1000], [302, 1100], [291, 1180], [300, 1262], [264, 1296], [240, 1262], [212, 1172], [196, 1082], [206, 992], [250, 900], [298, 846]], grad(c, [200, 850], [420, 1200], [[0, "#4a2f21"], [1, "#352015"]]), true, 5);
  [[[420, 860], [372, 960], [326, 1080], [300, 1200], [270, 1275]], [[395, 850], [336, 940], [280, 1050], [250, 1160], [250, 1240]], [[360, 840], [300, 920], [246, 1010], [222, 1110], [226, 1190]], [[330, 820], [276, 900], [226, 990], [206, 1070]]].forEach((p) => line(c, p as P[], 3.5, "#1a0e09", true));
  [[[405, 870], [352, 970], [310, 1090]], [[320, 850], [262, 940], [226, 1040]]].forEach((p) => line(c, p as P[], 3, "#6a4733", true));

  // ---- neck and chest
  fillShape(c, [[445, 790], [582, 790], [590, 872], [640, 894], [612, 950], [572, 1010], [522, 1050], [465, 1060], [425, 1032], [396, 985], [392, 935], [445, 900]], "#fdb877", true, 5);
  c.save(); trace(c, [[445, 790], [582, 790], [590, 872], [640, 894], [612, 950], [572, 1010], [522, 1050], [465, 1060], [425, 1032], [396, 985], [392, 935], [445, 900]], true); c.clip();
  oval(c, 505, 818, 82, 38, "#f6ad6e"); c.restore();

  // ---- face (extends under the hair; the hairline is cut by the hair cap)
  fillShape(c, [[352, 480], [412, 430], [520, 426], [562, 446], [602, 480], [628, 530], [640, 584], [642, 640], [640, 690], [612, 748], [572, 784], [520, 806], [480, 816], [430, 808], [386, 790], [350, 750], [334, 690], [326, 630], [331, 570]], grad(c, [330, 430], [640, 820], [[0, "#ffbc80"], [1, "#fdb577"]]), true, 5);
  fillShape(c, [[390, 786], [430, 812], [480, 822], [520, 812], [572, 786], [546, 800], [500, 808], [440, 806]], "#f2a666", true, 0);
  fillShape(c, [[618, 612], [642, 650], [640, 700], [612, 650]], "#2a1810", false, 0);

  // hair cap: smooth outer sweep, jagged hairline cut into the forehead
  const outer = sample([[352, 520], [358, 468], [374, 432], [400, 402], [440, 374], [500, 354], [560, 350], [620, 368], [672, 408], [708, 468], [722, 540], [716, 612], [698, 668], [668, 716], [640, 748], [612, 768]], 10);
  const hairline: P[] = [[612, 748], [632, 706], [638, 668], [634, 640], [634, 610], [630, 588], [632, 562], [620, 548], [618, 524], [602, 510], [596, 486], [574, 474], [556, 450], [522, 440], [504, 420], [480, 436], [462, 418], [452, 438], [432, 428], [420, 440], [398, 426], [376, 448], [358, 480]];
  fillShape(c, [...outer, ...hairline], grad(c, [360, 350], [720, 640], [[0, "#4b3022"], [0.5, "#3a2318"], [1, "#2e1a11"]]), false, 5);
  [[[418, 432], [404, 404], [418, 376]], [[455, 424], [450, 388], [470, 362]], [[500, 424], [506, 392], [540, 366]], [[540, 446], [572, 408], [620, 390]], [[580, 480], [630, 440], [676, 430]], [[606, 520], [660, 480], [700, 490]], [[620, 560], [670, 530], [712, 540]], [[634, 600], [676, 580], [714, 590]], [[640, 650], [684, 640], [706, 650]]].forEach((p) => line(c, p as P[], 3.5, "#1a0e09", true));
  [[[470, 390], [540, 372], [600, 380]], [[520, 420], [590, 400], [650, 420]]].forEach((p) => line(c, p as P[], 3, "#6a4733", true));

  // ear and earbud
  fillShape(c, [[640, 646], [672, 638], [698, 662], [700, 694], [678, 726], [642, 736], [615, 725], [610, 698]], "#fdb877", true, 5);
  line(c, [[656, 658], [680, 656], [686, 680]], 3.5, INK, true);
  oval(c, 652, 698, 20, 13, "#0f0f12", -0.35, 0);

  // ---- face features
  line(c, [[352, 538], [376, 516], [408, 511], [434, 531]], 13, INK, true);               // left brow
  line(c, [[493, 553], [536, 545], [572, 562], [596, 590]], 12, INK, true);               // right brow
  oval(c, 400, 598, 15, 26, "#161618", 0.08);
  oval(c, 522, 629, 16, 26, "#161618", 0.12);
  line(c, [[358, 583], [356, 570], [384, 562], [412, 572], [418, 592]], 4.5, INK, true);   // left lid, wing at left
  line(c, [[357, 570], [366, 566]], 3.5, INK, false);
  line(c, [[492, 604], [516, 590], [550, 590], [574, 604]], 4.5, INK, true);              // right lid
  line(c, [[570, 604], [586, 612]], 3.5, INK, false); line(c, [[566, 612], [572, 626]], 3.5, INK, false);
  // mouth, open mid-word
  const mouth: P[] = [[397, 711], [430, 706], [478, 727], [468, 744], [440, 757], [412, 752], [398, 732]];
  fillShape(c, mouth, "#6b2b30", true, 5);
  c.save(); trace(c, mouth, true); c.clip();
  oval(c, 440, 756, 36, 15, "#d0706f");
  fillShape(c, [[404, 712], [440, 712], [476, 726], [440, 724]], "#fdf6f0", false, 0);
  c.restore();
  line(c, [...mouth, mouth[0]], 5, INK, true);

  // ---- steering wheel: rim, hub spoke, dash
  fillShape(c, [[0, 1290], [100, 1312], [196, 1370], [250, 1430], [250, 1672], [0, 1672]], "#2a2c32", false, 0);
  fillShape(c, [[0, 1292], [110, 1312], [220, 1378], [252, 1432], [200, 1424], [110, 1372], [0, 1352]], grad(c, [0, 1300], [250, 1430], [[0, "#6d7179"], [1, "#3a3d44"]]), true, 5);
  line(c, [[0, 1380], [60, 1450], [92, 1540], [112, 1672]], 5, INK, true);
  fillShape(c, [[368, 1590], [452, 1564], [540, 1596], [568, 1672], [368, 1672]], "#2e3a4d", true, 5);
  fillShape(c, [[365, 1500], [470, 1520], [545, 1560], [455, 1566], [368, 1590]], "#4b4f58", true, 5);
  const rimOuter: P[] = [[0, 1095], [60, 1112], [130, 1152], [210, 1212], [272, 1274], [330, 1356], [362, 1430], [372, 1500], [366, 1580], [354, 1672]];
  const rimInner: P[] = [[0, 1178], [60, 1222], [122, 1296], [190, 1374], [248, 1432], [252, 1500], [244, 1600], [230, 1672]];
  fillShape(c, [...rimOuter, ...[...rimInner].reverse()], grad(c, [0, 1100], [380, 1500], [[0, "#4b4f58"], [0.5, "#34373e"], [1, "#2b2d33"]]), true, 6);
  line(c, [[8, 1112], [70, 1130], [140, 1172], [215, 1228]], 7, "#6a6e77", true);

  // ---- left hand (far left edge) on the rim
  fillShape(c, [[0, 1003], [42, 1008], [84, 1038], [100, 1074], [90, 1092], [58, 1102], [26, 1120], [0, 1136]], "#fdb877", true, 5);
  line(c, [[58, 1030], [80, 1056], [84, 1080]], 3.5, INK, true);
  // right fist gripping the rim
  fillShape(c, [[198, 1222], [260, 1212], [310, 1223], [348, 1257], [360, 1317], [438, 1332], [488, 1352], [501, 1407], [493, 1449], [466, 1465], [418, 1449], [350, 1423], [298, 1413], [252, 1427], [234, 1403], [208, 1393], [206, 1357], [174, 1337], [148, 1303], [153, 1261], [183, 1233]], "#fdb877", true, 6);
  fillShape(c, [[390, 1425], [438, 1439], [478, 1453], [466, 1465], [418, 1449], [378, 1435]], "#f2a666", true, 0);
  [[[170, 1293], [213, 1269], [258, 1264]], [[208, 1353], [248, 1329], [276, 1320]], [[236, 1403], [288, 1371], [306, 1363]], [[348, 1297], [364, 1369]]].forEach((p) => line(c, p as P[], 4, INK, true));
};

export const STYLE = { id: "carRide", name: "Clean outline cartoon", family: "vector cartoon", medium: "closed flat-fill paths with a thick even near-black outline", order: "cabin, figure back to front, wheel and hands last" };

export const carRide: Film = {
  meta: { title: "Car ride · woman driving", W, H, fps: 30, bpm: 120, durationFrames: N, holds: [[0, N, "a still"]] },
  assets: { images: {} },
  shots: [{ id: "still", start: 0, end: N, draw: drawCarRide }],
};
