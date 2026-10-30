// 10-second blocky city-street scene. Everything is original Three.js geometry
// and procedural canvas textures: no external models, images or APIs.
// World axes: +x runs along the sidewalk, +y is up, +z points toward the road.
import * as THREE from 'three';

export const DURATION = 10;

// ---------- small helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvasTex(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---------- sky ----------
function skyTexture() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#2f6db5');
    grd.addColorStop(0.55, '#5f9ad3');
    grd.addColorStop(1, '#bcd8ef');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 26; i++) {           // soft flat-ish clouds
      const cx = r() * w, cy = h * (0.15 + r() * 0.6), s = 40 + r() * 70;
      for (let k = 0; k < 7; k++) {
        const g2 = g.createRadialGradient(cx + (k - 3) * s * 0.5, cy + r() * 14, 2, cx + (k - 3) * s * 0.5, cy, s * 0.7);
        g2.addColorStop(0, 'rgba(255,255,255,0.92)');
        g2.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = g2; g.beginPath(); g.arc(cx + (k - 3) * s * 0.5, cy, s * 0.7, 0, 7); g.fill();
      }
    }
  });
}

// ---------- facades ----------
function facadeTexture(base, cols, floors, shop, seed) {
  const cw = 64, ch = 72;
  return canvasTex(cols * cw, (floors + 1) * ch, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // ground-floor shopfront (bottom of canvas)
    const sy = floors * ch;
    g.fillStyle = '#262a33'; g.fillRect(0, sy, w, ch * 0.34);       // sign band
    g.fillStyle = shop.neon; g.fillRect(w * 0.18, sy + ch * 0.12, w * 0.5, ch * 0.1); // glowing bar, no text
    g.fillStyle = shop.glass; g.fillRect(0, sy + ch * 0.34, w, ch * 0.66);
    g.fillStyle = '#3b3f4a';
    for (let x = 0; x <= w; x += w / Math.max(2, Math.round(cols / 2))) g.fillRect(x - 3, sy + ch * 0.34, 6, ch * 0.66);
    // upper floors: white-framed windows, white ledge between floors
    for (let f = 0; f < floors; f++) {
      const y = f * ch;
      g.fillStyle = '#f1efe9'; g.fillRect(0, y + ch - 7, w, 7);
      for (let c = 0; c < cols; c++) {
        const x = c * cw + 14, wy = y + 14, ww = cw - 28, wh = ch - 34;
        g.fillStyle = '#f4f2ec'; g.fillRect(x - 4, wy - 4, ww + 8, wh + 8);
        g.fillStyle = r() < 0.28 ? '#b99b62' : '#1c2434';
        g.fillRect(x, wy, ww, wh);
        g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x, wy, ww, wh * 0.35);
      }
    }
  });
}

function building(x0, x1, zFront, depth, height, base, shop, seed, floorH = 3.2) {
  const w = x1 - x0, floors = Math.max(2, Math.round(height / floorH) - 1);
  const cols = Math.max(2, Math.round(w / 2.2));
  const tex = facadeTexture(base, cols, floors, shop, seed);
  const bodyH = (floors + 1) * floorH;
  const plain = mat(base);
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, depth), [plain, plain, mat('#8a8f98'), plain, front, plain]);
  m.position.set((x0 + x1) / 2, bodyH / 2, zFront - depth / 2);
  m.castShadow = m.receiveShadow = true;
  const cornice = box(w + 0.3, 0.3, 0.5, mat('#efece4'), m.position.x, bodyH + 0.15, zFront + 0.05);
  const g = new THREE.Group(); g.add(m, cornice);
  return g;
}

// ---------- props ----------
function tree(x, z) {
  const g = new THREE.Group();
  g.add(box(1.5, 0.45, 1.5, mat('#d9dcdf'), 0, 0.225, 0));
  g.add(box(0.22, 1.6, 0.22, mat('#6a4a33'), 0, 1.2, 0));
  const geo = new THREE.IcosahedronGeometry(1.25, 1);
  const p = geo.attributes.position;
  const j = (a, b, c) => 0.9 + 0.2 * Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + x)) % 1;
  for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i); p.setXYZ(i, X * j(X, Y, Z), Y * j(X, Y, Z), Z * j(X, Y, Z)); }
  geo.computeVertexNormals();
  const crown = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#6a9a4c', flatShading: true, roughness: 0.9 }));
  crown.position.y = 3; crown.castShadow = crown.receiveShadow = true;
  g.add(crown);
  g.position.set(x, 0, z);
  return g;
}

function lamp(x, z) {
  const g = new THREE.Group();
  g.add(box(0.1, 3.6, 0.1, mat('#22252b'), 0, 1.8, 0));
  g.add(box(0.5, 0.35, 0.5, new THREE.MeshStandardMaterial({ color: '#f4f4f0', emissive: '#fff6d8', emissiveIntensity: 0.35 }), 0, 3.75, 0));
  g.position.set(x, 0, z);
  return g;
}

function bench(x, z) {
  const g = new THREE.Group();
  g.add(box(1.6, 0.08, 0.45, mat('#b5703c'), 0, 0.45, 0));
  g.add(box(1.6, 0.4, 0.06, mat('#b5703c'), 0, 0.75, -0.22));
  g.add(box(0.08, 0.45, 0.4, mat('#2b2e35'), -0.7, 0.22, 0));
  g.add(box(0.08, 0.45, 0.4, mat('#2b2e35'), 0.7, 0.22, 0));
  g.position.set(x, 0, z);
  return g;
}

function car(x, z, color, rotY = 0) {
  const g = new THREE.Group();
  g.add(box(4.0, 0.75, 1.8, mat(color, { roughness: 0.4 }), 0, 0.65, 0));
  g.add(box(2.1, 0.65, 1.6, mat(color, { roughness: 0.4 }), -0.1, 1.3, 0));
  g.add(box(1.9, 0.45, 1.64, mat('#2a3447', { roughness: 0.2 }), -0.1, 1.32, 0));
  for (const wx of [-1.2, 1.2]) for (const wz of [-0.85, 0.85]) g.add(box(0.6, 0.6, 0.2, mat('#17181c'), wx, 0.3, wz));
  g.position.set(x, 0, z); g.rotation.y = rotY;
  return g;
}

// ---------- characters ----------
function faceTexture(skin, opts) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    g.fillStyle = opts.hair; g.fillRect(0, 0, w, h * 0.2);
    g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(w * 0.44, h * 0.5, w * 0.12, h * 0.1);   // nose
    g.fillStyle = '#fff'; g.fillRect(w * 0.2, h * 0.38, w * 0.16, h * 0.11); g.fillRect(w * 0.64, h * 0.38, w * 0.16, h * 0.11);
    g.fillStyle = '#1b1b22'; g.fillRect(w * 0.26, h * 0.385, w * 0.08, h * 0.1); g.fillRect(w * 0.66, h * 0.385, w * 0.08, h * 0.1);
    g.fillStyle = opts.hair; g.fillRect(w * 0.18, h * 0.29, w * 0.2, h * 0.04); g.fillRect(w * 0.62, h * 0.29, w * 0.2, h * 0.04);
    g.fillStyle = '#7a3f3a'; g.fillRect(w * 0.38, h * 0.72, w * 0.24, h * 0.035);
  });
}

function makeCharacter(o) {
  const S = 0.72;                       // overall scale -> ~1.85 m tall
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);   // bobs up and down
  const skin = mat(o.skin), shirt = mat(o.shirt), pants = mat(o.pants), shoe = mat(o.shoe), hairM = mat(o.hair);
  const legL = 1.0, torsoH = 0.95, torsoW = 0.85, torsoD = 0.42, armL = 0.9, armW = 0.2, legW = 0.34;

  const mkLimb = (w, len, d, m, x, y) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    pivot.add(box(w, len, d, m, 0, -len / 2, 0));
    return pivot;
  };
  const legs = [-1, 1].map(s => {
    const p = mkLimb(legW, legL, legW, pants, s * 0.19, legL);
    p.add(box(legW + 0.02, 0.14, legW + 0.2, shoe, 0, -legL + 0.07, 0.07));
    body.add(p); return p;
  });
  body.add(box(torsoW, torsoH, torsoD, shirt, 0, legL + torsoH / 2, 0));
  if (o.drawstrings) {
    const w = mat('#f2f2f2');
    body.add(box(0.03, 0.3, 0.02, w, -0.1, legL + torsoH - 0.35, torsoD / 2 + 0.01));
    body.add(box(0.03, 0.3, 0.02, w, 0.1, legL + torsoH - 0.35, torsoD / 2 + 0.01));
  }
  const arms = [-1, 1].map(s => {
    const p = mkLimb(armW, armL, armW, shirt, s * (torsoW / 2 + armW / 2 + 0.01), legL + torsoH - 0.06);
    p.add(box(armW + 0.01, 0.2, armW + 0.01, skin, 0, -armL + 0.1, 0));   // hand
    body.add(p); return p;
  });
  const head = new THREE.Group(); head.position.set(0, legL + torsoH + 0.1, 0); body.add(head);
  head.add(box(0.12, 0.14, 0.12, skin, 0, -0.04, 0));                       // neck
  const H = 0.6, hy = H / 2 + 0.03;
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture(o.skin, o), roughness: 0.9 });
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(H, H, H), [skin, skin, skin, skin, faceMat, skin]);
  headMesh.position.y = hy; headMesh.castShadow = headMesh.receiveShadow = true; head.add(headMesh);
  head.add(box(H + 0.04, 0.17, H + 0.04, hairM, 0, hy + H / 2 - 0.06, -0.0));        // hair cap
  head.add(box(H + 0.04, H * 0.62, 0.12, hairM, 0, hy + H * 0.16, -H / 2 - 0.0));    // back of hair

  root.scale.setScalar(S);
  const ctrl = { root, body, legs, arms, head, scale: S };
  return ctrl;
}

function poseWalk(c, phase, amp) {
  const sw = Math.sin(phase) * amp;
  c.legs[0].rotation.x = sw * 0.65;  c.legs[1].rotation.x = -sw * 0.65;
  c.arms[0].rotation.x = -sw * 0.55; c.arms[1].rotation.x = sw * 0.55;
  c.body.position.y = Math.abs(Math.cos(phase)) * 0.05 * amp;
}

// ---------- scene ----------
export function createScene(canvas, width, height) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const sky = skyTexture();
  sky.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = sky;
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(sky).texture;
  scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog('#b9d3ea', 40, 110);

  const hemi = new THREE.HemisphereLight('#bcd6f2', '#8d8478', 0.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 80;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const SUN_DIR = new THREE.Vector3(-0.45, 0.8, 0.55).normalize();

  // ground: wet dark road, beige paved sidewalk, curb
  const road = new THREE.Mesh(new THREE.PlaneGeometry(140, 11), new THREE.MeshStandardMaterial({
    map: canvasTex(512, 128, (g, w, h) => {
      g.fillStyle = '#3a4150'; g.fillRect(0, 0, w, h);
      const r = rng(3); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},0.04)`; g.fillRect(r() * w, r() * h, 3, 3); }
      g.fillStyle = '#d9d9d2'; for (let x = 0; x < w; x += 128) g.fillRect(x + 20, h / 2 - 3, 60, 6);
    }, { repeat: [14, 1] }),
    roughness: 0.28, metalness: 0.0, envMapIntensity: 1.2,
  }));
  road.rotation.x = -Math.PI / 2; road.position.set(20, 0, 8); road.receiveShadow = true; scene.add(road);

  const walkTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d8cdb6'; g.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '90,70,40'},${0.05 + r() * 0.06})`; g.fillRect(i * 64, j * 64, 64, 64); }
    g.strokeStyle = 'rgba(110,95,70,0.55)'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
  }, { repeat: [35, 1.4] });
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(140, 0.18, 5.6), new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.55 }));
  sidewalk.position.set(20, 0.09, -0.2); sidewalk.receiveShadow = true; scene.add(sidewalk);
  const curb = box(140, 0.18, 0.18, mat('#bdb6a6'), 20, 0.09, 2.7); scene.add(curb);
  const farWalk = box(140, 0.18, 4, mat('#cfc6b2', { roughness: 0.6 }), 20, 0.09, 15.7); scene.add(farWalk);

  // buildings, near side (front faces at z = -3) and far side (z = 17.7 facing -z)
  const near = [
    [-30, -14, 15, '#e6dccb', { glass: '#7b6a4c', neon: '#ff9a55' }],
    [-14, -2, 12, '#d9a58f', { glass: '#8b6fa0', neon: '#ff5fc4' }],
    [-2, 9, 16, '#ebe8e2', { glass: '#6f7a86', neon: '#ffb25a' }],
    [9, 21, 13, '#c9917e', { glass: '#7f6a4f', neon: '#ffd37a' }],
    [21, 34, 17, '#dcd6c8', { glass: '#8b6fa0', neon: '#ff5fc4' }],
    [34, 55, 12, '#e3b7a3', { glass: '#6f7a86', neon: '#ff9a55' }],
  ];
  near.forEach((b, i) => scene.add(building(b[0], b[1], -3, 10, b[2], b[3], b[4], 100 + i)));
  const far = [
    [-30, -8, 11, '#c8cfd6', { glass: '#6f7a86', neon: '#9ad0ff' }],
    [-8, 12, 14, '#d4c4ae', { glass: '#7b6a4c', neon: '#ffb25a' }],
    [12, 30, 10, '#bfa699', { glass: '#8b6fa0', neon: '#ff5fc4' }],
    [30, 55, 15, '#d9dde0', { glass: '#6f7a86', neon: '#9ad0ff' }],
  ];
  far.forEach((b, i) => { const g = building(b[0], b[1], 0, 10, b[2], b[3], b[4], 200 + i); g.rotation.y = Math.PI; g.position.set(b[0] + b[1], 0, 17.7); scene.add(g); });

  // props
  [-6, 14, 27].forEach(x => scene.add(tree(x, -1.7)));
  [3, 14, 25].forEach(x => scene.add(lamp(x, -2.4)));
  scene.add(bench(-3.4, -2.3)); scene.add(bench(16.5, -2.3));
  scene.add(car(-3, 9.2, '#d84a3a', 0)); scene.add(car(16, 6.2, '#4c8fd1', Math.PI)); scene.add(car(27, 9.4, '#e6b84a', 0));
  [-8, 4, 22].forEach(x => scene.add(tree(x, 14.4)));

  // characters
  const A = makeCharacter({ skin: '#e6b99a', hair: '#23252d', shirt: '#7fa88a', pants: '#1f6fc4', shoe: '#3a2a22', drawstrings: true });
  const B = makeCharacter({ skin: '#c98f6b', hair: '#4a2f22', shirt: '#c6633f', pants: '#4b5262', shoe: '#2a2a2e' });
  scene.add(A.root, B.root);

  // ---------- timeline ----------
  const V = 1.6, T_STOP0 = 5.0, T_STOP1 = 6.0;           // walk speed, deceleration window
  const A_X0 = 0.4, A_Z = -0.6;
  const B_POS = new THREE.Vector3(10.6, 0, 0.9);
  const aDist = t => t <= T_STOP0 ? V * t : V * T_STOP0 + V * ((Math.min(t, T_STOP1) - T_STOP0) - (Math.pow(Math.min(t, T_STOP1) - T_STOP0, 2)) / (2 * (T_STOP1 - T_STOP0)));
  const aSpeed = t => t <= T_STOP0 ? V : t >= T_STOP1 ? 0 : V * (1 - (t - T_STOP0) / (T_STOP1 - T_STOP0));
  const aPos = t => new THREE.Vector3(A_X0 + aDist(t), 0.18, A_Z);
  const aEnd = aPos(DURATION);
  const toB = Math.atan2(B_POS.x - aEnd.x, B_POS.z - aEnd.z);   // heading that faces B
  const toA = Math.atan2(aEnd.x - B_POS.x, aEnd.z - B_POS.z);

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
  const tmp = new THREE.Vector3();

  function setTime(t) {
    // --- A: walk, stop, turn to face B
    const p = aPos(t); A.root.position.copy(p);
    const turn = smooth(6.5, 8.0, t);
    A.root.rotation.y = lerp(Math.PI / 2, toB, turn);
    const phase = aDist(t) / 0.62 * Math.PI;
    const amp = clamp(aSpeed(t) / V) * 0.85;
    poseWalk(A, phase, amp);
    A.head.rotation.y = 0; A.head.rotation.x = Math.sin(t * 1.3) * 0.02;
    A.arms[1].rotation.z = -0.04 * (1 - amp); A.arms[0].rotation.z = 0.04 * (1 - amp);
    // small idle sway once stopped
    A.body.position.y += (1 - amp) * Math.sin(t * 2.2) * 0.012;

    // --- B: idle, glances at A when A arrives, then turns body toward A
    B.root.position.copy(B_POS).setY(0.18);
    const look = smooth(6.3, 7.1, t), face = smooth(7.2, 8.6, t);
    B.root.rotation.y = lerp(0, toA, face);                         // B starts facing the road
    B.head.rotation.y = Math.sign(angDiff(0, toA)) * 0.9 * look * (1 - face);
    B.body.position.y = Math.sin(t * 2.0) * 0.012;
    B.arms[0].rotation.x = 0.12 + Math.sin(t * 2) * 0.02; B.arms[1].rotation.x = -0.1;
    B.legs[0].rotation.x = 0; B.legs[1].rotation.x = 0;

    // --- camera: trails A, then slowly arcs to a side view that holds both characters
    const follow = tmp.set(p.x - 5.2, 2.0, p.z + 3.6).clone();
    const followLook = new THREE.Vector3(p.x + 4.5, 2.6, p.z - 0.6);
    const mid = new THREE.Vector3((aEnd.x + B_POS.x) / 2, 1.2, (aEnd.z + B_POS.z) / 2);
    const final = new THREE.Vector3(mid.x + 0.9, 1.6, mid.z + 8.2);
    const s = smooth(3.5, 10, t);
    camera.position.lerpVectors(follow, final, s);
    const look3 = new THREE.Vector3().lerpVectors(followLook, mid, smooth(2.5, 6.5, t));
    camera.lookAt(look3);
    // slow handheld-free drift
    camera.position.y += Math.sin(t * 0.7) * 0.02;

    sun.position.copy(look3).addScaledVector(SUN_DIR, 30);
    sun.target.position.copy(look3);
  }

  function render(t) { setTime(t); renderer.render(scene, camera); }
  return { render, renderer, setTime, camera, scene };
}
