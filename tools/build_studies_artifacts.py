"""Construit les deux artefacts d'Études : un œil sentinelle et une lentille-prisme."""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_kit as kit  # noqa: E402
import bpy  # noqa: E402

OUTPUT = kit.ROOT / "assets" / "blender" / "studies_artifacts.blend"
kit.reset_scene()
m = kit.standard_materials("ART")
glass = kit.material("ART / lens glass", (0.55, 0.45, 0.95), 0.0, 0.05, alpha=0.32)
pupil = kit.material("ART / pupil", (1.0, 0.6, 0.2), 0.0, 0.3, (1.0, 0.62, 0.2), 5.0)
FACE = (math.pi / 2, 0, 0)

# Œil sentinelle (SiteGuardian) : sphère de titane, orbite de veille, iris et pupille ambrée.
eye = kit.pivot("EYE / eye pivot", (0, 0, 0.95))
shell = kit.raw_box("cutter-base", (0.01, 0.01, 0.01), (0, 0, 0))
bpy.data.objects.remove(shell, do_unlink=True)
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=0.55, location=(0, 0, 0))
ball = bpy.context.object
ball.name = "EYE / housing"
for polygon in ball.data.polygons:
    polygon.use_smooth = True
recess = kit.cylinder("cut", 0.34, 0.5, (0, -0.52, 0), m["titanium"], None)
kit.cut(ball, recess)
kit.finish(ball, eye, m["titanium"], 0.0)
kit.cylinder("EYE / iris plate", 0.33, 0.05, (0, -0.36, 0), m["graphite"], eye, vertices=48)
kit.torus("EYE / iris ring", 0.3, 0.025, (0, -0.395, 0), FACE, m["brass"], eye, 48, 10)
kit.torus("EYE / iris glow", 0.2, 0.012, (0, -0.4, 0), FACE, m["glow"][3], eye, 48, 8)
kit.sphere("EYE / pupil", 0.11, (0, -0.4, 0), pupil, eye, 24, 12)
kit.torus("EYE / bezel", 0.345, 0.04, (0, -0.425, 0), FACE, m["brass"], eye, 48, 10)
kit.torus("EYE / rim", 0.37, 0.022, (0, -0.375, 0), FACE, m["rhodium"], eye, 48, 10)
spin = kit.pivot("EYE / gimbal spin", (0, 0, 0), eye)
kit.torus("EYE / gimbal ring", 0.78, 0.022, (0, 0, 0), (math.radians(78), 0, 0), m["brass"], spin, 64, 10)
for sx in (-1, 1):
    kit.sphere("EYE / gimbal node", 0.05, (sx * 0.78, 0, 0), m["rhodium"], spin, 16, 8)

# Lentille-prisme (ImageGeneratorLocal) : lentille de verre dans une monture de laiton.
lens = kit.pivot("LENS / lens pivot", (0, 0, -0.95))
kit.torus("LENS / frame", 0.55, 0.05, (0, 0, 0), FACE, m["brass"], lens, 64, 12)
kit.torus("LENS / frame inner", 0.5, 0.02, (0, -0.02, 0), FACE, m["rhodium"], lens, 64, 10)
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=0.5, location=(0, 0, 0))
lens_glass = bpy.context.object
lens_glass.name = "LENS / glass"
lens_glass.scale = (1, 0.28, 1)
bpy.ops.object.transform_apply(scale=True)
for polygon in lens_glass.data.polygons:
    polygon.use_smooth = True
kit.finish(lens_glass, lens, glass, 0.0)
kit.sphere("LENS / focus", 0.08, (0, 0, 0), m["glow"][2], lens, 20, 10)
# Prisme triangulaire posé devant la lentille.
bpy.ops.mesh.primitive_cylinder_add(vertices=3, radius=0.3, depth=0.14, location=(0.0, -0.2, 0), rotation=(math.pi / 2, 0, math.pi / 2))
prism = bpy.context.object
prism.name = "LENS / prism"
kit.finish(prism, lens, glass, 0.01, 2)
for k in range(8):
    angle = k * math.tau / 8
    kit.hex_bolt("LENS / frame bolt", (0.55 * math.cos(angle), -0.065, 0.55 * math.sin(angle)), lens, m["rhodium"], radius=0.03)

kit.studio_setup(OUTPUT, camera_location=(-2.4, -6, 1.4), scale=4.4)
