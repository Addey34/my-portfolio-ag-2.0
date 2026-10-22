"""Affine l'horloge existante sans reconstruire les pièces éditables."""

import math

import bpy


export = bpy.data.collections["WEB_EXPORT"]


def set_surface(name, color, metallic, roughness):
    mat = bpy.data.materials[name]
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    mat.diffuse_color = (*color, 1)
    return mat


def remove_existing(name):
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)


def ring(name, radius, thickness, y, material):
    remove_existing(name)
    bpy.ops.mesh.primitive_torus_add(
        major_segments=128,
        minor_segments=8,
        location=(0, y, 0),
        rotation=(math.pi / 2, 0, 0),
        major_radius=radius,
        minor_radius=thickness,
    )
    obj = bpy.context.object
    obj.name = name
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    export.objects.link(obj)
    obj.data.materials.append(material)
    return obj


enamel = set_surface("01 · cobalt enamel", (0.026, 0.073, 0.175), 0.48, 0.26)
set_surface("02 · midnight dial", (0.05, 0.105, 0.215), 0.13, 0.5)
steel = set_surface("03 · polished blue steel", (0.24, 0.49, 0.69), 0.65, 0.24)
silver = set_surface("04 · satin silver", (0.68, 0.83, 0.91), 0.56, 0.25)
set_surface("05 · luminous cyan", (0.34, 0.83, 0.95), 0.22, 0.25)
set_surface("07 · smoked crystal", (0.48, 0.74, 0.88), 0.04, 0.09)
numerals = set_surface("09 · luminous numerals", (0.89, 0.97, 1.0), 0.12, 0.37)
numeral_shader = numerals.node_tree.nodes.get("Principled BSDF")
numeral_shader.inputs["Emission Color"].default_value = (0.55, 0.82, 1.0, 1)
numeral_shader.inputs["Emission Strength"].default_value = 1.65
hour_metal = bpy.data.materials.get("11 · satin rhodium hour")
if not hour_metal:
    hour_metal = bpy.data.materials.new("11 · satin rhodium hour")
    hour_metal.use_nodes = True
set_surface("11 · satin rhodium hour", (0.78, 0.88, 0.93), 0.48, 0.24)
minute_metal = bpy.data.materials.get("12 · frosted ice minute")
if not minute_metal:
    minute_metal = bpy.data.materials.new("12 · frosted ice minute")
    minute_metal.use_nodes = True
set_surface("12 · frosted ice minute", (0.60, 0.91, 1.0), 0.34, 0.26)
second_metal = bpy.data.materials.get("13 · brushed copper seconds")
if not second_metal:
    second_metal = bpy.data.materials.new("13 · brushed copper seconds")
    second_metal.use_nodes = True
set_surface("13 · brushed copper seconds", (0.98, 0.63, 0.35), 0.55, 0.24)
for material, color, strength in (
    (hour_metal, (0.34, 0.44, 0.51, 1), 0.16),
    (minute_metal, (0.25, 0.62, 0.77, 1), 0.22),
    (second_metal, (0.55, 0.17, 0.07, 1), 0.14),
):
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Emission Color"].default_value = color
    shader.inputs["Emission Strength"].default_value = strength

glass = bpy.data.materials["07 · smoked crystal"]
glass_shader = glass.node_tree.nodes.get("Principled BSDF")
glass_shader.inputs["Alpha"].default_value = 0.075
glass_shader.inputs["IOR"].default_value = 1.45
glass_shader.inputs["Coat Weight"].default_value = 0.7
glass_shader.inputs["Coat Roughness"].default_value = 0.1

# Une texture radiale de très faible amplitude simule l'émail brossé.
# L'image reste empaquetée dans le .blend et part avec le GLB.
texture_name = "Dial / concentric brushing"
old_image = bpy.data.images.get(texture_name)
if old_image:
    bpy.data.images.remove(old_image, do_unlink=True)
size = 512
image = bpy.data.images.new(texture_name, width=size, height=size, alpha=True)
pixels = []
for row in range(size):
    v = (row + 0.5) / size * 2 - 1
    for column in range(size):
        u = (column + 0.5) / size * 2 - 1
        radius = math.hypot(u, v)
        angle = math.atan2(v, u)
        brush = math.sin(radius * 275 + math.sin(angle * 43) * 0.65) * 0.012
        grain = math.sin(column * 12.31 + row * 37.71) * 0.006
        tone = 1.0 - min(radius, 1) * 0.075 + brush + grain
        pixels.extend((0.05 * tone, 0.105 * tone, 0.215 * tone, 1.0))
image.pixels.foreach_set(pixels)
image.update()
image.pack()

face_material = bpy.data.materials.get("10 · brushed enamel face")
if not face_material:
    face_material = bpy.data.materials.new("10 · brushed enamel face")
face_material.use_nodes = True
face_shader = face_material.node_tree.nodes.get("Principled BSDF")
face_shader.inputs["Metallic"].default_value = 0.18
face_shader.inputs["Roughness"].default_value = 0.5
for node in list(face_material.node_tree.nodes):
    if node.type == "TEX_IMAGE":
        face_material.node_tree.nodes.remove(node)
texture_node = face_material.node_tree.nodes.new("ShaderNodeTexImage")
texture_node.image = image
face_material.node_tree.links.new(texture_node.outputs["Color"], face_shader.inputs["Base Color"])

remove_existing("Dial / brushed face")
radius = 1.48
segments = 128
vertices = [(0, -0.176, 0)]
vertices.extend(
    (radius * math.cos(math.tau * index / segments),
     -0.176,
     radius * math.sin(math.tau * index / segments))
    for index in range(segments)
)
faces = [(0, index + 1, (index + 1) % segments + 1) for index in range(segments)]
mesh = bpy.data.meshes.new("Dial / brushed face geometry")
mesh.from_pydata(vertices, [], faces)
mesh.update()
uv = mesh.uv_layers.new(name="Dial planar UV")
for polygon in mesh.polygons:
    for loop_index in polygon.loop_indices:
        vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
        uv.data[loop_index].uv = (vertex.x / radius * 0.5 + 0.5,
                                  vertex.z / radius * 0.5 + 0.5)
face = bpy.data.objects.new("Dial / brushed face", mesh)
export.objects.link(face)
face.data.materials.append(face_material)

font = bpy.data.fonts.get("Clock / legible numerals")
if not font:
    font = bpy.data.fonts.load("C:/Windows/Fonts/arialbd.ttf")
    font.name = "Clock / legible numerals"
for hour in range(1, 13):
    obj = bpy.data.objects[f"Dial numeral / {hour}"]
    obj.data.font = font
    obj.data.size = 0.195
    obj.data.extrude = 0.0015

# Les aiguilles principales se terminent en pointe et gardent une vraie
# épaisseur métallique. Les pivots nommés restent ceux pilotés par Three.js.
for hand_name, length, width, hand_material in (
    ("HAND_HOUR", 0.88, 0.11, hour_metal),
    ("HAND_MINUTE", 1.26, 0.058, minute_metal),
    ("HAND_SECOND", 1.04, 0.026, second_metal),
):
    name = hand_name + " / blade"
    remove_existing(name)
    tip = length
    outline = (
        (-width * 0.32, -0.13),
        (-width * 0.5, 0),
        (-width * 0.32, tip * 0.78),
        (0, tip),
        (width * 0.32, tip * 0.78),
        (width * 0.5, 0),
        (width * 0.32, -0.13),
    )
    vertices = [(x, y, z) for y in (-0.017, 0.017) for x, z in outline]
    count = len(outline)
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    faces.extend(
        (index, (index + 1) % count, (index + 1) % count + count, index + count)
        for index in range(count)
    )
    mesh = bpy.data.meshes.new(name + " / tapered geometry")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    export.objects.link(obj)
    obj.parent = bpy.data.objects[hand_name]
    obj.data.materials.append(hand_material)
    bevel = obj.modifiers.new("Bords polis", "BEVEL")
    bevel.width = 0.006
    bevel.segments = 3
    obj.modifiers.new("Normales pondérées", "WEIGHTED_NORMAL")

# Des cercles usinés concentriques gardent le cadran régulier à toute échelle.
ring("Bezel / inner machined seam", 1.655, 0.012, -0.192, enamel)
ring("Dial / fine radial border", 1.535, 0.006, -0.183, silver)
ring("Pinion / machined collar", 0.101, 0.009, -0.325, steel)

# Le pourtour reste parfaitement circulaire, sans vis saillantes.
for index in range(1, 5):
    remove_existing(f"Bezel screw / {index}")

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print("CLOCK_REFINED=" + bpy.data.filepath)
