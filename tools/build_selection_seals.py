"""Construit les trois sceaux de Sélection : Galaxy, Ludora, MagNotes."""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_kit as kit  # noqa: E402
import bpy  # noqa: E402

OUTPUT = kit.ROOT / "assets" / "blender" / "selection_seals.blend"
kit.reset_scene()
m = kit.standard_materials("SEAL")

RADIUS = 0.55
BODY = 0.18
FRONT = -BODY / 2
KEYS = ["galaxy", "ludora", "magnotes"]
ACCENT = {"galaxy": m["glow"][0], "ludora": m["glow"][1], "magnotes": m["glow"][2]}
POSITIONS = [(0.32, 0, 1.05), (-0.32, 0, 0.0), (0.32, 0, -1.05)]
FACE = (math.pi / 2, 0, 0)  # axe du disque vers Y


def emblem(key, parent, mat, y):
    t = 0.03
    n = f"SEAL / {key} emblem"
    if key == "galaxy":  # soleil, deux orbites, deux astres
        kit.cylinder(f"{n} sun", 0.055, 0.03, (0, y, 0), mat, parent, bevel=0.004, vertices=24)
        kit.torus(f"{n} orbit 1", 0.17, 0.013, (0, y, 0), FACE, mat, parent, 64, 8)
        kit.torus(f"{n} orbit 2", 0.28, 0.013, (0, y, 0), FACE, mat, parent, 64, 8)
        kit.cylinder(f"{n} planet 1", 0.032, 0.03, (0.17, y, 0), mat, parent, vertices=16)
        kit.cylinder(f"{n} planet 2", 0.04, 0.03, (-0.2, y, 0.2), mat, parent, vertices=16)
    elif key == "ludora":  # hexagone de plateau et trois dés
        pts = [(0.25 * math.cos(k * math.pi / 3 + math.pi / 6), 0.25 * math.sin(k * math.pi / 3 + math.pi / 6)) for k in range(6)]
        for k in range(6):
            kit.bar(f"{n} edge {k}", pts[k], pts[(k + 1) % 6], t, y, mat, parent)
        for k, (px, pz) in enumerate(((-0.08, 0.07), (0.09, 0.05), (0.0, -0.1))):
            kit.cylinder(f"{n} pip {k}", 0.04, 0.03, (px, y, pz), mat, parent, vertices=16)
    else:  # trois notes en cascade
        for k, (dx, dz) in enumerate(((-0.1, 0.1), (0.0, 0.0), (0.1, -0.1))):
            pts = [(-0.14, -0.1), (0.14, -0.1), (0.14, 0.1), (-0.14, 0.1)]
            for i in range(4):
                a = (dx + pts[i][0], dz + pts[i][1])
                b = (dx + pts[(i + 1) % 4][0], dz + pts[(i + 1) % 4][1])
                kit.bar(f"{n} card {k}{i}", a, b, 0.024, y - k * 0.004, mat, parent)


for index, key in enumerate(KEYS):
    root = kit.pivot(f"SEAL / {index + 1:02d} {key} pivot", POSITIONS[index])
    body = kit.cylinder(f"SEAL / {key} body", RADIUS, BODY, (0, 0, 0), m["titanium"], root, bevel=0.03)
    # Logement circulaire de la plaque, usiné dans la face avant.
    recess = kit.cylinder("cut", 0.43, 0.12, (0, FRONT, 0), m["titanium"], root)
    kit.cut(body, recess)
    # Gorges radiales sur le chant, comme un joint d'étanchéité.
    for k in range(12):
        angle = k * math.tau / 12
        cutter = kit.raw_box("cut", (0.03, 0.1, 0.07), (RADIUS * math.cos(angle), 0, RADIUS * math.sin(angle)))
        cutter.rotation_euler = (0, -angle, 0)
        kit.cut(body, cutter)
    kit.cylinder(f"SEAL / {key} plate", 0.42, 0.02, (0, FRONT + 0.05, 0), m["graphite"], root, bevel=0.006)
    kit.torus(f"SEAL / {key} polished rim", 0.44, 0.017, (0, FRONT - 0.003, 0), FACE, m["rhodium"], root)
    kit.torus(f"SEAL / {key} brass ring", RADIUS + 0.015, 0.038, (0, 0, 0), FACE, m["brass"], root)
    for k in range(6):
        angle = k * math.tau / 6 + math.pi / 6
        kit.hex_bolt(f"SEAL / {key} bolt", (0.495 * math.cos(angle), FRONT - 0.012, 0.495 * math.sin(angle)), root, m["rhodium"])
    emblem(key, root, ACCENT[key], FRONT + 0.034)
    # Revers sobre : une cuvette de laiton pour que le sceau tourne proprement.
    kit.cylinder(f"SEAL / {key} back", 0.3, 0.03, (0, BODY / 2 + 0.008, 0), m["brass"], root, bevel=0.01)

kit.studio_setup(OUTPUT, camera_location=(-1.8, -6, 1.2), scale=4.4)
