"""Construit le monolithe de Solutions : quatre segments effilés, un par offre."""

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "blender" / "solutions_monolith.blend"

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


titanium = material("MONO / brushed titanium", (0.52, 0.58, 0.64), 0.92, 0.34)
graphite = material("MONO / graphite recess", (0.04, 0.052, 0.07), 0.75, 0.42)
rhodium = material("MONO / polished edge", (0.82, 0.87, 0.92), 0.95, 0.14)
brass = material("MONO / aged brass", (0.72, 0.5, 0.2), 0.9, 0.3)
glass = material("MONO / core glass", (0.55, 0.8, 1.0), 0.0, 0.05, alpha=0.28)
crystal = material(
    "MONO / core crystal", (0.3, 0.7, 1.0), 0.0, 0.2, (0.3, 0.7, 1.0), 5.0
)
runes = [
    material("MONO / rune cobalt", (0.16, 0.34, 0.66), 0.1, 0.25, (0.28, 0.5, 1.0), 4.0),
    material("MONO / rune cyan", (0.12, 0.55, 0.61), 0.1, 0.25, (0.2, 0.9, 1.0), 4.0),
    material("MONO / rune violet", (0.39, 0.28, 0.62), 0.1, 0.25, (0.6, 0.4, 1.0), 4.0),
    material("MONO / rune amber", (0.66, 0.42, 0.18), 0.1, 0.25, (1.0, 0.62, 0.2), 4.0),
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



seam = material("MONO / seam light", (0.5, 0.75, 1.0), 0.0, 0.3, (0.45, 0.75, 1.0), 4.0)
obsidian = material("MONO / dark obsidian", (0.03, 0.04, 0.055), 0.6, 0.22)
ACCENTS = [runes[0], runes[1], runes[2], runes[3]]


def tapered(name, width, depth, height, taper, location):
    """Bloc effilé : le haut est plus étroit que le bas."""
    obj = raw_box(name, (width, depth, height), location)
    for vertex in obj.data.vertices:
        if vertex.co.z > 0:
            vertex.co.x *= taper
            vertex.co.y *= taper
    return obj


def glyph(index, parent, mat, y):
    t = 0.03
    ox = 0.0
    n = f"MONO / glyph {index + 1}"
    if index == 0:  # interfaces : deux cadres décalés
        for k, (dx, dz) in enumerate(((-0.06, 0.05), (0.06, -0.05))):
            pts = [(-0.11, -0.08), (0.11, -0.08), (0.11, 0.08), (-0.11, 0.08)]
            for i in range(4):
                a = (dx + pts[i][0], dz + pts[i][1])
                b = (dx + pts[(i + 1) % 4][0], dz + pts[(i + 1) % 4][1])
                bar(f"{n} f{k}{i}", a, b, t, y, mat, parent)
    elif index == 1:  # applications : tableau de bord
        for i, w in enumerate((0.2, 0.12, 0.16)):
            bar(f"{n} b{i}", (-w, 0.09 - i * 0.09), (w, 0.09 - i * 0.09), t, y, mat, parent)
    elif index == 2:  # 3D : losange et plan
        pts = [(0, 0.17), (0.17, 0), (0, -0.17), (-0.17, 0)]
        for i in range(4):
            bar(f"{n} d{i}", pts[i], pts[(i + 1) % 4], t, y, mat, parent)
        bar(f"{n} m", (-0.17, 0), (0.17, 0), t, y, mat, parent)
    else:  # APIs : deux nœuds reliés
        for k, dx in enumerate((-0.16, 0.16)):
            pts = [(-0.05, -0.05), (0.05, -0.05), (0.05, 0.05), (-0.05, 0.05)]
            for i in range(4):
                a = (dx + pts[i][0], pts[i][1])
                b = (dx + pts[(i + 1) % 4][0], pts[(i + 1) % 4][1])
                bar(f"{n} n{k}{i}", a, b, t, y, mat, parent)
        bar(f"{n} link", (-0.11, 0), (0.11, 0), t, y, mat, parent)


DEPTH_BASE = 0.7
HEIGHT = 0.6
PITCH = 0.78
WIDTHS = [0.92, 1.0, 1.08, 1.16]

for index in range(4):
    z = (1.5 - index) * PITCH
    width = WIDTHS[index]
    depth = DEPTH_BASE * width
    front = -depth / 2
    pivot = bpy.data.objects.new(f"MONO / {index + 1:02d} offer pivot", None)
    pivot.location = (0, 0, z)
    export.objects.link(pivot)

    body = tapered(f"MONO / {index + 1:02d} body", width, depth, HEIGHT, 0.94, (0, 0, 0))
    cut(body, raw_box("cut", (width * 0.7, 0.1, HEIGHT * 0.62), (0, front, 0)))
    for k in range(3):
        for sx in (-1, 1):
            cut(body, raw_box("cut", (0.03, depth * 0.6, 0.02), (sx * width / 2, 0, -0.18 + k * 0.18)))
    body.data.materials.clear()
    finish(body, pivot, obsidian, 0.025, 3)

    box(f"MONO / {index + 1:02d} plate", (width * 0.66, 0.02, HEIGHT * 0.58), (0, front + 0.052, 0), graphite, pivot, 0.008)
    frame_w, frame_h = width * 0.72, HEIGHT * 0.66
    for dz in (-frame_h / 2, frame_h / 2):
        box(f"MONO / {index + 1:02d} frame h", (frame_w, 0.03, 0.03), (0, front - 0.003, dz), rhodium, pivot, 0.008)
    for dx in (-frame_w / 2, frame_w / 2):
        box(f"MONO / {index + 1:02d} frame v", (0.03, 0.03, frame_h), (dx, front - 0.003, 0), rhodium, pivot, 0.008)
    for dx in (-frame_w / 2, frame_w / 2):
        for dz in (-frame_h / 2, frame_h / 2):
            hex_bolt(f"MONO / {index + 1:02d} bolt", (dx, front - 0.02, dz), pivot)
    # Plaques de titane haut et bas, bague de laiton à la base.
    box(f"MONO / {index + 1:02d} plate top", (width * 0.95, depth * 0.95, 0.025), (0, 0, HEIGHT / 2 + 0.005), titanium, pivot, 0.008)
    box(f"MONO / {index + 1:02d} brass band", (width * 1.01, depth * 1.01, 0.04), (0, 0, -HEIGHT / 2 + 0.03), brass, pivot, 0.012)
    glyph(index, pivot, ACCENTS[index], front + 0.034)
    # Joint lumineux dans l'interstice sous le bloc.
    box(f"MONO / {index + 1:02d} seam", (width * 0.9, depth * 0.9, 0.012), (0, 0, -HEIGHT / 2 - 0.045), seam, pivot, 0.004)

camera_data = bpy.data.cameras.new("Studio / camera")
camera = bpy.data.objects.new("Studio / camera", camera_data)
studio.objects.link(camera)
camera.location = (-3.4, -6, 1.6)
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat(
    "-Z", "Y"
).to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 4.2
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
print(f"SOLUTIONS_MONOLITH_BLEND={OUTPUT}")
