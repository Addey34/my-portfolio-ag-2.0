"""Construit le pendentif fendu et quatre assemblages de stacks éditables."""

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "blender" / "ag_breakup.blend"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != "Collection":
        bpy.data.collections.remove(collection)

export = bpy.data.collections.new("WEB_EXPORT")
bpy.context.scene.collection.children.link(export)
studio = bpy.data.collections.new("STUDIO_RENDER_ONLY")
bpy.context.scene.collection.children.link(studio)


def metal(name, color, roughness, metallic=0.85, glow=0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if glow:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = glow
    return result


rhodium = metal("AG / polished rhodium", (0.78, 0.86, 0.91), 0.16)
titanium = metal("AG / satin titanium", (0.52, 0.59, 0.65), 0.3)
graphite = metal("AG / graphite recess", (0.055, 0.073, 0.1), 0.4)
accents = [
    metal("STACK / interface cobalt", (0.19, 0.46, 0.9), 0.24, glow=0.38),
    metal("STACK / interaction cyan", (0.12, 0.75, 0.83), 0.24, glow=0.38),
    metal("STACK / services violet", (0.62, 0.41, 0.88), 0.24, glow=0.38),
    metal("STACK / delivery amber", (0.93, 0.57, 0.22), 0.24, glow=0.38),
]


def empty(name, parent=None):
    result = bpy.data.objects.new(name, None)
    export.objects.link(result)
    result.parent = parent
    return result


def block(name, location, size, finish, parent, bevel=0.035):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    export.objects.link(obj)
    obj.name = name
    obj.parent = parent
    obj.location = location
    obj.dimensions = size
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(finish)
    if bevel:
        edge = obj.modifiers.new("Machined edge", "BEVEL")
        edge.width = bevel
        edge.segments = 3
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def arc(name, center, span, radius, tube, front, finish, parent):
    major = 22
    minor = 8
    vertices = []
    for step in range(major + 1):
        angle = center - span / 2 + span * step / major
        for side in range(minor):
            cross = math.tau * side / minor
            distance = radius + tube * math.cos(cross)
            vertices.append(
                (distance * math.cos(angle), front + tube * math.sin(cross),
                 distance * math.sin(angle))
            )
    faces = []
    for step in range(major):
        for side in range(minor):
            a = step * minor + side
            b = step * minor + (side + 1) % minor
            faces.append((a, b, b + minor, a + minor))
    faces.append(tuple(reversed(range(minor))))
    faces.append(tuple(major * minor + side for side in range(minor)))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    export.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(finish)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def bar(name, a, b, width, depth, finish, parent):
    middle = (Vector(a) + Vector(b)) / 2
    obj = block(name, middle, (width, depth, (Vector(b) - Vector(a)).length),
                finish, parent, width * 0.18)
    obj.rotation_euler = (Vector(b) - Vector(a)).to_track_quat("Z", "Y").to_euler()
    return obj


families = ["interface", "interaction", "services", "delivery"]
for index, family in enumerate(families):
    angle = math.pi / 4 + index * math.pi / 2
    pivot = empty(f"AG_BREAK / family {index + 1:02d} pivot")
    shell = empty(f"AG_BREAK / family {index + 1:02d} shell", pivot)
    module = empty(f"AG_BREAK / family {index + 1:02d} module", pivot)
    fragments = empty(f"AG_BREAK / family {index + 1:02d} fragments", pivot)
    # Les rayons reprennent les trois bagues visibles de pendant.blend.
    arc(f"AG_BREAK / rim {index + 1:02d}", angle, 1.52, 1.815, 0.083,
        -0.198, rhodium, shell)
    arc(f"AG_BREAK / groove {index + 1:02d}", angle, 1.52, 1.705, 0.025,
        -0.24, graphite, shell)
    arc(f"AG_BREAK / bead {index + 1:02d}", angle, 1.52, 1.655, 0.021,
        -0.265, titanium, shell)
    for fragment in range(3):
        arc(f"AG_BREAK / splinter {index + 1:02d} {fragment + 1:02d}",
            angle + (fragment - 1) * 0.37, 0.12 + fragment * 0.03,
            2.02 + (fragment % 2) * 0.15, 0.038, -0.16 - fragment * 0.04,
            rhodium if fragment == 1 else titanium, fragments)

    cx = 1.2 * math.cos(angle)
    cz = 1.2 * math.sin(angle)
    if family == "interface":
        block("MODULE / interface / display frame", (cx, -0.53, cz),
              (1.1, 0.13, 0.78), rhodium, module, 0.055)
        block("MODULE / interface / display glass", (cx, -0.605, cz),
              (0.97, 0.025, 0.65), graphite, module, 0.025)
        block("MODULE / interface / top bar", (cx, -0.63, cz + 0.23),
              (0.81, 0.012, 0.035), accents[index], module, 0.008)
        block("MODULE / interface / viewport", (cx - 0.18, -0.63, cz - 0.06),
              (0.43, 0.012, 0.34), accents[index], module, 0.018)
        for row in range(3):
            block(f"MODULE / interface / detail {row + 1}",
                  (cx + 0.22, -0.63, cz + 0.1 - row * 0.14),
                  (0.22, 0.012, 0.03), titanium, module, 0.008)
    elif family == "interaction":
        for orbit in range(3):
            orbit_obj = arc(f"MODULE / interaction / orbit {orbit + 1}",
                            angle + orbit * 0.13, 1.72, 0.39 + orbit * 0.17,
                            0.035, -0.56 - orbit * 0.04,
                            accents[index] if orbit == 1 else rhodium, module)
            orbit_obj.location.x = cx - 0.35 * math.cos(angle)
            orbit_obj.location.z = cz - 0.35 * math.sin(angle)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=0.32)
        core = bpy.context.object
        for old in list(core.users_collection):
            old.objects.unlink(core)
        export.objects.link(core)
        core.name = "MODULE / interaction / spatial core"
        core.parent = module
        core.location = (cx, -0.58, cz)
        core.data.materials.append(accents[index])
        block("MODULE / interaction / axis", (cx, -0.53, cz),
              (0.14, 0.3, 0.14), graphite, module)
    elif family == "services":
        node_points = [
            (cx - 0.42, cz + 0.28),
            (cx + 0.4, cz + 0.2),
            (cx - 0.08, cz - 0.38),
        ]
        for row, (x, z) in enumerate(node_points):
            bar(f"MODULE / services / connection {row + 1}",
                (cx, -0.53, cz), (x, -0.53, z), 0.055, 0.08,
                accents[index], module)
            block(f"MODULE / services / satellite {row + 1}",
                  (x, -0.58, z), (0.27, 0.16, 0.27), titanium, module)
            block(f"MODULE / services / signal {row + 1}",
                  (x, -0.67, z), (0.13, 0.01, 0.05),
                  accents[index], module, 0.008)
        block("MODULE / services / central hub", (cx, -0.57, cz),
              (0.45, 0.2, 0.42), rhodium, module)
        block("MODULE / services / hub light", (cx, -0.68, cz),
              (0.25, 0.012, 0.22), accents[index], module, 0.01)
    else:
        bar("MODULE / delivery / timeline", (cx - 0.48, -0.53, cz),
            (cx + 0.32, -0.53, cz), 0.11, 0.12, rhodium, module)
        for step in range(3):
            x = cx - 0.4 + step * 0.37
            block(f"MODULE / delivery / stage {step + 1}",
                  (x, -0.61, cz), (0.2, 0.13, 0.2),
                  accents[index] if step == 2 else titanium, module)
        bar("MODULE / delivery / arrow upper", (cx + 0.25, -0.57, cz),
            (cx + 0.52, -0.57, cz + 0.24), 0.1, 0.12,
            accents[index], module)
        bar("MODULE / delivery / arrow lower", (cx + 0.25, -0.57, cz),
            (cx + 0.52, -0.57, cz - 0.24), 0.1, 0.12,
            accents[index], module)


camera_data = bpy.data.cameras.new("Studio / camera")
camera = bpy.data.objects.new("Studio / camera", camera_data)
studio.objects.link(camera)
camera.location = (0, -7, 2)
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat(
    "-Z", "Y"
).to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 5.8
bpy.context.scene.camera = camera
for name, location, energy in [
    ("Studio / key", (-3, -4, 4), 700),
    ("Studio / fill", (3, -3, 0), 420),
]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = 3
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
bpy.context.scene.world.color = (0.02, 0.025, 0.045)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
print(f"AG_BREAKUP_BLEND={OUTPUT}")
