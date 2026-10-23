"""Affine le pendentif existant sans reconstruire le reste de la scène."""

import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
export = bpy.data.collections.get("WEB_EXPORT")
if export is None or not bpy.data.filepath:
    raise RuntimeError("Ouvrir assets/blender/pendant.blend avec WEB_EXPORT.")

replace = {
    "PENDANT / welded top lug",
    "PENDANT / bail neck",
    "PENDANT / pierced bail",
}
for obj in list(export.objects):
    if obj.name in replace or obj.name.startswith("PENDANT / rear ") or obj.name.startswith(
        "PENDANT / hinge "
    ):
        bpy.data.objects.remove(obj, do_unlink=True)


def material(name, color, metallic, roughness):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return mat


titanium = material("PENDANT / satin titanium", (0.52, 0.59, 0.65), 0.88, 0.31)
silver = material("PENDANT / polished rhodium", (0.78, 0.86, 0.91), 0.88, 0.19)
graphite = material("PENDANT / graphite groove", (0.055, 0.073, 0.1), 0.7, 0.4)
rear = material("PENDANT / rear titanium", (0.28, 0.33, 0.39), 0.82, 0.35)


def move_to_export(obj):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    export.objects.link(obj)
    return obj


def bevel(obj, width, segments=3):
    modifier = obj.modifiers.new("Machined edge", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    obj.modifiers.new("Weighted surface normals", "WEIGHTED_NORMAL")


def cylinder(name, radius, depth, location, mat, vertices=128, edge=0.02):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=(math.pi / 2, 0, 0),
    )
    obj = move_to_export(bpy.context.object)
    obj.name = name
    obj.data.materials.append(mat)
    bevel(obj, edge)
    return obj


def ring(name, radius, tube, depth, height, mat):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=128,
        minor_segments=10,
        location=(0, depth, height),
        rotation=(math.pi / 2, 0, 0),
        major_radius=radius,
        minor_radius=tube,
    )
    obj = move_to_export(bpy.context.object)
    obj.name = name
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def box(name, location, size, mat, edge):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = move_to_export(bpy.context.object)
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bevel(obj, edge, 4)
    return obj


# Une vraie épaisseur et deux gorges rendent le revers visible pendant le pivot.
cylinder("PENDANT / rear inset plate", 1.61, 0.045, (0, 0.243, 0), rear, edge=0.032)
ring("PENDANT / rear outer rolled lip", 1.79, 0.047, 0.218, 0, titanium)
ring("PENDANT / rear machined groove", 1.47, 0.019, 0.274, 0, graphite)
ring("PENDANT / rear fine bevel", 1.42, 0.012, 0.274, 0, silver)

# Gravure peu profonde : l'orientation est lisible une fois le disque retourné.
glyph = bpy.data.curves.new("PENDANT / rear AG engraving", "FONT")
glyph.body = "AG"
glyph.align_x = "CENTER"
glyph.align_y = "CENTER"
glyph.size = 0.72
glyph.extrude = 0.0015
glyph.bevel_depth = 0.001
engraving = bpy.data.objects.new("PENDANT / rear AG engraving", glyph)
export.objects.link(engraving)
engraving.location = (0, 0.272, 0.1)
engraving.rotation_euler = (math.pi / 2, 0, math.pi)
glyph.materials.append(graphite)
box("PENDANT / rear maker line", (0, 0.271, -0.47), (0.45, 0.007, 0.014), graphite, 0.004)

# Le collet, l'axe traversant et la boucle forment une fixation crédible de profil.
box("PENDANT / welded top lug", (0, 0.005, 1.852), (0.39, 0.29, 0.27), titanium, 0.072)
cylinder(
    "PENDANT / hinge cross pin", 0.108, 0.35, (0, -0.01, 1.962), silver, 32, 0.012
)
ring("PENDANT / pierced bail", 0.183, 0.061, -0.018, 2.105, silver)


def packed_texture(name, normal=False):
    existing = bpy.data.images.get(name)
    if existing:
        bpy.data.images.remove(existing)
    size = 128
    image = bpy.data.images.new(name, width=size, height=size, alpha=True)
    pixels = [0.0] * (size * size * 4)
    seed = 173
    for y in range(size):
        for x in range(size):
            seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
            grain = ((seed >> 24) / 255 - 0.5) * 0.075
            brush = math.sin(y * 1.7 + math.sin(x * 0.12) * 0.2) * 0.008
            offset = (y * size + x) * 4
            if normal:
                pixels[offset : offset + 4] = (0.5, 0.5 + brush * 0.7, 1.0, 1)
            else:
                rough = max(0.18, min(0.53, 0.31 + grain + brush))
                pixels[offset : offset + 4] = (rough, rough, rough, 1)
    image.pixels.foreach_set(pixels)
    image.update()
    image.pack()
    image.colorspace_settings.name = "Non-Color"
    return image


roughness_image = packed_texture("PENDANT / brushed roughness")
normal_image = packed_texture("PENDANT / fine brushed normal", True)
for mat in (titanium, silver, rear):
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for node in list(nodes):
        if node.label.startswith("PENDANT_TEXTURE"):
            nodes.remove(node)
    shader = nodes.get("Principled BSDF")
    texture = nodes.new("ShaderNodeTexImage")
    texture.label = "PENDANT_TEXTURE roughness"
    texture.image = roughness_image
    texture.interpolation = "Linear"
    links.new(texture.outputs["Color"], shader.inputs["Roughness"])
    normals = nodes.new("ShaderNodeTexImage")
    normals.label = "PENDANT_TEXTURE normal"
    normals.image = normal_image
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.label = "PENDANT_TEXTURE normal strength"
    normal_map.inputs["Strength"].default_value = 0.07
    links.new(normals.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], shader.inputs["Normal"])

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print("PENDANT_REFINED=" + bpy.data.filepath)
