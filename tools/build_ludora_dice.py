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
# Une palette commune, des faces mates : seuls les repères émettent.
m["panel"] = kit.material("DICE / indigo enamel", (0.035, 0.065, 0.16), 0.55, 0.38)
m["signal"] = kit.material("DICE / cyan index", (0.12, 0.55, 0.61), 0.35, 0.3, (0.2, 0.7, 0.85), 0.65)

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
kit.finish(body, die_root, m["titanium"], 0.065, 2)
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
        kit.finish(pip, die_root, m["signal"], 0.003, 1)
for cx in (-1, 1):
    for cy in (-1, 1):
        for cz in (-1, 1):
            kit.sphere("DICE / corner stud", 0.06, (cx * HALF * 0.94, cy * HALF * 0.94, cz * HALF * 0.94), m["brass"], die_root, 16, 8)

# Plateau : un moyeu commun et six modules numérotés, tous sous les pivots historiques.
board = kit.pivot("DICE / board pivot", (0, 0, -0.55))
kit.cylinder("DICE / common hub", 0.65, 0.09, (0, 0, -0.025), m["titanium"], board, rotation=(0, 0, 0), bevel=0.025, vertices=48)
kit.torus("DICE / hub collar", 0.57, 0.018, (0, 0, 0.03), (0, 0, 0), m["brass"], board, major_segments=48, minor_segments=8)
for k in range(6):
    angle = k * math.tau / 6
    x, y = 1.2 * math.cos(angle), 1.2 * math.sin(angle)
    tile = kit.pivot(f"DICE / tile {k + 1} pivot", (x, y, 0), board)
    kit.cylinder(f"DICE / tile {k + 1} base", 0.34, 0.1, (0, 0, 0), m["obsidian"], tile, rotation=(0, 0, math.pi / 6), bevel=0.02, vertices=6)
    kit.cylinder(f"DICE / tile {k + 1} rim", 0.35, 0.03, (0, 0, -0.045), m["brass"], tile, rotation=(0, 0, math.pi / 6), bevel=0.008, vertices=6)
    kit.cylinder(f"DICE / tile {k + 1} inlay", 0.2, 0.02, (0, 0, 0.055), m["panel"], tile, rotation=(0, 0, math.pi / 6), bevel=0.006, vertices=6)

    # Le bras suit le plateau ; les modules restent libres pour devenir les notes.
    arm = kit.box(f"DICE / shared rail {k + 1}", (0.66, 0.095, 0.07), (0.8 * math.cos(angle), 0.8 * math.sin(angle), -0.035), m["titanium"], board, bevel=0.018)
    arm.rotation_euler.z = angle
    # Les six index reprennent les valeurs du dé, sans prétendre compter les jeux réels.
    for j, (u, v) in enumerate(PIPS[k + 1]):
        kit.cylinder(f"DICE / module index {k + 1}-{j}", 0.024, 0.008, (u * 0.5, v * 0.5, 0.07), m["signal"], tile, rotation=(0, 0, 0), vertices=12)

# Regroupement par matière à l'intérieur de chaque pivot : les morphologies restent séparables.
for pivot in [die_root, board] + [obj for obj in board.children if obj.type == "EMPTY"]:
    groups = {}
    for obj in list(pivot.children):
        if obj.type == "MESH":
            groups.setdefault(obj.active_material.name, []).append(obj)
    for objects in groups.values():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        # Appliquer les chanfreins avant la fusion conserve chaque surface usinée.
        for obj in objects:
            bpy.context.view_layer.objects.active = obj
            for modifier in list(obj.modifiers):
                if modifier.type == "BEVEL" and obj != body:
                    modifier.segments = 1
                bpy.ops.object.modifier_apply(modifier=modifier.name)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()

kit.studio_setup(OUTPUT, camera_location=(-3.2, -6, 3.2), scale=4.0)
