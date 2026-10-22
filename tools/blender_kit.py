"""Aides communes des scripts de construction Blender (matières, usinage, studio).

Utilisé par les objets du lot 2. Les scripts du cube et du monolithe gardent leurs
propres copies : ne pas les migrer sans les reconstruire et les revérifier.
"""

import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
export = None
studio = None


def reset_scene():
    """Vide la scène et crée WEB_EXPORT et STUDIO_RENDER_ONLY."""
    global export, studio
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


TITANIUM = ("brushed titanium", (0.52, 0.58, 0.64), 0.92, 0.34)
GRAPHITE = ("graphite recess", (0.04, 0.052, 0.07), 0.75, 0.42)
RHODIUM = ("polished edge", (0.82, 0.87, 0.92), 0.95, 0.14)
BRASS = ("aged brass", (0.72, 0.5, 0.2), 0.9, 0.3)
OBSIDIAN = ("dark obsidian", (0.03, 0.04, 0.055), 0.6, 0.22)
ACCENTS = [
    ("cobalt", (0.16, 0.34, 0.66), (0.28, 0.5, 1.0)),
    ("cyan", (0.12, 0.55, 0.61), (0.2, 0.9, 1.0)),
    ("violet", (0.39, 0.28, 0.62), (0.6, 0.4, 1.0)),
    ("amber", (0.66, 0.42, 0.18), (1.0, 0.62, 0.2)),
]


def standard_materials(prefix):
    """Jeu de matières commun : le préfixe nomme les matières dans le GLB."""
    base = {
        key: material(f"{prefix} / {spec[0]}", spec[1], spec[2], spec[3])
        for key, spec in {
            "titanium": TITANIUM,
            "graphite": GRAPHITE,
            "rhodium": RHODIUM,
            "brass": BRASS,
            "obsidian": OBSIDIAN,
        }.items()
    }
    base["glow"] = [
        material(f"{prefix} / rune {name}", color, 0.1, 0.25, emission, 4.0)
        for name, color, emission in ACCENTS
    ]
    return base


def raw_box(name, size, location):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return obj


def cut(target, cutter):
    """Soustrait un volume : gorges, évents, logements."""
    modifier = target.modifiers.new("cut", "BOOLEAN")
    modifier.object = cutter
    modifier.operation = "DIFFERENCE"
    modifier.solver = "EXACT"
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier="cut")
    bpy.data.objects.remove(cutter, do_unlink=True)


def finish(obj, parent, mat, bevel_width=0.0, segments=3):
    """Range l'objet dans WEB_EXPORT. Vide d'abord les matières : un booléen
    laisse un emplacement vide que le GLB exporterait sans matière."""
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    export.objects.link(obj)
    obj.parent = parent
    obj.data.materials.clear()
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


def pivot(name, location, parent=None):
    empty = bpy.data.objects.new(name, None)
    empty.location = location
    export.objects.link(empty)
    empty.parent = parent
    return empty


def hex_bolt(name, location, parent, mat, axis_rotation=(math.pi / 2, 0, 0), radius=0.032):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=radius, depth=0.022, location=location, rotation=axis_rotation
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, parent, mat, 0.004, 1)


def cylinder(name, radius, depth, location, mat, parent, rotation=(math.pi / 2, 0, 0), bevel=0.0, vertices=64):
    """Cylindre dont l'axe est Y par défaut (face avant vers -Y)."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, parent, mat, bevel, 3)


def torus(name, major, minor, location, rotation, mat, parent, major_segments=96, minor_segments=12):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, parent, mat, 0.0)


def sphere(name, radius, location, mat, parent, segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=radius, location=location
    )
    obj = bpy.context.object
    obj.name = name
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return finish(obj, parent, mat, 0.0)


def bar(name, start, end, thickness, y, mat, parent, depth=0.02):
    """Barre en relief sur une face avant, entre deux points (x, z) locaux."""
    sx, sz = start
    ex, ez = end
    length = math.hypot(ex - sx, ez - sz)
    bpy.ops.mesh.primitive_cube_add(size=1, location=((sx + ex) / 2, y, (sz + ez) / 2))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (length + thickness * 0.6, depth, thickness)
    obj.rotation_euler = (0, -math.atan2(ez - sz, ex - sx), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    return finish(obj, parent, mat, 0.006, 2)


def studio_setup(output, camera_location=(-3.4, -6, 1.8), scale=4.2):
    """Caméra orthographique et deux lumières, hors de WEB_EXPORT."""
    camera_data = bpy.data.cameras.new("Studio / camera")
    camera = bpy.data.objects.new("Studio / camera", camera_data)
    studio.objects.link(camera)
    camera.location = camera_location
    camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat(
        "-Z", "Y"
    ).to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = scale
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
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.world.color = (0.03, 0.04, 0.06)
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    print(f"BLEND_SAVED={output}")
