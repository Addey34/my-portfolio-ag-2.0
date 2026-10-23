"""Construit l'horloge éditable du héros et sa scène de présentation."""

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "blender" / "clock.blend"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != "Collection":
        bpy.data.collections.remove(collection)

export = bpy.data.collections.new("WEB_EXPORT")
bpy.context.scene.collection.children.link(export)
studio = bpy.data.collections.new("STUDIO_RENDER_ONLY")
bpy.context.scene.collection.children.link(studio)


def move_to(obj, collection):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def material(name, color, metallic=0.0, roughness=0.4, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, alpha)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*color, 1)
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Alpha"].default_value = alpha
    if alpha < 1:
        mat.surface_render_method = "BLENDED"
    return mat


navy = material("01 · cobalt enamel", (0.016, 0.046, 0.14), 0.62, 0.27)
dial = material("02 · midnight dial", (0.012, 0.029, 0.079), 0.28, 0.55)
steel = material("03 · polished blue steel", (0.18, 0.45, 0.68), 0.83, 0.23)
silver = material("04 · satin silver", (0.56, 0.76, 0.85), 0.74, 0.31)
cyan = material("05 · luminous cyan", (0.28, 0.76, 0.87), 0.3, 0.28)
amber = material("06 · amber seconds", (0.95, 0.47, 0.16), 0.55, 0.26)
glass = material("07 · smoked crystal", (0.42, 0.7, 0.87), 0.12, 0.12, 0.055)
black = material("08 · dark recess", (0.004, 0.012, 0.037), 0.1, 0.7)
numerals = material("09 · luminous numerals", (0.82, 0.94, 1.0), 0.28, 0.43)
numeral_shader = numerals.node_tree.nodes.get("Principled BSDF")
numeral_shader.inputs["Emission Color"].default_value = (0.38, 0.72, 0.9, 1)
numeral_shader.inputs["Emission Strength"].default_value = 1.0


def bevel(obj, width=0.025, segments=3):
    modifier = obj.modifiers.new("Soft machined edges", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
    return obj


def cylinder(name, radius, depth, y, mat, vertices=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                        location=(0, y, 0), rotation=(math.pi / 2, 0, 0))
    obj = move_to(bpy.context.object, export)
    obj.name = name
    obj.data.materials.append(mat)
    bevel(obj, min(0.035, depth * 0.22))
    return obj


def ring(name, major, minor, y, mat):
    bpy.ops.mesh.primitive_torus_add(major_segments=96, minor_segments=12,
                                    location=(0, y, 0), rotation=(math.pi / 2, 0, 0),
                                    major_radius=major, minor_radius=minor)
    obj = move_to(bpy.context.object, export)
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def box(name, location, scale, mat, edge=0.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = move_to(bpy.context.object, export)
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bevel(obj, edge, 2)
    return obj


# Axe Y : le négatif regarde le visiteur. L'export glTF le convertit en +Z Three.js.
cylinder("Case / cobalt body", 1.87, 0.30, 0.025, navy)
cylinder("Back / dark steel", 1.73, 0.035, 0.194, black)
cylinder("Dial / recessed enamel", 1.70, 0.043, -0.151, dial)
ring("Bezel / outer polished edge", 1.79, 0.065, -0.145, silver)
ring("Bezel / cyan inner lip", 1.685, 0.018, -0.18, cyan)
ring("Dial / circular minute track", 1.50, 0.009, -0.18, steel)
ring("Crystal / fine perimeter", 1.62, 0.015, -0.257, silver)

for index in range(60):
    angle = 2 * math.pi * index / 60
    major = index % 5 == 0
    length = 0.17 if major else 0.065
    radius = 1.35 if major else 1.42
    tick = box("Index / %02d" % index,
               (math.sin(angle) * radius, -0.191, math.cos(angle) * radius),
               (0.032 if major else 0.012, 0.018, length),
               cyan if major else silver, 0.004)
    tick.rotation_euler[1] = angle

for hour in range(1, 13):
    angle = 2 * math.pi * hour / 12
    value = str(hour)
    x = math.sin(angle) * 1.09
    z = math.cos(angle) * 1.09
    curve = bpy.data.curves.new("Numeral %s" % value, "FONT")
    curve.body = value
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = 0.155
    curve.extrude = 0.001
    obj = bpy.data.objects.new("Dial numeral / %s" % value, curve)
    export.objects.link(obj)
    obj.location = (x, -0.207, z)
    obj.rotation_euler[0] = math.pi / 2
    obj.data.materials.append(numerals)

box("Signature / cyan bar", (0, -0.205, 0.64), (0.31, 0.012, 0.018), cyan, 0.006)
box("Signature / amber bar", (0, -0.205, 0.59), (0.13, 0.012, 0.012), amber, 0.004)

# Ces trois noms sont utilisés par Three.js pour régler l'heure locale.
for name, length, width, y, mat in [
    ("HAND_HOUR", 0.93, 0.105, -0.245, silver),
    ("HAND_MINUTE", 1.28, 0.071, -0.271, cyan),
    ("HAND_SECOND", 1.44, 0.027, -0.301, amber),
]:
    pivot = bpy.data.objects.new(name, None)
    export.objects.link(pivot)
    pivot.location = (0, y, 0)
    blade = box(name + " / blade", (0, y, length * 0.43),
                (width, 0.027, length), mat, 0.012)
    counterweight = box(name + " / counterweight", (0, y, -0.18),
                        (width * 0.7, 0.028, 0.35), mat, 0.009)
    for part in (blade, counterweight):
        world_matrix = part.matrix_world.copy()
        part.parent = pivot
        part.matrix_world = world_matrix
    pivot.rotation_euler[1] = math.radians({
        "HAND_HOUR": -55,
        "HAND_MINUTE": 60,
        "HAND_SECOND": 210,
    }[name])

cylinder("Pinion / dark bearing", 0.084, 0.055, -0.314, black, 32)
cylinder("Pinion / silver cap", 0.052, 0.025, -0.355, silver, 32)
cylinder("Crystal / smoked glass", 1.60, 0.008, -0.381, glass)
ring("Crystal / highlight rim", 1.55, 0.005, -0.389, silver)


def area(name, location, power, color, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    studio.objects.link(obj)
    obj.location = location
    direction = Vector((0, 0, 0)) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


area("Key / cool softbox", (-3, -4, 5), 750, (0.65, 0.84, 1.0), 5)
area("Rim / cyan", (3, 1, 2), 900, (0.22, 0.72, 1.0), 3)
area("Fill / amber", (2, -4, -3), 460, (1.0, 0.59, 0.31), 4)
camera_data = bpy.data.cameras.new("Product camera")
camera = bpy.data.objects.new("Product camera", camera_data)
studio.objects.link(camera)
camera.location = (0, -8, 0.3)
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 5.1
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.world.color = (0.018, 0.025, 0.06)
scene.view_settings.view_transform = "AgX"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
print("CLOCK_SOURCE=" + str(OUTPUT))
