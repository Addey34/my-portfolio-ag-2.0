"""Construit les pièces éditables du pendentif AG autour du boîtier existant."""

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "blender" / "pendant.blend"

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


def metal(name, color, roughness):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = 0.88
    shader.inputs["Roughness"].default_value = roughness
    return material


titanium = metal("PENDANT / satin titanium", (0.52, 0.59, 0.65), 0.3)
silver = metal("PENDANT / polished rhodium", (0.78, 0.86, 0.91), 0.16)
shadow = metal("PENDANT / graphite groove", (0.055, 0.073, 0.1), 0.37)


def ring(name, radius, tube, depth, height, material):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=128,
        minor_segments=16,
        location=(0, depth, height),
        rotation=(math.pi / 2, 0, 0),
        major_radius=radius,
        minor_radius=tube,
    )
    obj = move_to(bpy.context.object, export)
    obj.name = name
    obj.data.materials.append(material)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def block(name, location, size, material, bevel_width):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = move_to(bpy.context.object, export)
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("Machined roundover", "BEVEL")
    bevel.width = bevel_width
    bevel.segments = 4
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


# Même centre et même diamètre que l'horloge : ces pièces se soudent visuellement
# à sa coque, sans créer un second disque qui cacherait les scènes suivantes.
ring("PENDANT / outer rhodium lip", 1.815, 0.083, -0.198, 0, silver)
ring("PENDANT / inset graphite groove", 1.705, 0.025, -0.24, 0, shadow)
ring("PENDANT / inner titanium bead", 1.655, 0.021, -0.265, 0, titanium)

# La petite bélière est réellement percée et chevauche le haut de la coque.
block("PENDANT / welded top lug", (0, 0.005, 1.856), (0.34, 0.25, 0.26), titanium, 0.065)
ring("PENDANT / pierced bail", 0.183, 0.057, -0.018, 2.105, silver)
block("PENDANT / bail neck", (0, -0.018, 1.961), (0.18, 0.16, 0.12), shadow, 0.035)


def area(name, location, energy, color, size):
    lamp_data = bpy.data.lights.new(name, "AREA")
    lamp_data.energy = energy
    lamp_data.color = color
    lamp_data.shape = "DISK"
    lamp_data.size = size
    lamp = bpy.data.objects.new(name, lamp_data)
    studio.objects.link(lamp)
    lamp.location = location
    lamp.rotation_euler = (Vector((0, 0, 0)) - lamp.location).to_track_quat(
        "-Z", "Y"
    ).to_euler()


area("Studio / broad key", (-3, -4, 4), 800, (0.76, 0.87, 1), 4)
area("Studio / side strip", (3, -2, 1), 650, (1, 0.92, 0.82), 2)
camera_data = bpy.data.cameras.new("Product camera")
camera = bpy.data.objects.new("Product camera", camera_data)
studio.objects.link(camera)
camera.location = (0, -8, 0.1)
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat(
    "-Z", "Y"
).to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 5.3
bpy.context.scene.camera = camera
bpy.context.scene.render.engine = "CYCLES"
bpy.context.scene.cycles.samples = 32
bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 900
bpy.context.scene.world.color = (0.018, 0.025, 0.06)
bpy.context.scene.view_settings.view_transform = "AgX"

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
print("PENDANT_SOURCE=" + str(OUTPUT))
