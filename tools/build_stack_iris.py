"""Construit le noyau à quatre secteurs du médaillon, éditable dans Blender."""

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "blender" / "stack_iris.blend"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != "Collection":
        bpy.data.collections.remove(collection)

export = bpy.data.collections.new("WEB_EXPORT")
bpy.context.scene.collection.children.link(export)
studio = bpy.data.collections.new("STUDIO_RENDER_ONLY")
bpy.context.scene.collection.children.link(studio)


def material(name, color, metallic, roughness):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return result


titanium = material("STACK / brushed titanium", (0.49, 0.56, 0.62), 0.88, 0.29)
graphite = material("STACK / graphite recess", (0.055, 0.073, 0.095), 0.66, 0.4)
rhodium = material("STACK / polished rim", (0.78, 0.85, 0.9), 0.92, 0.17)
accents = [
    material("STACK / interface cobalt", (0.16, 0.34, 0.66), 0.67, 0.26),
    material("STACK / interaction cyan", (0.12, 0.55, 0.61), 0.67, 0.26),
    material("STACK / services violet", (0.39, 0.28, 0.62), 0.67, 0.26),
    material("STACK / delivery amber", (0.66, 0.42, 0.18), 0.67, 0.26),
]


def sector_mesh(name, center, span, inner, outer, front, back, finish, parent):
    segments = 16
    angles = [center - span / 2 + span * i / segments for i in range(segments + 1)]
    outline = [(inner * math.cos(angles[0]), inner * math.sin(angles[0]))]
    outline.extend((outer * math.cos(a), outer * math.sin(a)) for a in angles)
    outline.extend(
        (inner * math.cos(a), inner * math.sin(a)) for a in reversed(angles[1:])
    )
    count = len(outline)
    vertices = [(x, front, z) for x, z in outline]
    vertices.extend((x, back, z) for x, z in outline)
    faces = [tuple(range(count)), tuple(range(2 * count - 1, count - 1, -1))]
    faces.extend(
        (i, (i + 1) % count, (i + 1) % count + count, i + count)
        for i in range(count)
    )
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    export.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(finish)
    bevel = obj.modifiers.new("Machined edges", "BEVEL")
    bevel.width = 0.025 if outer > 1 else 0.008
    bevel.segments = 3
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


for index in range(4):
    center = math.pi / 4 + index * math.pi / 2
    pivot = bpy.data.objects.new(f"STACK / sector {index + 1:02d} pivot", None)
    export.objects.link(pivot)
    sector_mesh(
        f"STACK / sector {index + 1:02d} body",
        center,
        1.37,
        0.34,
        1.53,
        -0.57,
        -0.41,
        titanium,
        pivot,
    )
    sector_mesh(
        f"STACK / sector {index + 1:02d} inset",
        center,
        1.18,
        0.48,
        1.39,
        -0.602,
        -0.576,
        graphite,
        pivot,
    )
    sector_mesh(
        f"STACK / sector {index + 1:02d} color",
        center,
        0.73,
        1.15,
        1.24,
        -0.614,
        -0.603,
        accents[index],
        pivot,
    )
    for fragment_index, (angle_offset, outer) in enumerate(
        [(-0.39, 1.8), (-0.06, 1.99), (0.35, 1.86)], start=1
    ):
        fragment = sector_mesh(
            f"STACK / fragment {index + 1:02d} {fragment_index:02d}",
            center + angle_offset,
            0.16 if fragment_index == 2 else 0.12,
            1.62,
            outer,
            -0.54 - fragment_index * 0.025,
            -0.4 - fragment_index * 0.025,
            rhodium if fragment_index == 2 else titanium,
            pivot,
        )
        fragment["family"] = index + 1
        fragment["fragment"] = fragment_index


def cylinder(name, radius, depth, location, finish):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48,
        radius=radius,
        depth=depth,
        location=location,
        rotation=(math.pi / 2, 0, 0),
    )
    obj = bpy.context.object
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    export.objects.link(obj)
    obj.name = name
    obj.data.materials.append(finish)
    bevel = obj.modifiers.new("Machined edge", "BEVEL")
    bevel.width = 0.025
    bevel.segments = 3
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


cylinder("STACK / central bearing", 0.32, 0.13, (0, -0.54, 0), rhodium)
cylinder("STACK / central recess", 0.23, 0.025, (0, -0.62, 0), graphite)
cylinder("STACK / central pin", 0.07, 0.04, (0, -0.645, 0), rhodium)


camera_data = bpy.data.cameras.new("Studio / camera")
camera = bpy.data.objects.new("Studio / camera", camera_data)
studio.objects.link(camera)
camera.location = (0, -6, 2.2)
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat(
    "-Z", "Y"
).to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 4.5
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
bpy.context.scene.cycles.samples = 32
bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 900
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.world.color = (0.03, 0.04, 0.06)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
print(f"STACK_IRIS_BLEND={OUTPUT}")
