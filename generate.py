"""
Cute kitten wave test: builds the model, animation, lights and render settings
with Blender's Python API (Blender 4.2 LTS, Cycles CPU, headless).

Usage (everything after "--" goes to this script):
  blender -b -P generate.py                       # build scene, save kitten.blend
  blender -b -P generate.py -- --still 60         # also render one test frame
  blender -b -P generate.py -- --render           # also render all 120 frames
  blender -b -P generate.py -- --render --encode  # ... and make the MP4 with FFmpeg
"""
import math
import os
import subprocess
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES_DIR = os.path.join(HERE, "frames")
BLEND_PATH = os.path.join(HERE, "kitten.blend")
VIDEO_PATH = os.path.join(HERE, "kitten_test.mp4")

RES_X, RES_Y, FPS, SECONDS = 640, 360, 12, 10
N_FRAMES = FPS * SECONDS
SAMPLES = 48


# ----------------------------------------------------------------- helpers
def srgb(hexstr):
    """'#RRGGBB' -> linear RGBA (so colours here match what you see)."""
    h = hexstr.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def set_input(node, names, value):
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return


def make_mat(name, color, rough=0.55, sss=0.0, sheen=0.0, coat=0.0,
             emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(color)
    b.inputs["Roughness"].default_value = rough
    set_input(b, ["Subsurface Weight"], sss)
    set_input(b, ["Subsurface Radius"], (0.6, 0.25, 0.15))
    set_input(b, ["Sheen Weight"], sheen)
    set_input(b, ["Sheen Roughness"], 0.5)
    set_input(b, ["Coat Weight"], coat)
    set_input(b, ["Coat Roughness"], 0.05)
    if emit:
        set_input(b, ["Emission Color"], srgb(emit))
        set_input(b, ["Emission Strength"], emit_strength)
    return m


def smooth(obj):
    me = obj.data
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()


def sphere(name, loc, scale, mat, parent=None, rot=(0, 0, 0), seg=48, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1.0)
    o = bpy.context.active_object
    o.name = name
    o.location = loc
    o.scale = scale
    o.rotation_euler = [math.radians(a) for a in rot]
    o.data.materials.append(mat)
    smooth(o)
    if parent:
        o.parent = parent
    return o


def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    if parent:
        e.parent = parent
    return e


def tube(name, pts, radius, mat, parent=None):
    """Thin rounded tube following a list of points (whiskers, mouth)."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 3
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (*co, 1.0)
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat)
    if parent:
        o.parent = parent
    return o


# ------------------------------------------------------------------- scene
def build_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.render.resolution_x, sc.render.resolution_y = RES_X, RES_Y
    sc.render.resolution_percentage = 100
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, N_FRAMES

    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = SAMPLES
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 5
    cy.diffuse_bounces = 3
    cy.glossy_bounces = 2
    cy.transmission_bounces = 0
    cy.volume_bounces = 0
    cy.sample_clamp_indirect = 2.0
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.filter_width = 1.3
    sc.render.threads_mode = "AUTO"

    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"

    # --- palette
    M = {
        "fur": make_mat("fur", "#FFAA6B", 0.62, sss=0.15, sheen=0.6),
        "stripe": make_mat("stripe", "#EE8A4C", 0.62, sss=0.1, sheen=0.4),
        "cream": make_mat("cream", "#FFE6C9", 0.65, sss=0.15, sheen=0.7),
        "pink": make_mat("pink", "#FF93AE", 0.5, sss=0.2),
        "nose": make_mat("nose", "#FF7E9D", 0.3, coat=0.5),
        "blush": make_mat("blush", "#FF8FA3", 0.8, emit="#FF8FA3", emit_strength=0.25),
        "eye": make_mat("eye", "#150E22", 0.1, coat=1.0),
        "iris": make_mat("iris", "#1FA6A0", 0.2, coat=1.0, emit="#1FA6A0", emit_strength=0.35),
        "iris2": make_mat("iris2", "#7FF0D2", 0.2, coat=1.0, emit="#7FF0D2", emit_strength=0.7),
        "pupil": make_mat("pupil", "#0A0612", 0.15, coat=1.0),
        "shine": make_mat("shine", "#FFFFFF", 0.1, emit="#FFFFFF", emit_strength=12.0),
        "mouth": make_mat("mouth", "#8C4A5A", 0.5),
        "whisker": make_mat("whisker", "#FFFFFF", 0.4, emit="#FFFFFF", emit_strength=0.3),
        "rug": make_mat("rug", "#9ADFC0", 0.9, sheen=0.5),
        "rug2": make_mat("rug2", "#FFFFFF", 0.9),
    }
    build_world(sc)
    build_kitten(M)
    build_rug(M)
    build_camera_and_lights(sc)
    return sc


def build_world(sc):
    w = bpy.data.worlds.new("World")
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    lp = nt.nodes.new("ShaderNodeLightPath")
    mix = nt.nodes.new("ShaderNodeMixRGB")
    # pastel vertical gradient seen by the camera (bottom -> top)
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = srgb("#FFEAF1")
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = srgb("#CFCFFF")
    mid = ramp.color_ramp.elements.new(0.5)
    mid.color = srgb("#F7E1FA")
    # soft white-pink light for everything that is not a camera ray
    mix.inputs["Color1"].default_value = tuple(0.65 * c for c in srgb("#FFEFF5"))[:3] + (1.0,)
    nt.links.new(coord.outputs["Window"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], mix.inputs["Color2"])
    nt.links.new(mix.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])


def build_rug(M):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=3.6, depth=0.16,
                                        location=(0, 0.2, -0.06))
    o = bpy.context.active_object
    o.name = "rug"
    o.data.materials.append(M["rug"])
    bev = o.modifiers.new("bevel", "BEVEL")
    bev.width = 0.07
    bev.segments = 4
    sub = o.modifiers.new("sub", "SUBSURF")
    sub.levels = 2
    smooth(o)
    # lighter inner ring for a simple cushion look
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=2.55, depth=0.2,
                                        location=(0, 0.2, -0.045))
    r = bpy.context.active_object
    r.name = "rug_inner"
    r.data.materials.append(M["rug2"])
    b2 = r.modifiers.new("bevel", "BEVEL")
    b2.width = 0.05
    b2.segments = 3
    s2 = r.modifiers.new("sub", "SUBSURF")
    s2.levels = 2
    smooth(r)
    mat = M["rug2"]
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = srgb("#BFEBD5")


# ------------------------------------------------------------------ kitten
HEAD_C = Vector((0.0, -0.05, 2.35))
HEAD_R = Vector((1.2, 1.0, 0.9))
NECK = Vector((0.0, -0.1, 1.75))
ARM_LEN = 1.2


def head_surface_y(x, z):
    v = 1 - (x / HEAD_R.x) ** 2 - ((z - HEAD_C.z) / HEAD_R.z) ** 2
    return HEAD_C.y - HEAD_R.y * math.sqrt(max(v, 0.0))


MUZZLE = [(-0.23, -0.9, 2.0), (0.23, -0.9, 2.0)]
MUZZLE_S = (0.31, 0.21, 0.2)


def muzzle_y(x, z):
    best = None
    for cx, cy, cz in MUZZLE:
        v = 1 - ((x - cx) / MUZZLE_S[0]) ** 2 - ((z - cz) / MUZZLE_S[2]) ** 2
        if v > 0:
            y = cy - MUZZLE_S[1] * math.sqrt(v)
            best = y if best is None else min(best, y)
    return best


def face_y(x, z):
    m = muzzle_y(x, z)
    h = head_surface_y(x, z)
    return h if m is None else min(m, h)


def L(p):
    """world position -> head-pivot local position"""
    return (p[0] - NECK.x, p[1] - NECK.y, p[2] - NECK.z)


RIG = {}


def build_kitten(M):
    root = empty("kitten_root")
    RIG["root"] = root

    # ---- torso
    body = sphere("body", (0, 0.1, 0.92), (0.95, 0.85, 1.0), M["fur"], root)
    RIG["body"] = body
    sphere("belly", (0, -0.52, 0.95), (0.62, 0.4, 0.78), M["cream"], root)
    for s in (-1, 1):
        sphere(f"thigh{s}", (s * 0.82, 0.0, 0.55), (0.5, 0.75, 0.5), M["fur"], root)
        sphere(f"hindfoot{s}", (s * 1.2, -0.5, 0.17), (0.3, 0.44, 0.18), M["cream"], root)
        for k in (-1, 1):  # toe lines
            sphere(f"hindtoe{s}{k}", (s * 1.2 + k * 0.07, -0.91, 0.2), (0.012, 0.01, 0.07),
                   M["stripe"], root, seg=12, rings=8)
    # back stripes (visible on the sides)
    for i, z in enumerate((0.95, 1.25)):
        for s in (-1, 1):
            sphere(f"bstripe{i}{s}", (s * 0.93, 0.0, z), (0.12, 0.3, 0.07), M["stripe"], root,
                   rot=(0, 0, s * 20), seg=16, rings=10)

    # ---- head
    head = empty("head_pivot", tuple(NECK), root)
    RIG["head"] = head
    sphere("head", L(HEAD_C), tuple(HEAD_R), M["fur"], head, seg=64, rings=32)
    # cheek fluff
    for s in (-1, 1):
        sphere(f"cheek{s}", L((s * 0.95, -0.35, 2.1)), (0.3, 0.35, 0.26), M["fur"], head,
               rot=(0, 0, s * -25))
    # muzzle
    for (cx, cy, cz) in MUZZLE:
        sphere("muzzle", L((cx, cy, cz)), MUZZLE_S, M["cream"], head)
    ny = face_y(0, 2.14)
    sphere("nose", L((0, ny + 0.02, 2.14)), (0.12, 0.075, 0.085), M["nose"], head)
    # mouth (omega shape that follows the muzzle surface)
    pts = []
    for sgn in (-1, 1):
        arc = []
        for i in range(0, 13):
            t = i / 12
            x = sgn * 0.2 * t
            z = 2.07 - 0.07 * math.sin(math.pi * t * 0.95) + 0.03 * t
            arc.append((x, face_y(x, z) - 0.012, z))
        pts.append(arc)
    center = [(0, face_y(0, z) - 0.012, z) for z in (2.08, 2.06)]
    # make it one continuous line: left tip -> centre -> right tip
    line = list(reversed(pts[0])) + [center[0]] + pts[1]
    tube("mouth", [L(p) for p in line], 0.014, M["mouth"], head)
    # blush
    for s in (-1, 1):
        x, z = s * 0.82, 2.06
        sphere(f"blush{s}", L((x, head_surface_y(x, z) + 0.035, z)), (0.2, 0.04, 0.115),
               M["blush"], head, rot=(0, 0, s * 38))
    # forehead stripes
    for i, x in enumerate((-0.22, 0.0, 0.22)):
        h = 0.2 if x == 0 else 0.15
        z = 3.0
        sphere(f"fstripe{i}", L((x, head_surface_y(x, z) + 0.01, z)), (0.045, 0.03, h),
               M["stripe"], head, rot=(-25, 0, -x * 40), seg=16, rings=10)
    # whiskers
    for s in (-1, 1):
        for i, ang in enumerate((14, 0, -14)):
            pts = []
            a = math.radians(ang)
            for k in range(8):
                t = k / 7
                x = s * (0.55 + 0.5 * t)
                z = 2.0 + math.sin(a) * 0.5 * t - 0.1 * t * t
                y = face_y(min(abs(x), 0.4) * s, 2.0) + 0.02 + 0.28 * t - 0.05
                pts.append((x, y, z))
            tube(f"whisker{s}{i}", [L(p) for p in pts], 0.008, M["whisker"], head)

    # eyes: base, iris (2 layers), pupil, two fixed highlights
    RIG["eye"], RIG["gaze"], RIG["pupil"], RIG["lid"], RIG["shine"] = [], [], [], [], []
    EX, EY, EZ = 0.35, 0.14, 0.43
    for s in (-1, 1):
        ex, ez = s * 0.56, 2.32
        ey = head_surface_y(ex, ez) + 0.02
        eye = empty(f"eye{s}", L((ex, ey, ez)), head)
        eye.rotation_euler = (0, 0, math.radians(s * 20))
        sphere(f"eyebase{s}", (0, 0, 0), (EX, EY, EZ), M["eye"], eye)
        gaze = empty(f"gaze{s}", (0, 0, 0), eye)
        sphere(f"iris{s}", (0, -0.075, 0), (EX * 0.9, 0.1, EZ * 0.9), M["iris"], gaze)
        sphere(f"iris2{s}", (0, -0.10, -0.06), (EX * 0.68, 0.08, EZ * 0.62), M["iris2"], gaze)
        pupil = sphere(f"pupil{s}", (0, -0.125, 0.0), (EX * 0.42, 0.07, EZ * 0.52),
                       M["pupil"], gaze)
        shine_a = sphere(f"shineA{s}", (-0.1, -0.17, 0.16), (0.095, 0.03, 0.11), M["shine"], eye,
                         seg=24, rings=12)
        shine_b = sphere(f"shineB{s}", (0.1, -0.16, -0.17), (0.045, 0.03, 0.05), M["shine"], eye,
                         seg=16, rings=8)
        RIG["shine"].append(((shine_a, (0.095, 0.03, 0.11)), (shine_b, (0.045, 0.03, 0.05))))
        # eyelid: fur-coloured shell that slides down from the top of the eye, plus a lash line
        lidp = empty(f"lidpivot{s}", (0, 0, EZ * 0.98), eye)
        lid = sphere(f"lid{s}", (0, 0, -EZ * 0.98), (EX * 1.06, 0.2, EZ * 1.08), M["fur"], lidp)
        lash = sphere(f"lash{s}", (0, -0.205, -EZ * 1.33), (0.3, 0.02, 0.02), M["eye"], lidp,
                      seg=16, rings=8)
        RIG["lid"].append((lidp, lid, lash))
        RIG["eye"].append(eye)
        RIG["gaze"].append(gaze)
        RIG["pupil"].append(pupil)

    # ears (cone + inner pink), each on its own pivot so they can twitch
    RIG["ear"] = []
    for s in (-1, 1):
        piv = empty(f"ear_pivot{s}", L((s * 0.8, -0.02, 2.93)), head)
        piv.rotation_euler = (0, math.radians(s * 24), 0)
        for nm, mat, r, d, yy, zz, sy in (("ear", M["fur"], 0.45, 0.95, 0.0, 0.3, 0.5),
                                          ("ear_in", M["pink"], 0.34, 0.78, -0.1, 0.25, 0.35)):
            bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=r, radius2=0.0, depth=d)
            e = bpy.context.active_object
            e.name = f"{nm}{s}"
            e.parent = piv
            e.location = (0, yy, zz)
            e.scale = (1, sy, 1)
            e.data.materials.append(mat)
            sub = e.modifiers.new("sub", "SUBSURF")
            sub.levels = 3
            smooth(e)
        RIG["ear"].append(piv)

    # ---- arms (pivot at shoulder, capsule + paw)
    RIG["arm"], RIG["paw"] = {}, {}
    for s in (-1, 1):
        sh = empty(f"shoulder{s}", (s * 0.8, -0.52, 1.42), root)
        sphere(f"arm{s}", (0, 0, -ARM_LEN * 0.5), (0.22, 0.22, ARM_LEN * 0.56), M["fur"], sh)
        paw = empty(f"paw_pivot{s}", (0, 0, -ARM_LEN * 0.86), sh)
        sphere(f"paw{s}", (0, -0.03, -0.12), (0.28, 0.27, 0.27), M["cream"], paw)
        for k in (-1, 1):
            sphere(f"toe{s}{k}", (k * 0.075, -0.285, -0.17), (0.012, 0.01, 0.08), M["stripe"],
                   paw, seg=12, rings=8)
        RIG["arm"][s] = sh
        RIG["paw"][s] = paw

    # ---- tail: chain of segments, each parented to the previous one
    RIG["tail"] = []
    prev = root
    n = 9
    for i in range(n):
        seg = empty(f"tail{i}", (0.75, 0.25, 0.3) if i == 0 else (0.2, 0, 0), prev)
        if i == 0:
                    r = 0.2 - 0.07 * i / (n - 1)
        mat = M["stripe"] if i in (2, 4, 6) or i == n - 1 else M["fur"]
        sphere(f"tailseg{i}", (0, 0, 0), (r * 1.15, r, r), mat, seg, seg=32, rings=16)
        RIG["tail"].append(seg)
        prev = seg


# --------------------------------------------------------- camera & lights
def build_camera_and_lights(sc):
    cam_d = bpy.data.cameras.new("cam")
    cam_d.lens = 50
    cam = bpy.data.objects.new("camera", cam_d)
    sc.collection.objects.link(cam)
    cam.location = (0, -12.5, 4.6)
    tgt = empty("cam_target", (0, 0, 1.7))
    c = cam.constraints.new("TRACK_TO")
    c.target = tgt
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    sc.camera = cam

    def area(name, loc, energy, size, color, target=(0, 0, 1.9)):
        d = bpy.data.lights.new(name, "AREA")
        d.energy = energy
        d.size = size
        d.color = color[:3]
        o = bpy.data.objects.new(name, d)
        sc.collection.objects.link(o)
        o.location = loc
        t = o.constraints.new("TRACK_TO")
        t.target = tgt
        t.track_axis = "TRACK_NEGATIVE_Z"
        t.up_axis = "UP_Y"
        return o

    area("key", (-5.5, -7.5, 8.0), 850, 6.0, (1.0, 0.95, 0.9))
    area("fill", (6.0, -7.0, 3.5), 260, 6.0, (0.9, 0.93, 1.0))
    area("rim", (1.5, 6.5, 6.0), 420, 5.0, (1.0, 0.9, 0.95))


# --------------------------------------------------------------- animation
def clamp01(x):
    return max(0.0, min(1.0, x))


def smoothstep(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def out_back(x, c1=1.1):
    x = clamp01(x)
    c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def lerp(a, b, t):
    return a + (b - a) * t


def blink(t, t0):
    """eyelid closed amount (0 open .. 1 shut) for a ~0.33 s blink starting at t0 (seconds)."""
    keys = [(0, 0.0), (1, 0.85), (2, 1.0), (3, 0.4), (4, 0.0)]
    u = (t - t0) * FPS
    if u <= 0 or u >= 4:
        return 0.0
    for (a, va), (b, vb) in zip(keys, keys[1:]):
        if a <= u <= b:
            return lerp(va, vb, u - a)
    return 0.0


WAVE_T0, WAVE_T1, WAVE_HZ = 5.0, 7.5, 2.0
WAVE_BASE, WAVE_AMP = 118.0, 15.0


def wave_env(t):
    return smoothstep((t - WAVE_T0) / 0.3) * (1 - smoothstep((t - (WAVE_T1 - 0.3)) / 0.3))


def wave_osc(t, lag=0.0):
    return wave_env(t) * math.sin(2 * math.pi * WAVE_HZ * (t - WAVE_T0 - lag))


def arm_base(t):
    """Raised-arm angle (deg): anticipation dip, overshoot up, hold, ease down, settle."""
    if t < 3.7:
        return 0.0
    if t < 4.2:
        return lerp(0, -7, smoothstep((t - 3.7) / 0.5))
    if t < WAVE_T0:
        return lerp(-7, WAVE_BASE, out_back((t - 4.2) / (WAVE_T0 - 4.2)))
    if t < WAVE_T1:
        return WAVE_BASE
    if t < 8.4:
        return lerp(WAVE_BASE, -4, smoothstep((t - WAVE_T1) / (8.4 - WAVE_T1)))
    return lerp(-4, 0, smoothstep((t - 8.4) / 0.5))


def key(obj, path, f, idx=-1):
    obj.keyframe_insert(data_path=path, frame=f, index=idx)


def animate():
    r = RIG
    for f in range(1, N_FRAMES + 1):
        t = (f - 1) / FPS
        env = wave_env(t)

        # breathing + anticipation dip
        breathe = math.sin(2 * math.pi * 0.42 * t)
        dip = smoothstep((t - 3.6) / 0.5) * (1 - smoothstep((t - 4.3) / 0.4))
        r["body"].scale = (0.95 * (1 - 0.006 * breathe), 0.85, 1.0 * (1 + 0.012 * breathe - 0.035 * dip))
        key(r["body"], "scale", f)
        r["root"].rotation_euler = (math.radians(1.5 * dip), 0, 0)
        key(r["root"], "rotation_euler", f)

        # head: looks aside at first, then turns to the camera with a small overshoot
        turn = smoothstep((t - 0.9) / 1.0)
        yaw = lerp(26, 0, turn) - 3.0 * math.sin(clamp01((t - 1.6) / 0.9) * math.pi) * (t > 1.6)
        pitch = lerp(9, -5, turn) + 2.0 * dip
        roll = -7.0 * env + 2.0 * env * math.sin(2 * math.pi * 1.0 * (t - WAVE_T0))
        r["head"].rotation_euler = (math.radians(pitch), math.radians(roll), math.radians(yaw))
        key(r["head"], "rotation_euler", f)
        r["head"].location = (NECK.x, NECK.y, NECK.z + 0.012 * breathe - 0.05 * dip)
        key(r["head"], "location", f)

        # eyes: gaze leads the head, pupils widen a little when they find the camera
        g = smoothstep((t - 0.6) / 0.35)
        gx, gz = lerp(0.06, 0.0, g), lerp(-0.04, 0.0, g)
        dil = 1.0 + 0.14 * smoothstep((t - 1.1) / 0.4) * (1 - smoothstep((t - 6.0) / 2.0) * 0.5)
        happy = 1.0 - 0.07 * env
        for i in range(2):
            b = max(blink(t, 35 / FPS), blink(t, 105 / FPS))
            r["eye"][i].scale = (1, 1, happy)
            key(r["eye"][i], "scale", f)
            lidp, lid, lash = r["lid"][i]
            lidp.scale = (1, 1, max(b, 0.001))
            key(lidp, "scale", f)
            lid.hide_render = lash.hide_render = b < 0.02
            key(lid, "hide_render", f)
            key(lash, "hide_render", f)
            lash.scale = (0.3 * smoothstep((b - 0.8) / 0.2), 0.02, 0.02)
            key(lash, "scale", f)
            vis = 1 - smoothstep((b - 0.05) / 0.25)  # highlights fade out as the lid closes
            for sh, base in r["shine"][i]:
                sh.scale = tuple(v * vis for v in base)
                key(sh, "scale", f)
            r["gaze"][i].location = (gx, 0, gz)
            key(r["gaze"][i], "location", f)
            r["pupil"][i].scale = (0.147 * dil, 0.07, 0.2236 * dil)
            key(r["pupil"][i], "scale", f)

        # ears: one flick while the head turns, perk up during the wave
        for i, s in enumerate((-1, 1)):
            flick = 0.0
            if s == 1 and 2.25 < t < 2.6:
                flick = math.sin((t - 2.25) / 0.35 * math.pi) ** 2 * 14
            lag = -3.0 * math.sin(clamp01((t - 0.9) / 1.4) * math.pi)
            r["ear"][i].rotation_euler = (
                math.radians(-flick * 0.5), math.radians(s * (24 + 5 * env) + flick * s * 0.6 + lag * s), 0)
            key(r["ear"][i], "rotation_euler", f)

        # arms
        ang = arm_base(t) + WAVE_AMP * wave_osc(t)
        for s in (-1, 1):
            sh = r["arm"][s]
            if s == -1:  # the waving paw (screen left)
                sh.rotation_euler = (math.radians(-8), math.radians(ang), 0)
                r["paw"][s].rotation_euler = (0, math.radians(14 * wave_osc(t, 0.07)), 0)
            else:  # resting paw, tiny breathing sway
                sh.rotation_euler = (math.radians(-8 + 0.8 * breathe), math.radians(-1.5 * dip), 0)
                r["paw"][s].rotation_euler = (0, 0, 0)
            key(sh, "rotation_euler", f)
            key(r["paw"][s], "rotation_euler", f)

        # tail: travelling wave along the chain, livelier while waving
        amp = 5.0 + 3.0 * env
        for i, seg in enumerate(r["tail"]):
            bend = -13.0  # curl upward
            sway = amp * math.sin(2 * math.pi * 0.55 * t - i * 0.55)
            seg.rotation_euler = (0, math.radians(bend if i else -15), math.radians(sway if i else -18 + sway * 0.6))
            key(seg, "rotation_euler", f)

    # smooth, well-behaved curves between the per-frame samples
    for ob in bpy.data.objects:
        ad = ob.animation_data
        if ad and ad.action:
            for fc in ad.action.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = "BEZIER"
                    kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"


# -------------------------------------------------------------------- main
def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    sc = build_scene()
    animate()
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    os.makedirs(FRAMES_DIR, exist_ok=True)

    if "--still" in argv:
        i = argv.index("--still") + 1
        while i < len(argv) and argv[i].isdigit():
            frame = int(argv[i])
            sc.frame_set(frame)
            sc.render.image_settings.file_format = "PNG"
            sc.render.filepath = os.path.join(FRAMES_DIR, f"still_{frame:03d}.png")
            bpy.ops.render.render(write_still=True)
            i += 1

    if "--render" in argv:
        sc.render.image_settings.file_format = "PNG"
        sc.render.filepath = os.path.join(FRAMES_DIR, "f_")
        sc.render.use_overwrite = False  # lets an interrupted render resume
        bpy.ops.render.render(animation=True)

    if "--encode" in argv:
        subprocess.run([
            "ffmpeg", "-y", "-framerate", str(FPS), "-i", os.path.join(FRAMES_DIR, "f_%04d.png"),
            "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", VIDEO_PATH], check=True)


main()
