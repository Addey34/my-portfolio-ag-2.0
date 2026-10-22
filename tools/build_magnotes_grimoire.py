"""Construit l'objet de MagNotes : un grimoire en lévitation et six notes qui se réorganisent."""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_kit as kit  # noqa: E402
import bpy  # noqa: E402

OUTPUT = kit.ROOT / "assets" / "blender" / "magnotes_grimoire.blend"
kit.reset_scene()
m = kit.standard_materials("BOOK")
paper = kit.material("BOOK / pale paper", (0.78, 0.74, 0.64), 0.0, 0.85)

W, D, T = 1.5, 1.05, 0.07  # largeur, profondeur (hauteur du livre dans le plan), épaisseur d'une couverture
book = kit.pivot("BOOK / book pivot", (0, 0, -1.0))

# Couvertures et dos en métal, tranche de pages claire.
kit.box("BOOK / back cover", (W, D, T), (0, 0, 0), m["obsidian"], book, 0.02)
kit.box("BOOK / pages", (W * 0.94, D * 0.94, 0.16), (0, 0, T / 2 + 0.08), paper, book, 0.01)
for k in range(5):
    kit.box(f"BOOK / page edge {k}", (W * 0.94, 0.012, 0.012), (0, -D * 0.47 - 0.004, 0.02 + k * 0.03), m["titanium"], book)
kit.box("BOOK / front cover", (W, D, T), (0, 0, T + 0.16 + 0.035), m["obsidian"], book, 0.02)
kit.box("BOOK / spine", (0.12, D, 0.3), (-W / 2 + 0.03, 0, 0.14), m["brass"], book, 0.025)
for sx in (-1, 1):
    for sy in (-1, 1):
        kit.box("BOOK / corner guard", (0.14, 0.14, 0.012), (sx * (W / 2 - 0.05), sy * (D / 2 - 0.05), T + 0.16 + 0.075), m["brass"], book, 0.01)
# Médaillon et runes de la couverture.
kit.cylinder("BOOK / cover medal", 0.2, 0.03, (0.1, 0, T + 0.16 + 0.085), m["titanium"], book, rotation=(0, 0, 0), bevel=0.008, vertices=32)
kit.torus("BOOK / cover ring", 0.26, 0.012, (0.1, 0, T + 0.16 + 0.08), (0, 0, 0), m["glow"][2], book, 48, 8)
kit.cylinder("BOOK / cover core", 0.08, 0.03, (0.1, 0, T + 0.16 + 0.105), m["glow"][2], book, rotation=(0, 0, 0), vertices=24)

# Six notes qui lévitent au-dessus : cartes minces à liseré lumineux.
for k in range(6):
    note = kit.pivot(f"NOTE / {k + 1:02d} pivot", (0, 0, 0.6))
    kit.box(f"NOTE / {k + 1:02d} card", (0.56, 0.02, 0.4), (0, 0, 0), m["obsidian"], note, 0.01)
    accent = m["glow"][k % 3]
    for dz in (-0.185, 0.185):
        kit.box(f"NOTE / {k + 1:02d} edge h", (0.56, 0.026, 0.016), (0, -0.002, dz), accent, note, 0.004)
    for dx in (-0.272, 0.272):
        kit.box(f"NOTE / {k + 1:02d} edge v", (0.016, 0.026, 0.4), (dx, -0.002, 0), accent, note, 0.004)
    kit.box(f"NOTE / {k + 1:02d} title", (0.3, 0.024, 0.026), (-0.08, -0.002, 0.1), accent, note, 0.004)
    kit.box(f"NOTE / {k + 1:02d} line a", (0.38, 0.022, 0.016), (0, -0.002, 0.02), m["rhodium"], note, 0.003)
    kit.box(f"NOTE / {k + 1:02d} line b", (0.26, 0.022, 0.016), (-0.06, -0.002, -0.06), m["rhodium"], note, 0.003)

kit.studio_setup(OUTPUT, camera_location=(-2.6, -6, 2.4), scale=4.2)
