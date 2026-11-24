"""Construit le grimoire modulaire MagNotes et ses six fiches réorganisables.

Contrat d'intégration (StoryWorld3D) : pivot `BOOK / book pivot` et six pivots
`NOTE / 01..06 pivot` centrés sur leur fiche, face visible vers -Y. Les fiches se
déplacent librement ; seules leurs pièces de même matière sont fusionnées.
Ne pas relancer ce script sur un `.blend` retouché à la main : il recrée la source.
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_kit as kit  # noqa: E402
import blender_craft as craft  # noqa: E402
import bpy  # noqa: E402

OUTPUT = kit.ROOT / "assets" / "blender" / "magnotes_grimoire.blend"
kit.reset_scene()
leather = kit.material("BOOK / dark obsidian", (0.035, 0.04, 0.055), 0.65, 0.34)
champagne = kit.material("BOOK / champagne", (0.7, 0.58, 0.39), 0.85, 0.35)
paper = kit.material("BOOK / ivory paper", (0.87, 0.82, 0.7), 0.05, 0.75)
ink = kit.material("BOOK / graphite ink", (0.06, 0.045, 0.08), 0.1, 0.65)
accent = kit.material("BOOK / mauve index", (0.5, 0.2, 0.4), 0.3, 0.43, (0.45, 0.12, 0.3), 0.22)
strap = kit.material("BOOK / oiled strap", (0.1, 0.055, 0.07), 0.05, 0.55)
W, D, T = 1.5, 1.05, 0.07
SPINE_X = -W / 2 + 0.03

book = kit.pivot("BOOK / book pivot", (0, 0, -1.0))
kit.box("BOOK / back cover", (W, D, T), (0, 0, 0), leather, book, 0.025)
# Bloc de pages : deux couches (corps + tranche de fore-edge) pour une lecture feuilletée.
kit.box("BOOK / pages", (W * 0.94, D * 0.94, 0.16), (0, 0, T / 2 + 0.08), paper, book, 0.01)
for k in range(5):
    kit.box(
        f"BOOK / page leaf {k}",
        (W * 0.935 - k * 0.005, 0.004, 0.016),
        (0.0, -D * 0.47 - 0.003, 0.03 + k * 0.03),
        paper,
        book,
    )
for k in range(5):
    kit.box(f"BOOK / page edge {k}", (W * 0.91, 0.006, 0.006), (0, -D * 0.47 - 0.007, 0.03 + k * 0.03), ink, book)
kit.box("BOOK / gilded fore-edge", (0.012, D * 0.9, 0.15), (W * 0.47 + 0.004, 0, T / 2 + 0.08), champagne, book, 0.003)
kit.box("BOOK / front cover", (W, D, T), (0, 0, 0.265), leather, book, 0.025)

# Dos arrondi : cylindre couché, trois nerfs et deux têtières de laiton.
craft.lathe("BOOK / spine", [[(0.0, -D / 2), (0.165, -D / 2), (0.165, D / 2), (0.0, D / 2)]], leather, book, 28, (SPINE_X, 0, 0.14), (math.pi / 2, 0, 0))
for y in (-0.34, 0, 0.34):
    craft.ring_section(
        "BOOK / spine band",
        0.168,
        craft.closed([(-0.012, -0.013), (0.012, -0.013), (0.012, 0.013), (-0.012, 0.013)]),
        champagne,
        book,
        28,
        (SPINE_X, y, 0.14),
        (math.pi / 2, 0, 0),
    )
for y in (-D / 2 + 0.01, D / 2 - 0.01):
    craft.lathe(
        "BOOK / spine cap",
        [[(0.0, 0.0), (0.18, 0.0), (0.18, 0.026), (0.15, 0.04), (0.0, 0.04)]],
        champagne,
        book,
        28,
        (SPINE_X, y, 0.14),
        (-math.pi / 2 if y < 0 else math.pi / 2, 0, 0),
    )
for y in (-0.34, 0.34):
    craft.pin("BOOK / hinge pin", 0.032, 0.2, (-0.7, y, 0.16), champagne, book, rotation=(math.pi / 2, 0, 0))

# Coins ferrés à rivets : protection et lecture mécanique de l'objet.
for sx in (-1, 1):
    for sy in (-1, 1):
        craft.tapered_bar(
            "BOOK / corner guard",
            (sx * 0.64, sy * 0.4, 0.305),
            (sx * 0.72, sy * 0.485, 0.305),
            0.2,
            0.07,
            0.012,
            champagne,
            book,
            0.004,
        )
        craft.lathe("BOOK / corner rivet", [[(0.0, 0.0), (0.016, 0.0), (0.012, 0.01), (0.0, 0.012)]], champagne, book, 12, (sx * 0.665, sy * 0.435, 0.311))

# Registre en relief : cadre, six cases et rails, au lieu d'un médaillon.
kit.box("BOOK / register inset", (0.85, 0.62, 0.012), (0.08, 0, 0.305), ink, book, 0.035)
for sx, sy, w, h in [(0, -0.325, 0.88, 0.016), (0, 0.325, 0.88, 0.016), (-0.37, 0, 0.016, 0.66), (0.37, 0, 0.016, 0.66)]:
    kit.box("BOOK / register frame", (w, h, 0.018), (0.08 + sx, sy, 0.31), champagne, book, 0.005)
for k in range(3):
    kit.box(f"BOOK / register rail {k}", (0.58, 0.025, 0.012), (0.08, -0.2 + k * 0.2, 0.318), champagne, book, 0.006)
    for j in range(2):
        kit.box(f"BOOK / register index {k}-{j}", (0.09, 0.055, 0.014), (-0.1 + j * 0.3, -0.15 + k * 0.2, 0.321), accent, book, 0.006)

# Sangle de fermeture : lanière de cuir, boucle et ardillon de laiton.
craft.tapered_bar("BOOK / strap", (W / 2 - 0.1, -0.12, 0.31), (W / 2 + 0.055, -0.12, 0.31), 0.13, 0.13, 0.014, strap, book, 0.004)
craft.tapered_bar("BOOK / strap drop", (W / 2 + 0.055, -0.12, 0.31), (W / 2 + 0.055, -0.12, 0.05), 0.13, 0.13, 0.014, strap, book, 0.004)
craft.ring_section(
    "BOOK / buckle",
    0.05,
    craft.closed([(-0.008, -0.01), (0.008, -0.01), (0.008, 0.01), (-0.008, 0.01)]),
    champagne,
    book,
    24,
    (W / 2 - 0.06, -0.12, 0.322),
    (0, 0, 0),
)
craft.tapered_bar("BOOK / buckle tongue", (W / 2 - 0.06, -0.12, 0.325), (W / 2 - 0.02, -0.12, 0.325), 0.012, 0.004, 0.008, champagne, book, 0.001)

# Signet en ruban : suspendu sous le bloc de pages.
craft.tapered_bar("BOOK / ribbon", (0.2, -D * 0.47, 0.12), (0.22, -D * 0.47 - 0.01, -0.12), 0.06, 0.05, 0.004, accent, book, 0.001)

notes = []
for k in range(6):
    note = kit.pivot(f"NOTE / {k + 1:02d} pivot", (0, 0, 0.6))
    notes.append(note)
    n = f"NOTE / {k + 1:02d}"
    kit.box(f"{n} backing", (0.58, 0.028, 0.42), (0, 0, 0), leather, note, 0.014)
    kit.box(f"{n} paper", (0.54, 0.012, 0.37), (0, -0.021, 0), paper, note, 0.008)
    kit.box(f"{n} clip", (0.075, 0.045, 0.055), (-0.19, -0.021, 0.18), champagne, note, 0.006)
    kit.box(f"{n} index", (0.055, 0.016, 0.055), (-0.2, -0.033, 0.12), accent, note, 0.004)
    kit.box(f"{n} title", (0.27, 0.016, 0.025), (0.01, -0.033, 0.12), ink, note, 0.003)
    for row, width in enumerate((0.38, 0.29, 0.18 + (k % 3) * 0.05)):
        kit.box(f"{n} line {row}", (width, 0.012, 0.012), (-0.19 + width / 2, -0.033, 0.035 - row * 0.07), ink, note, 0.002)
    # Deux vis de fixation : la fiche est vissée à son support.
    for sx in (-1, 1):
        craft.lathe(
            f"{n} screw",
            [[(0.0, 0.0), (0.024, 0.0), (0.02, 0.012), (0.0, 0.016)]],
            champagne,
            note,
            10,
            (sx * 0.245, -0.027, -0.17),
            (math.pi / 2, 0, 0),
        )

for holder in [book, *notes]:
    craft.join_by_material(holder)

kit.studio_setup(OUTPUT, camera_location=(-2.6, -6, 2.4), scale=4.2)
