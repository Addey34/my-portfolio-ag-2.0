"""Construit le robot de Solutions : les quatre modules du cube s'assemblent en robot articulé.

Quatre pivots, un par offre : tête, torse, bras, jambes. Les noms gardent le motif
`MONO / 0N offer pivot` lu par StoryWorld3D.
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_kit as kit  # noqa: E402
import bpy  # noqa: E402

OUTPUT = kit.ROOT / "assets" / "blender" / "solutions_monolith.blend"
kit.reset_scene()
m = kit.standard_materials("MONO")
ti, gr, br, rh, ob = m["titanium"], m["graphite"], m["brass"], m["rhodium"], m["obsidian"]
cobalt, cyan, violet, amber = m["glow"]
FRONT = -1  # le robot regarde vers -Y (vers la caméra du site)

# --- 01 Tête (interface) -------------------------------------------------
head = kit.pivot("MONO / 01 offer pivot", (0, 0, 1.08))
kit.box("MONO / head shell", (0.52, 0.5, 0.46), (0, 0, 0), ti, head, 0.045)
kit.box("MONO / head crest", (0.12, 0.44, 0.1), (0, 0.02, 0.27), gr, head, 0.02)
kit.box("MONO / visor plate", (0.42, 0.04, 0.17), (0, -0.265, 0.02), ob, head, 0.02)
kit.box("MONO / visor glow", (0.34, 0.03, 0.05), (0, -0.29, 0.02), cyan, head, 0.01)
kit.box("MONO / jaw", (0.3, 0.1, 0.09), (0, -0.23, -0.17), rh, head, 0.02)
for sx in (-1, 1):
    kit.cylinder("MONO / ear", 0.08, 0.1, (sx * 0.3, 0, 0), br, head, rotation=(0, math.pi / 2, 0), bevel=0.01, vertices=24)
    kit.cylinder("MONO / antenna", 0.012, 0.3, (sx * 0.34, 0.1, 0.25), rh, head, rotation=(0, 0, 0), vertices=10)
    kit.sphere("MONO / antenna tip", 0.03, (sx * 0.34, 0.1, 0.41), amber, head, 12, 6)
    kit.hex_bolt("MONO / head bolt", (sx * 0.2, -0.255, 0.18), head, rh)

# --- 02 Torse (services) -------------------------------------------------
torso = kit.pivot("MONO / 02 offer pivot", (0, 0, 0.34))
kit.box("MONO / chest", (0.92, 0.56, 0.72), (0, 0, 0), ti, torso, 0.06)
kit.box("MONO / chest plate", (0.7, 0.05, 0.5), (0, -0.3, 0.04), gr, torso, 0.03)
kit.cylinder("MONO / core bezel", 0.17, 0.06, (0, -0.33, 0.1), br, torso, bevel=0.012, vertices=40)
kit.cylinder("MONO / core glow", 0.11, 0.05, (0, -0.35, 0.1), violet, torso, vertices=32)
kit.torus("MONO / core ring", 0.2, 0.012, (0, -0.34, 0.1), (math.pi / 2, 0, 0), rh, torso, 48, 8)
for k in range(4):
    kit.box(f"MONO / vent {k}", (0.5, 0.03, 0.025), (0, -0.305, -0.14 - k * 0.055), ob, torso, 0.006)
kit.box("MONO / waist band", (0.82, 0.5, 0.08), (0, 0, -0.38), br, torso, 0.02)
kit.box("MONO / back pack", (0.6, 0.18, 0.5), (0, 0.37, 0.06), gr, torso, 0.04)
for sx in (-1, 1):
    kit.bar("MONO / rune strip", (sx * 0.42, 0.28), (sx * 0.42, -0.2), 0.03, -0.285, violet, torso)

# --- 03 Bras (accélération) ---------------------------------------------
arms = kit.pivot("MONO / 03 offer pivot", (0, 0, 0.42))
for sx in (-1, 1):
    x = sx * 0.7
    kit.box("MONO / shoulder", (0.32, 0.36, 0.3), (x, 0, 0.22), ti, arms, 0.05)
    kit.sphere("MONO / shoulder joint", 0.11, (x, 0, 0.02), br, arms, 20, 10)
    kit.box("MONO / upper arm", (0.2, 0.22, 0.46), (x, 0, -0.24), gr, arms, 0.03)
    kit.sphere("MONO / elbow", 0.1, (x, 0, -0.5), br, arms, 20, 10)
    kit.box("MONO / forearm", (0.27, 0.3, 0.42), (x, 0, -0.76), ti, arms, 0.05)
    kit.bar("MONO / forearm glow", (x, -0.6), (x, -0.9), 0.035, -0.155, amber, arms)
    kit.box("MONO / fist", (0.22, 0.24, 0.16), (x, 0, -1.04), gr, arms, 0.04)

# --- 04 Jambes (livraison) ----------------------------------------------
legs = kit.pivot("MONO / 04 offer pivot", (0, 0, -0.9))
kit.box("MONO / hips", (0.74, 0.46, 0.2), (0, 0, 0.7), ti, legs, 0.045)
for sx in (-1, 1):
    x = sx * 0.22
    kit.box("MONO / thigh", (0.3, 0.32, 0.5), (x, 0, 0.4), gr, legs, 0.04)
    kit.sphere("MONO / knee", 0.11, (x, -0.02, 0.1), br, legs, 20, 10)
    kit.box("MONO / shin", (0.32, 0.36, 0.52), (x, 0, -0.14), ti, legs, 0.05)
    kit.bar("MONO / shin glow", (x, -0.02), (x, -0.3), 0.035, -0.185, cobalt, legs)
    kit.box("MONO / foot", (0.38, 0.52, 0.14), (x, -0.07, -0.47), gr, legs, 0.04)
    kit.box("MONO / toe cap", (0.34, 0.1, 0.1), (x, -0.31, -0.46), rh, legs, 0.025)

kit.studio_setup(OUTPUT, camera_location=(-3.4, -6, 1.4), scale=3.8)
