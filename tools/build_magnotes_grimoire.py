"""Construit le grimoire modulaire MagNotes et ses six fiches réorganisables."""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_kit as kit  # noqa: E402
import bpy  # noqa: E402

OUTPUT = kit.ROOT / "assets" / "blender" / "magnotes_grimoire.blend"
kit.reset_scene()
obsidian = kit.material("BOOK / dark obsidian", (0.035, 0.04, 0.055), 0.65, 0.34)
champagne = kit.material("BOOK / champagne", (0.7, 0.58, 0.39), 0.85, 0.35)
paper = kit.material("BOOK / ivory paper", (0.87, 0.82, 0.7), 0.05, 0.75)
ink = kit.material("BOOK / graphite ink", (0.06, 0.045, 0.08), 0.1, 0.65)
accent = kit.material("BOOK / mauve index", (0.5, 0.2, 0.4), 0.3, 0.43, (0.45, 0.12, 0.3), 0.22)
W, D, T = 1.5, 1.05, 0.07
book = kit.pivot("BOOK / book pivot", (0, 0, -1.0))
kit.box("BOOK / back cover", (W, D, T), (0, 0, 0), obsidian, book, 0.025)
kit.box("BOOK / pages", (W * 0.94, D * 0.94, 0.16), (0, 0, T / 2 + 0.08), paper, book, 0.01)
for k in range(5):
    kit.box(f"BOOK / page edge {k}", (W * 0.91, 0.006, 0.006), (0, -D * 0.47 - 0.004, 0.03 + k * 0.03), ink, book)
kit.box("BOOK / front cover", (W, D, T), (0, 0, 0.265), obsidian, book, 0.025)
kit.box("BOOK / spine", (0.12, D, 0.3), (-W / 2 + 0.03, 0, 0.14), champagne, book, 0.025)
# Deux charnières et des gardes fines donnent une véritable reliure mécanique.
for y in (-0.34, 0.34):
    kit.cylinder("BOOK / hinge", 0.055, 0.19, (-0.7, y, 0.16), champagne, book, vertices=16, bevel=0.006)
for sx in (-1, 1):
    for sy in (-1, 1):
        kit.box("BOOK / corner guard", (0.14, 0.14, 0.012), (sx * 0.7, sy * 0.475, 0.305), champagne, book, 0.008)
# Un registre à six index remplace le médaillon magique de la couverture.
kit.box("BOOK / register inset", (0.85, 0.62, 0.012), (0.08, 0, 0.305), ink, book, 0.035)
for k in range(3):
    kit.box(f"BOOK / register rail {k}", (0.58, 0.025, 0.012), (0.08, -0.2 + k * 0.2, 0.318), champagne, book, 0.006)
    for j in range(2):
        kit.box(f"BOOK / register index {k}-{j}", (0.09, 0.055, 0.014), (-0.1 + j * 0.3, -0.15 + k * 0.2, 0.321), accent, book, 0.006)

notes = []
for k in range(6):
    note = kit.pivot(f"NOTE / {k + 1:02d} pivot", (0, 0, 0.6))
    notes.append(note)
    # Fiche ivoire sur fond obsidienne : le contraste vient de la matière, pas du néon.
    kit.box(f"NOTE / {k + 1:02d} backing", (0.58, 0.028, 0.42), (0, 0, 0), obsidian, note, 0.012)
    kit.box(f"NOTE / {k + 1:02d} paper", (0.54, 0.012, 0.37), (0, -0.021, 0), paper, note, 0.008)
    kit.box(f"NOTE / {k + 1:02d} clip", (0.075, 0.045, 0.055), (0.19, -0.021, 0.18), champagne, note, 0.006)
    kit.box(f"NOTE / {k + 1:02d} index", (0.055, 0.016, 0.055), (-0.2, -0.033, 0.12), accent, note, 0.004)
    kit.box(f"NOTE / {k + 1:02d} title", (0.27, 0.016, 0.025), (0.01, -0.033, 0.12), ink, note, 0.003)
    for row, width in enumerate((0.38, 0.29, 0.18 + (k % 3) * 0.05)):
        kit.box(f"NOTE / {k + 1:02d} line {row}", (width, 0.012, 0.012), (-0.19 + width / 2, -0.033, 0.035 - row * 0.07), ink, note, 0.002)

# Chaque pivot reste indépendant ; seules ses pièces de même matière sont regroupées.
for pivot in [book, *notes]:
    groups = {}
    for obj in list(pivot.children):
        groups.setdefault(obj.active_material.name, []).append(obj)
    for objects in groups.values():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            for modifier in list(obj.modifiers):
                if modifier.type == "BEVEL":
                    modifier.segments = 1
                bpy.ops.object.modifier_apply(modifier=modifier.name)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()

kit.studio_setup(OUTPUT, camera_location=(-2.6, -6, 2.4), scale=4.2)
