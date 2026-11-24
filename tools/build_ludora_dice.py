"""Construit l'objet de Ludora : un dé de laiton et de titane, et un plateau à six modules.

Contrat d'intégration (StoryWorld3D) : pivots `DICE / die pivot`, `DICE / board pivot`
et `DICE / tile 1..6 pivot` (position de base = centre du module, rayon 1,2) ; la matière
`DICE / titanium` est réglée au chargement ; les index émissifs portent « cyan index ».
Ne pas relancer ce script sur un `.blend` retouché à la main : il recrée la source.
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_kit as kit  # noqa: E402
import blender_craft as craft  # noqa: E402
import bpy  # noqa: E402
from mathutils import Quaternion, Vector  # noqa: E402

OUTPUT = kit.ROOT / "assets" / "blender" / "ludora_dice.blend"
kit.reset_scene()
m = kit.standard_materials("DICE")
m["panel"] = kit.material("DICE / indigo enamel", (0.035, 0.065, 0.16), 0.55, 0.38)
m["signal"] = kit.material("DICE / cyan index", (0.12, 0.55, 0.61), 0.35, 0.3, (0.2, 0.7, 0.85), 0.65)

SIZE = 1.0
HALF = SIZE / 2
PIP = 0.072
PIPS = {
    1: [(0, 0)],
    2: [(-0.22, -0.22), (0.22, 0.22)],
    3: [(-0.24, -0.24), (0, 0), (0.24, 0.24)],
    4: [(-0.22, -0.22), (0.22, -0.22), (-0.22, 0.22), (0.22, 0.22)],
    5: [(-0.24, -0.24), (0.24, -0.24), (0, 0), (-0.24, 0.24), (0.24, 0.24)],
    6: [(-0.22, -0.24), (0.22, -0.24), (-0.22, 0), (0.22, 0), (-0.22, 0.24), (0.22, 0.24)],
}
# Face : (axe normal, signe, nombre de points). L'orientation reste celle de l'ancien dé.
FACES = [("y", -1, 5), ("y", 1, 2), ("x", 1, 3), ("x", -1, 4), ("z", 1, 1), ("z", -1, 6)]


def face_frame(axis, sign):
    """Position de la face, rotation pour poser une pièce de révolution dessus."""
    if axis == "y":
        return (lambda u, v, o: (u, sign * (HALF + o), v)), (sign * math.pi / 2, 0, 0)
    if axis == "x":
        return (lambda u, v, o: (sign * (HALF + o), u, v)), (0, sign * math.pi / 2, 0)
    return (lambda u, v, o: (u, v, sign * (HALF + o))), ((0 if sign > 0 else math.pi), 0, 0)


# Rotation d'une pièce dont l'axe Z doit pointer vers l'extérieur de la face.
def outward_rotation(axis, sign, twist=0.0):
    normal = {"x": Vector((sign, 0, 0)), "y": Vector((0, sign, 0)), "z": Vector((0, 0, sign))}[axis]
    quat = normal.to_track_quat("Z", "Y") @ Quaternion((0, 0, 1), twist)
    return quat.to_euler()


die_root = kit.pivot("DICE / die pivot", (0, 0, 0))
# Corps chanfreiné : l'arête usinée accroche la lumière.
body = kit.raw_box("DICE / body", (SIZE, SIZE, SIZE), (0, 0, 0))
kit.finish(body, die_root, m["titanium"], 0.07, 3)

# Panneaux d'émail encadrés par le titane : un relief plat, pas un simple aplat de couleur.
panel_profile = [
    (0.0, 0.0),
    (0.395, 0.0),
    (0.41, 0.006),
    (0.41, 0.014),
    (0.38, 0.02),
    (0.0, 0.02),
]
pip_ring = [(0.0, 0.0), (PIP * 1.45, 0.0), (PIP * 1.2, 0.02), (PIP * 1.1, 0.032), (0.0, 0.032)]
pip_dome = [(0.0, 0.0), (PIP * 0.95, 0.0), (PIP * 0.78, 0.022), (PIP * 0.4, 0.034), (0.0, 0.036)]
frame_ring = [
    (0.405, 0.0),
    (0.45, 0.0),
    (0.45, 0.012),
    (0.438, 0.02),
    (0.41, 0.02),
    (0.405, 0.012),
]
for axis, sign, count in FACES:
    at, _ = face_frame(axis, sign)
    rot = outward_rotation(axis, sign)
    square = outward_rotation(axis, sign, math.pi / 4)
    craft.lathe("DICE / face panel", [panel_profile], m["panel"], die_root, 4, at(0, 0, 0.0), tuple(square))
    craft.lathe("DICE / face brass frame", [frame_ring], m["brass"], die_root, 4, at(0, 0, 0.0), tuple(square))
    for u, v in PIPS[count]:
        craft.lathe("DICE / pip socket", [pip_ring], m["brass"], die_root, 12, at(u, v, 0.02), tuple(rot))
        craft.lathe("DICE / pip lens", [pip_dome], m["signal"], die_root, 12, at(u, v, 0.03), tuple(rot))

# Coins : capuchons de laiton coniques pointant vers l'extérieur, avec une vis fine.
cap = [(0.0, 0.0), (0.09, 0.0), (0.08, 0.04), (0.045, 0.07), (0.0, 0.082)]
for cx in (-1, 1):
    for cy in (-1, 1):
        for cz in (-1, 1):
            direction = Vector((cx, cy, cz)).normalized()
            rot = direction.to_track_quat("Z", "Y").to_euler()
            craft.lathe(
                "DICE / corner cap",
                [cap],
                m["brass"],
                die_root,
                10,
                (cx * HALF * 0.9, cy * HALF * 0.9, cz * HALF * 0.9),
                (rot.x, rot.y, rot.z),
            )

# Filets de laiton sur les douze arêtes : liseré affleurant.
for a, b, axis in [(sx, sy, "z") for sx in (-1, 1) for sy in (-1, 1)]:
    kit.box("DICE / edge inlay", (0.026, 0.026, 0.68), (a * HALF * 0.985, b * HALF * 0.985, 0), m["brass"], die_root, 0.004)
for a, b in [(sx, sz) for sx in (-1, 1) for sz in (-1, 1)]:
    kit.box("DICE / edge inlay", (0.026, 0.68, 0.026), (a * HALF * 0.985, 0, b * HALF * 0.985), m["brass"], die_root, 0.004)
for a, b in [(sy, sz) for sy in (-1, 1) for sz in (-1, 1)]:
    kit.box("DICE / edge inlay", (0.68, 0.026, 0.026), (0, a * HALF * 0.985, b * HALF * 0.985), m["brass"], die_root, 0.004)

# Plateau : moyeu étagé, couronne dentée, six rails et six modules numérotés.
board = kit.pivot("DICE / board pivot", (0, 0, -0.55))
hub = [
    (0.0, -0.05),
    (0.66, -0.05),
    (0.68, -0.035),
    (0.68, 0.005),
    (0.62, 0.02),
    (0.62, 0.035),
    (0.4, 0.035),
    (0.34, 0.07),
    (0.2, 0.07),
    (0.17, 0.095),
    (0.0, 0.095),
]
craft.lathe("DICE / common hub", [hub], m["titanium"], board, 40)
craft.gear("DICE / hub gear", 36, 0.69, 0.76, 0.045, m["brass"], board, location=(0, 0, -0.045), bevel=0.004)
craft.ring_section("DICE / hub collar", 0.52, craft.closed([(-0.02, -0.012), (0.02, -0.012), (0.02, 0.012), (-0.02, 0.012)]), m["brass"], board, 40, location=(0, 0, 0.036))
craft.gear("DICE / hub spindle", 12, 0.07, 0.095, 0.05, m["rhodium"], board, location=(0, 0, 0.12), bevel=0.003)

tile_cap = [(0.0, 0.0), (0.205, 0.0), (0.2, 0.012), (0.0, 0.012)]
for k in range(6):
    angle = k * math.tau / 6
    x, y = 1.2 * math.cos(angle), 1.2 * math.sin(angle)
    tile = kit.pivot(f"DICE / tile {k + 1} pivot", (x, y, 0), board)
    craft.hex_pad(f"DICE / tile {k + 1} base", 0.34, 0.1, 0.022, m["obsidian"], tile)
    craft.hex_pad(f"DICE / tile {k + 1} rim", 0.355, 0.034, 0.01, m["brass"], tile, (0, 0, -0.045))
    craft.hex_pad(f"DICE / tile {k + 1} frame", 0.255, 0.024, 0.008, m["titanium"], tile, (0, 0, 0.056))
    craft.hex_pad(f"DICE / tile {k + 1} inlay", 0.205, 0.02, 0.006, m["panel"], tile, (0, 0, 0.066))
    for j, (u, v) in enumerate(PIPS[k + 1]):
        craft.lathe(
            f"DICE / module socket {k + 1}-{j}",
            [[(0.0, 0.0), (0.04, 0.0), (0.034, 0.012), (0.0, 0.014)]],
            m["brass"],
            tile,
            10,
            (u * 0.46, v * 0.46, 0.077),
        )
        craft.lathe(
            f"DICE / module index {k + 1}-{j}",
            [[(0.0, 0.0), (0.028, 0.0), (0.02, 0.012), (0.0, 0.015)]],
            m["signal"],
            tile,
            10,
            (u * 0.46, v * 0.46, 0.087),
        )
    # Boulons de fixation aux trois sommets orientés vers l'extérieur du plateau.
    for corner in range(3):
        a = math.radians(30 + corner * 120)
        craft.bolt_head(
            f"DICE / tile {k + 1} bolt",
            (0.29 * math.cos(a), 0.29 * math.sin(a), 0.05),
            tile,
            m["brass"],
            radius=0.028,
            height=0.02,
            rotation=(0, 0, 0),
        )
    # Rail commun : bras effilé du moyeu vers le module (reste dans le pivot du plateau).
    craft.tapered_bar(
        f"DICE / shared rail {k + 1}",
        (0.62 * math.cos(angle), 0.62 * math.sin(angle), -0.035),
        (0.9 * math.cos(angle), 0.9 * math.sin(angle), -0.035),
        0.13,
        0.085,
        0.07,
        m["titanium"],
        board,
        0.016,
    )

# Regroupement par matière à l'intérieur de chaque pivot : les morphologies restent séparables.
for holder in [die_root, board] + [obj for obj in board.children if obj.type == "EMPTY"]:
    craft.join_by_material(holder)

kit.studio_setup(OUTPUT, camera_location=(-3.2, -6, 3.2), scale=4.0)
