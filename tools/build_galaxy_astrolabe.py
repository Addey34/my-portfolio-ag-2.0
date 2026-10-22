"""Construit l'astrolabe de Galaxy : anneaux de laiton, soleil et trois astres."""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blender_kit as kit  # noqa: E402
import bpy  # noqa: E402

OUTPUT = kit.ROOT / "assets" / "blender" / "galaxy_astrolabe.blend"
kit.reset_scene()
m = kit.standard_materials("ASTRO")
sun = kit.material("ASTRO / sun", (1.0, 0.75, 0.35), 0.0, 0.3, (1.0, 0.72, 0.3), 6.0)
energy = kit.material("ASTRO / energy ring", (0.16, 0.34, 0.66), 0.1, 0.25, (0.28, 0.5, 1.0), 4.0)


def ticks(parent, radius, count, length, width, mat, name):
    """Graduations radiales fusionnées en un seul objet."""
    pieces = []
    for k in range(count):
        angle = k * math.tau / count
        major = k % 5 == 0
        piece = kit.raw_box(
            "tick",
            (length * (1.7 if major else 1.0), width, 0.035 if major else 0.026),
            (radius * math.cos(angle), radius * math.sin(angle), 0),
        )
        piece.rotation_euler = (0, 0, angle)
        pieces.append(piece)
    bpy.ops.object.select_all(action="DESELECT")
    for piece in pieces:
        piece.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    merged = bpy.context.object
    merged.name = name
    bpy.ops.object.transform_apply(rotation=True, location=False, scale=True)
    return kit.finish(merged, parent, mat, 0.003, 1)


def ring_group(index, radius, minor, tilt, ring_mat, tick_count, tick_mat, planet, planet_mat):
    """Anneau incliné (tilt) qui tourne sur son propre axe (spin)."""
    tilt_pivot = kit.pivot(f"ASTRO / ring {index} tilt", (0, 0, 0))
    tilt_pivot.rotation_euler = tilt
    spin = kit.pivot(f"ASTRO / ring {index} spin", (0, 0, 0), tilt_pivot)
    kit.torus(f"ASTRO / ring {index} band", radius, minor, (0, 0, 0), (0, 0, 0), ring_mat, spin, 128, 14)
    ticks(spin, radius, tick_count, 0.05, 0.012, tick_mat, f"ASTRO / ring {index} ticks")
    kit.sphere(f"ASTRO / ring {index} planet", planet, (radius, 0, 0), planet_mat, spin, 32, 16)
    return spin


# Axe polaire et soleil au centre.
axis_root = kit.pivot("ASTRO / axis pivot", (0, 0, 0))
kit.cylinder("ASTRO / polar axis", 0.016, 2.3, (0, 0, 0), m["rhodium"], axis_root, rotation=(0, 0, 0), vertices=24)
kit.sphere("ASTRO / axis cap top", 0.055, (0, 0, 1.17), m["brass"], axis_root)
kit.sphere("ASTRO / axis cap bottom", 0.055, (0, 0, -1.17), m["brass"], axis_root)
kit.sphere("ASTRO / sun", 0.2, (0, 0, 0), sun, axis_root, 40, 20)

# Cadre extérieur fixe : méridien en titane avec boulons.
frame = kit.pivot("ASTRO / frame pivot", (0, 0, 0))
kit.torus("ASTRO / frame meridian", 1.22, 0.05, (0, 0, 0), (math.pi / 2, 0, 0), m["titanium"], frame, 128, 16)
kit.torus("ASTRO / frame inner lip", 1.22, 0.022, (0, -0.05, 0), (math.pi / 2, 0, 0), m["brass"], frame, 128, 10)
for k in range(8):
    angle = k * math.tau / 8
    kit.hex_bolt(
        "ASTRO / frame bolt",
        (1.22 * math.cos(angle), -0.062, 1.22 * math.sin(angle)),
        frame,
        m["rhodium"],
        radius=0.04,
    )

ring_group(1, 0.98, 0.032, (math.radians(72), 0, 0), m["brass"], 72, m["rhodium"], 0.075, m["titanium"])
ring_group(2, 0.8, 0.026, (math.radians(-28), math.radians(34), 0), m["rhodium"], 48, m["brass"], 0.055, sun)
ring_group(3, 0.62, 0.02, (math.radians(10), math.radians(-52), 0), energy, 36, m["rhodium"], 0.06, m["glow"][0])

kit.studio_setup(OUTPUT, camera_location=(-3.2, -6, 2.2), scale=3.4)
