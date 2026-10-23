"""Construit le cube-puzzle de Stacks : quatre modules usinés autour d'un noyau d'astrolabe."""

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "blender" / "stack_cube.blend"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != "Collection":
        bpy.data.collections.remove(collection)

export = bpy.data.collections.new("WEB_EXPORT")
bpy.context.scene.collection.children.link(export)
studio = bpy.data.collections.new("STUDIO_RENDER_ONLY")
bpy.context.scene.collection.children.link(studio)


def material(name, color, metallic, roughness, emission=None, strength=0.0, alpha=1.0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, alpha)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Alpha"].default_value = alpha
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1)
        shader.inputs["Emission Strength"].default_value = strength
    return result


titanium = material("CUBE / brushed titanium", (0.52, 0.58, 0.64), 0.92, 0.34)
graphite = material("CUBE / graphite recess", (0.04, 0.052, 0.07), 0.75, 0.42)
rhodium = material("CUBE / polished edge", (0.82, 0.87, 0.92), 0.95, 0.14)
brass = material("CUBE / aged brass", (0.72, 0.5, 0.2), 0.9, 0.3)
glass = material("CUBE / core glass", (0.55, 0.8, 1.0), 0.0, 0.05, alpha=0.28)
crystal = material(
    "CUBE / core crystal", (0.3, 0.7, 1.0), 0.0, 0.2, (0.3, 0.7, 1.0), 5.0
)
runes = [
    material("CUBE / rune cobalt", (0.16, 0.34, 0.66), 0.1, 0.25, (0.28, 0.5, 1.0), 4.0),
    material("CUBE / rune cyan", (0.12, 0.55, 0.61), 0.1, 0.25, (0.2, 0.9, 1.0), 4.0),
    material("CUBE / rune violet", (0.39, 0.28, 0.62), 0.1, 0.25, (0.6, 0.4, 1.0), 4.0),
    material("CUBE / rune amber", (0.66, 0.42, 0.18), 0.1, 0.25, (1.0, 0.62, 0.2), 4.0),
]


def raw_box(name, size, location):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return obj


def cut(target, cutter):
    """Soustrait un volume : sert aux gorges, évents et logements."""
    modifier = target.modifiers.new("cut", "BOOLEAN")
    modifier.object = cutter
    modifier.operation = "DIFFERENCE"
    modifier.solver = "EXACT"
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier="cut")
    bpy.data.objects.remove(cutter, do_unlink=True)


def finish(obj, parent, mat, bevel_width=0.0, segments=3):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    export.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    if bevel_width:
        bevel = obj.modifiers.new("Machined edges", "BEVEL")
        bevel.width = bevel_width
        bevel.segments = segments
        bevel.limit_method = "ANGLE"
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def box(name, size, location, mat, parent, bevel=0.0):
    return finish(raw_box(name, size, location), parent, mat, bevel)


def hex_bolt(name, location, parent):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=0.032, depth=0.022, location=location, rotation=(math.pi / 2, 0, 0)
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, parent, rhodium, 0.004, 1)


def bar(name, start, end, thickness, y, mat, parent):
    """Barre lumineuse posée en relief sur la plaque, entre deux points (x, z)."""
    sx, sz = start
    ex, ez = end
    length = math.hypot(ex - sx, ez - sz)
    bpy.ops.mesh.primitive_cube_add(size=1, location=((sx + ex) / 2, y, (sz + ez) / 2))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (length + thickness * 0.6, 0.02, thickness)
    obj.rotation_euler = (0, -math.atan2(ez - sz, ex - sx), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    return finish(obj, parent, mat, 0.006, 2)


def disc(name, radius, location, mat, parent):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32, radius=radius, depth=0.02, location=location, rotation=(math.pi / 2, 0, 0)
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, parent, mat, 0.004, 2)


def ring(name, major, minor, rotation, mat, parent=None):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=96,
        minor_segments=10,
        location=(0, 0, 0),
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, parent, mat, 0.0)


def rune_pattern(index, parent, mat, y):
    """Motif de famille, en relief sur la plaque graphite."""
    t = 0.032
    n = f"CUBE / rune {index + 1}"
    if index == 0:  # interface : fenêtre d'écran
        pts = [(-0.24, -0.17), (0.24, -0.17), (0.24, 0.17), (-0.24, 0.17)]
        for i in range(4):
            bar(f"{n} frame {i}", pts[i], pts[(i + 1) % 4], t, y, mat, parent)
        bar(f"{n} title", (-0.24, 0.09), (0.24, 0.09), t * 0.8, y, mat, parent)
        bar(f"{n} line", (-0.12, -0.02), (0.1, -0.02), t * 0.7, y, mat, parent)
    elif index == 1:  # interaction : viseur
        bar(f"{n} h", (-0.3, 0), (-0.1, 0), t, y, mat, parent)
        bar(f"{n} h2", (0.1, 0), (0.3, 0), t, y, mat, parent)
        bar(f"{n} v", (0, -0.3), (0, -0.1), t, y, mat, parent)
        bar(f"{n} v2", (0, 0.1), (0, 0.3), t, y, mat, parent)
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.16,
            minor_radius=0.016,
            major_segments=48,
            minor_segments=8,
            location=(0, y, 0),
            rotation=(math.pi / 2, 0, 0),
        )
        circle = bpy.context.object
        circle.name = f"{n} ring"
        finish(circle, parent, mat, 0.0)
    elif index == 2:  # services : réseau
        nodes = [(-0.22, -0.16), (0.0, 0.18), (0.24, -0.1)]
        for i, node in enumerate(nodes):
            disc(f"{n} node {i}", 0.06, (node[0], y, node[1]), mat, parent)
        bar(f"{n} a", nodes[0], nodes[1], t, y, mat, parent)
        bar(f"{n} b", nodes[1], nodes[2], t, y, mat, parent)
    else:  # livraison : chevrons
        for i, shift in enumerate((-0.2, 0.0, 0.2)):
            bar(f"{n} up {i}", (-0.2 + shift, -0.2), (0.0 + shift, 0.0), t, y, mat, parent)
            bar(f"{n} dn {i}", (0.0 + shift, 0.0), (-0.2 + shift, 0.2), t, y, mat, parent)


FAMILIES = ["interface", "interaction", "services", "delivery"]
CENTERS = [(-0.5, 0.5), (0.5, 0.5), (-0.5, -0.5), (0.5, -0.5)]
DEPTH = 1.5
FRONT = -DEPTH / 2
SIDE = 0.97

for index, (cx, cz) in enumerate(CENTERS):
    sx = 1 if cx > 0 else -1
    sz = 1 if cz > 0 else -1
    pivot = bpy.data.objects.new(f"CUBE / {index + 1:02d} {FAMILIES[index]} pivot", None)
    pivot.location = (cx, 0, cz)
    export.objects.link(pivot)

    body = raw_box(f"CUBE / {index + 1:02d} body", (SIDE, DEPTH, SIDE), (0, 0, 0))
    # Logement de la plaque frontale.
    cut(body, raw_box("cut", (0.76, 0.12, 0.76), (0, FRONT, 0)))
    # Évents usinés sur les deux faces extérieures du module.
    for k in range(5):
        y = -0.5 + k * 0.25
        cut(body, raw_box("cut", (0.03, 0.035, 0.62), (sx * SIDE / 2, y, 0)))
        cut(body, raw_box("cut", (0.62, 0.035, 0.03), (0, y, sz * SIDE / 2)))
    # Gorge de séparation sur les faces intérieures (le noyau y diffuse sa lumière).
    cut(body, raw_box("cut", (0.02, DEPTH * 0.7, 0.5), (-sx * SIDE / 2, 0, 0)))
    cut(body, raw_box("cut", (0.5, DEPTH * 0.7, 0.02), (0, 0, -sz * SIDE / 2)))
    # Le booléen peut vider les emplacements de matière : on les réaffecte.
    body.data.materials.clear()
    finish(body, pivot, titanium, 0.03, 3)
    print(f"BODY_MATERIALS {body.name} {[m.name for m in body.data.materials]}")

    box(f"CUBE / {index + 1:02d} plate", (0.74, 0.02, 0.74), (0, FRONT + 0.05, 0), graphite, pivot, 0.008)
    # Cadre rhodium poli du logement.
    for dz in (-0.385, 0.385):
        box(f"CUBE / {index + 1:02d} frame h", (0.8, 0.035, 0.035), (0, FRONT - 0.003, dz), rhodium, pivot, 0.01)
    for dx in (-0.385, 0.385):
        box(f"CUBE / {index + 1:02d} frame v", (0.035, 0.035, 0.8), (dx, FRONT - 0.003, 0), rhodium, pivot, 0.01)
    for dx in (-0.385, 0.385):
        for dz in (-0.385, 0.385):
            hex_bolt(f"CUBE / {index + 1:02d} bolt", (dx, FRONT - 0.02, dz), pivot)
    # Cornière en laiton sur l'arête extérieure : une pièce d'assemblage visible.
    box(f"CUBE / {index + 1:02d} brass guard", (0.075, DEPTH + 0.012, 0.075), (sx * (SIDE / 2 - 0.02), 0, sz * (SIDE / 2 - 0.02)), brass, pivot, 0.02)
    rune_pattern(index, pivot, runes[index], FRONT + 0.034)

# Noyau : verre, cristal et anneaux de laiton d'un astrolabe.
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=0.4, location=(0, 0, 0))
shell = bpy.context.object
shell.name = "CUBE / core glass"
finish(shell, None, glass, 0.0)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.2, location=(0, 0, 0))
gem = bpy.context.object
gem.name = "CUBE / core crystal"
finish(gem, None, crystal, 0.0)
ring("CUBE / core ring 1", 0.5, 0.014, (math.pi / 2, 0, 0), brass)
ring("CUBE / core ring 2", 0.58, 0.012, (0.9, 0.4, 0.6), rhodium)
ring("CUBE / core ring 3", 0.66, 0.01, (-0.5, 0.2, 1.2), brass)

camera_data = bpy.data.cameras.new("Studio / camera")
camera = bpy.data.objects.new("Studio / camera", camera_data)
studio.objects.link(camera)
camera.location = (-3.2, -6, 2.4)
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat(
    "-Z", "Y"
).to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 3.6
bpy.context.scene.camera = camera

for name, location, energy, color, size in [
    ("Studio / key", (-3, -4, 4), 650, (0.78, 0.89, 1), 3.5),
    ("Studio / fill", (3, -3, 1), 420, (1, 0.78, 0.62), 3),
]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    lamp = bpy.data.objects.new(name, data)
    studio.objects.link(lamp)
    lamp.location = location
    lamp.rotation_euler = (Vector((0, 0, 0)) - lamp.location).to_track_quat(
        "-Z", "Y"
    ).to_euler()

bpy.context.scene.render.engine = "CYCLES"
bpy.context.scene.cycles.samples = 48
bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 900
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.world.color = (0.03, 0.04, 0.06)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
print(f"STACK_CUBE_BLEND={OUTPUT}")
