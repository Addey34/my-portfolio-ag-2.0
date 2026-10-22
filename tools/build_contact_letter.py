"""Construit l'objet de Contact : une lettre scellée par un sceau lumineux."""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_kit as kit  # noqa: E402
import bpy  # noqa: E402

OUTPUT = kit.ROOT / "assets" / "blender" / "contact_letter.blend"
kit.reset_scene()
m = kit.standard_materials("LETTER")
seal_glow = kit.material("LETTER / seal glow", (1.0, 0.62, 0.2), 0.1, 0.3, (1.0, 0.62, 0.2), 4.0)

W, H, T = 1.7, 1.15, 0.05  # largeur, hauteur, épaisseur
letter = kit.pivot("LETTER / letter pivot", (0, 0, 0))

kit.box("LETTER / body", (W, T, H), (0, 0, 0), m["obsidian"], letter, 0.02)
# Cadre de titane fin sur le pourtour : le papier est une plaque usinée.
for dz in (-H / 2, H / 2):
    kit.box("LETTER / frame h", (W + 0.02, T + 0.02, 0.03), (0, 0, dz), m["titanium"], letter, 0.008)
for dx in (-W / 2, W / 2):
    kit.box("LETTER / frame v", (0.03, T + 0.02, H + 0.02), (dx, 0, 0), m["titanium"], letter, 0.008)
# Rabat triangulaire.
vertices = [(-W / 2, -T / 2 - 0.012, H / 2), (W / 2, -T / 2 - 0.012, H / 2), (0, -T / 2 - 0.012, -0.08)]
back = [(x, y - 0.03, z) for x, y, z in vertices]
mesh = bpy.data.meshes.new("LETTER / flap")
mesh.from_pydata(vertices + back, [], [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)])
mesh.update()
flap = bpy.data.objects.new("LETTER / flap", mesh)
bpy.context.scene.collection.objects.link(flap)
kit.finish(flap, letter, m["titanium"], 0.008, 2)
for polygon in flap.data.polygons:
    polygon.use_smooth = False
# Liserés lumineux le long du rabat.
kit.bar("LETTER / flap edge a", (-W / 2 + 0.05, H / 2 - 0.03), (0, -0.04), 0.022, -T / 2 - 0.05, m["glow"][3], letter)
kit.bar("LETTER / flap edge b", (W / 2 - 0.05, H / 2 - 0.03), (0, -0.04), 0.022, -T / 2 - 0.05, m["glow"][3], letter)
# Sceau : disque de laiton, anneau et cœur lumineux.
kit.cylinder("LETTER / seal", 0.2, 0.07, (0, -T / 2 - 0.07, -0.08), m["brass"], letter, bevel=0.015, vertices=40)
kit.torus("LETTER / seal ring", 0.15, 0.014, (0, -T / 2 - 0.115, -0.08), (math.pi / 2, 0, 0), seal_glow, letter, 48, 8)
kit.cylinder("LETTER / seal core", 0.055, 0.03, (0, -T / 2 - 0.12, -0.08), seal_glow, letter, vertices=24)
# Lignes d'adresse sous le sceau.
for k, w in enumerate((0.7, 0.5)):
    kit.box(f"LETTER / address {k}", (w, 0.016, 0.02), (0, -T / 2 - 0.012, -0.36 - k * 0.1), m["rhodium"], letter, 0.004)

kit.studio_setup(OUTPUT, camera_location=(-2.6, -6, 1.6), scale=3.2)
