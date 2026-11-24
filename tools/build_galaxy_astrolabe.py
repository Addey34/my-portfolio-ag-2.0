"""Construit l'astrolabe de Galaxy : méridien en T, trois anneaux à gorge, soleil couronné.

Contrat d'intégration (StoryWorld3D, GalaxySignature) : les trois pivots
`ASTRO / ring N spin` tournent seuls ; les matières contiennent `aged brass`, `sun`,
`energy` et `rune` ; l'enveloppe reste proche du rayon 1,22 de l'ancien modèle.
Ne pas relancer ce script sur un `.blend` retouché à la main : il recrée la source.
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_kit as kit  # noqa: E402
import blender_craft as craft  # noqa: E402
import bmesh  # noqa: E402
import bpy  # noqa: E402

OUTPUT = kit.ROOT / "assets" / "blender" / "galaxy_astrolabe.blend"
kit.reset_scene()
m = kit.standard_materials("ASTRO")
d = craft.detail_materials("ASTRO")
sun = kit.material("ASTRO / sun", (1.0, 0.75, 0.35), 0.0, 0.3, (1.0, 0.72, 0.3), 6.0)
energy = kit.material("ASTRO / energy ring", (0.16, 0.34, 0.66), 0.1, 0.25, (0.28, 0.5, 1.0), 4.0)


def band(width, height, wall=None, depth=0.0):
    """Section (dr, z) anti-horaire : bande pleine ou à gorge sur la face supérieure."""
    w, h = width / 2, height / 2
    if not wall:
        return craft.closed([(-w, -h), (w, -h), (w, h), (-w, h)])
    return craft.closed(
        [(-w, -h), (w, -h), (w, h), (w - wall, h), (w - wall, h - depth), (-w + wall, h - depth), (-w + wall, h), (-w, h)]
    )


def planet(name, radius, location, mat, parent, segments=32, rings=16):
    return kit.sphere(name, radius, location, mat, parent, segments, rings)


def ring_group(index, radius, section, tilt, ring_mat, tick_count, tick_mat, planet_radius, planet_mat, extras):
    """Anneau incliné (tilt) qui tourne sur son propre axe (spin), avec tourillons et astres."""
    tilt_pivot = kit.pivot(f"ASTRO / ring {index} tilt", (0, 0, 0))
    tilt_pivot.rotation_euler = tilt
    spin = kit.pivot(f"ASTRO / ring {index} spin", (0, 0, 0), tilt_pivot)
    craft.ring_section(f"ASTRO / ring {index} band", radius, section, ring_mat, spin, 72)
    width = max(abs(dr) for dr, _ in section)
    craft.ticks(
        f"ASTRO / ring {index} ticks", radius + width - 0.006, tick_count, 0.026, 0.01, 0.026, tick_mat, spin, major_every=6, major_scale=1.7
    )
    # Deux tourillons opposés : l'anneau semble réellement monté sur l'axe.
    for sign in (-1, 1):
        craft.pin(
            f"ASTRO / ring {index} trunnion",
            0.034,
            0.2,
            (0, sign * radius, 0),
            m["brass"],
            spin,
            rotation=(math.pi / 2, 0, 0),
        )
    planet(f"ASTRO / ring {index} planet", planet_radius, (radius, 0, 0), planet_mat, spin)
    extras(spin, radius, planet_radius)
    return spin


# Axe polaire : fût cannelé, colliers et fleurons aux deux pôles.
axis_root = kit.pivot("ASTRO / axis pivot", (0, 0, 0))
shaft = [
    (0, -1.1),
    (0.016, -1.1),
    (0.016, -0.18),
    (0.03, -0.16),
    (0.03, -0.1),
    (0.016, -0.08),
    (0.016, 0.08),
    (0.03, 0.1),
    (0.03, 0.16),
    (0.016, 0.18),
    (0.016, 1.1),
    (0, 1.1),
]
craft.lathe("ASTRO / polar axis", [shaft], m["rhodium"], axis_root, 24)
finial = [
    (0.0, 0.0),
    (0.07, 0.0),
    (0.082, 0.025),
    (0.052, 0.05),
    (0.024, 0.085),
    (0.04, 0.12),
    (0.03, 0.165),
    (0.0, 0.2),
]
craft.lathe("ASTRO / axis finial top", [finial], m["brass"], axis_root, 32, (0, 0, 1.1))
craft.lathe("ASTRO / axis finial bottom", [finial], m["brass"], axis_root, 32, (0, 0, -1.1), (math.pi, 0, 0))

# Soleil : noyau émissif, couronne de dix-huit rayons et collier de laiton.
kit.sphere("ASTRO / sun", 0.2, (0, 0, 0), sun, axis_root, 40, 20)
ray = [[(0.0, 0.0), (0.028, 0.0), (0.02, 0.1), (0.0, 0.2)]]
for k in range(18):
    angle = math.tau * k / 18
    long_ray = k % 2 == 0
    craft.lathe(
        f"ASTRO / sun ray {k}",
        [[(0.0, 0.0), (0.026, 0.0), (0.0, 0.18 if long_ray else 0.11)]],
        m["brass"],
        axis_root,
        8,
        (0.2 * math.cos(angle), 0.2 * math.sin(angle), 0),
        (0, math.pi / 2, angle),
    )
craft.ring_section("ASTRO / sun collar", 0.235, craft.closed([(-0.012, -0.012), (0.012, -0.012), (0.012, 0.012), (-0.012, 0.012)]), m["brass"], axis_root, 48)

# Cadre extérieur fixe : méridien en T, lèvre de laiton, vis et blocs de palier aux pôles.
frame = kit.pivot("ASTRO / frame pivot", (0, 0, 0))
meridian = craft.closed(
    [(-0.07, -0.05), (0.06, -0.05), (0.07, -0.04), (0.07, 0.04), (0.06, 0.05), (0.02, 0.05), (0.02, 0.085), (-0.02, 0.085), (-0.02, 0.05), (-0.06, 0.05), (-0.07, 0.04)]
)
craft.ring_section("ASTRO / frame meridian", 1.22, meridian, m["titanium"], frame, 96, rotation=(math.pi / 2, 0, 0))
craft.ring_section(
    "ASTRO / frame inner lip",
    1.17,
    craft.closed([(-0.012, -0.03), (0.012, -0.03), (0.012, 0.03), (-0.012, 0.03)]),
    m["brass"],
    frame,
    96,
    location=(0, -0.06, 0),
    rotation=(math.pi / 2, 0, 0),
)
craft.ticks("ASTRO / frame ticks", 1.185, 96, 0.04, 0.009, 0.018, m["rhodium"], frame, major_every=8, location=(0, -0.082, 0), rotation=(math.pi / 2, 0, 0))
for k in range(8):
    angle = k * math.tau / 8
    craft.bolt_head(
        "ASTRO / frame bolt",
        (1.255 * math.cos(angle), -0.052, 1.255 * math.sin(angle)),
        frame,
        m["rhodium"],
        radius=0.036,
        height=0.03,
        rotation=(math.pi / 2, 0, 0),
    )
bearing = [
    (0.0, 0.0),
    (0.15, 0.0),
    (0.15, 0.05),
    (0.11, 0.07),
    (0.11, 0.17),
    (0.08, 0.19),
    (0.0, 0.19),
]
for sign in (-1, 1):
    craft.lathe(
        f"ASTRO / pole bearing {sign}",
        [bearing],
        m["brass"],
        frame,
        40,
        (0, 0, sign * 1.17 + (0 if sign > 0 else 0)),
        (0, 0, 0) if sign > 0 else (math.pi, 0, 0),
    )
    kit.box(f"ASTRO / bearing yoke {sign}", (0.28, 0.1, 0.07), (0, -0.0, sign * 1.27), m["titanium"], frame, 0.012)

# Quatre jambes effilées relient le méridien à des plots : l'ensemble paraît posé sur un châssis.
for k, angle in enumerate([45, 135, 225, 315]):
    a = math.radians(angle)
    craft.tapered_bar(
        f"ASTRO / frame brace {k}",
        (1.22 * math.cos(a), 0, 1.22 * math.sin(a)),
        (1.34 * math.cos(a), 0, 1.34 * math.sin(a)),
        0.1,
        0.06,
        0.13,
        m["graphite"],
        frame,
        0.008,
    )


def ring_one(spin, radius, planet_radius):
    # Saturne d'atelier : anneau fin de laiton autour du premier astre.
    craft.ring_section(
        "ASTRO / ring 1 planet halo",
        0.13,
        craft.closed([(-0.018, -0.006), (0.018, -0.006), (0.018, 0.006), (-0.018, 0.006)]),
        m["brass"],
        spin,
        48,
        location=(radius, 0, 0),
        rotation=(math.radians(62), math.radians(18), 0),
    )


def ring_two(spin, radius, planet_radius):
    # Lune sur bras fin : seconde échelle visible dans la silhouette.
    craft.tapered_bar("ASTRO / ring 2 moon arm", (radius, 0, 0), (radius + 0.12, 0.07, 0.07), 0.012, 0.01, 0.012, m["rhodium"], spin, 0.002)
    kit.sphere("ASTRO / ring 2 moon", 0.026, (radius + 0.12, 0.07, 0.07), m["titanium"], spin, 20, 10)


def ring_three(spin, radius, planet_radius):
    # Pierre sertie : collerette de laiton autour du troisième astre.
    craft.ring_section(
        "ASTRO / ring 3 bezel",
        planet_radius * 1.1,
        craft.closed([(-0.008, -0.01), (0.008, -0.01), (0.008, 0.01), (-0.008, 0.01)]),
        m["brass"],
        spin,
        32,
        location=(radius, 0, 0),
        rotation=(math.pi / 2, 0, 0),
    )


ring_group(1, 0.98, band(0.075, 0.06, 0.012, 0.022), (math.radians(72), 0, 0), m["brass"], 72, m["rhodium"], 0.075, m["titanium"], ring_one)
ring_group(2, 0.8, band(0.06, 0.05, 0.01, 0.018), (math.radians(-28), math.radians(34), 0), m["rhodium"], 48, m["brass"], 0.055, sun, ring_two)
ring_group(3, 0.62, band(0.05, 0.045), (math.radians(10), math.radians(-52), 0), energy, 36, m["rhodium"], 0.06, m["glow"][0], ring_three)

# Une maille par matière et par pivot : moins d'appels de rendu, mêmes pivots animés.
for holder in [obj for obj in bpy.data.objects if obj.type == "EMPTY"]:
    craft.join_by_material(holder)

kit.studio_setup(OUTPUT, camera_location=(-3.2, -6, 2.2), scale=3.4)
