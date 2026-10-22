"""Construit l'objet de Ludora : un dé ancien et un plateau de six tuiles modulaires."""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_kit as kit  # noqa: E402
import bpy  # noqa: E402

OUTPUT = kit.ROOT / "assets" / "blender" / "ludora_dice.blend"
kit.reset_scene()
m = kit.standard_materials("DICE")

SIZE = 1.0
HALF = SIZE / 2
PIP = 0.075
# Disposition classique des points, en coordonnées de face (u, v).
PIPS = {
    1: [(0, 0)],
    2: [(-0.22, -0.22), (0.22, 0.22)],
    3: [(-0.24, -0.24), (0, 0), (0.24, 0.24)],
    4: [(-0.22, -0.22), (0.22, -0.22), (-0.22, 0.22), (0.22, 0.22)],
    5: [(-0.24, -0.24), (0.24, -0.24), (0, 0), (-0.24, 0.24), (0.24, 0.24)],
    6: [(-0.22, -0.24), (0.22, -0.24), (-0.22, 0), (0.22, 0), (-0.22, 0.24), (0.22, 0.24)],
}
# Face : (axe normal, signe, nombre de points)
FACES = [("y", -1, 5), ("y", 1, 2), ("x", 1, 3), ("x", -1, 4), ("z", 1, 1), ("z", -1, 6)]


def face_point(axis, sign, u, v, offset):
    if axis == "y":
        return (u, sign * (HALF + offset), v)
    if axis == "x":
        return (sign * (HALF + offset), u, v)
    return (u, v, sign * (HALF + offset))


die_root = kit.pivot("DICE / die pivot", (0, 0, 0))
body = kit.raw_box("DICE / body", (SIZE, SIZE, SIZE), (0, 0, 0))
for axis, sign, count in FACES:
    for u, v in PIPS[count]:
        cutter = kit.raw_box("cut", (PIP * 2.2, PIP * 2.2, PIP * 2.2), face_point(axis, sign, u, v, 0.0))
        cut_depth = 0.06
        # Un petit cube enfoncé suffit pour un logement net ; on l'arrondit en cylindre.
        bpy.data.objects.remove(cutter, do_unlink=True)
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=24,
            radius=PIP,
            depth=cut_depth * 2,
            location=face_point(axis, sign, u, v, 0.0),
            rotation=(math.pi / 2, 0, 0) if axis == "y" else ((0, math.pi / 2, 0) if axis == "x" else (0, 0, 0)),
        )
        kit.cut(body, bpy.context.object)
kit.finish(body, die_root, m["titanium"], 0.08, 4)
for axis, sign, count in FACES:
    for index, (u, v) in enumerate(PIPS[count]):
        rotation = (math.pi / 2, 0, 0) if axis == "y" else ((0, math.pi / 2, 0) if axis == "x" else (0, 0, 0))
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=24,
            radius=PIP * 0.78,
            depth=0.03,
            location=face_point(axis, sign, u, v, -0.045),
            rotation=rotation,
        )
        pip = bpy.context.object
        pip.name = f"DICE / pip {axis}{sign} {index}"
        kit.finish(pip, die_root, m["glow"][1], 0.003, 1)
for cx in (-1, 1):
    for cy in (-1, 1):
        for cz in (-1, 1):
            kit.sphere("DICE / corner stud", 0.06, (cx * HALF * 0.94, cy * HALF * 0.94, cz * HALF * 0.94), m["brass"], die_root, 16, 8)

# Plateau : six tuiles hexagonales qui tournent autour du dé.
board = kit.pivot("DICE / board pivot", (0, 0, -0.55))
for k in range(6):
    angle = k * math.tau / 6
    x, y = 1.2 * math.cos(angle), 1.2 * math.sin(angle)
    tile = kit.pivot(f"DICE / tile {k + 1} pivot", (x, y, 0), board)
    kit.cylinder(f"DICE / tile {k + 1} base", 0.34, 0.1, (0, 0, 0), m["obsidian"], tile, rotation=(0, 0, math.pi / 6), bevel=0.02, vertices=6)
    kit.cylinder(f"DICE / tile {k + 1} rim", 0.35, 0.03, (0, 0, -0.045), m["brass"], tile, rotation=(0, 0, math.pi / 6), bevel=0.008, vertices=6)
    kit.cylinder(f"DICE / tile {k + 1} inlay", 0.2, 0.02, (0, 0, 0.055), m["glow"][k % 4], tile, rotation=(0, 0, math.pi / 6), bevel=0.006, vertices=6)

kit.studio_setup(OUTPUT, camera_location=(-3.2, -6, 3.2), scale=4.0)
