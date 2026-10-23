"""Copie les vraies pièces de l'horloge dans quatre ensembles éclatables."""

import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "blender" / "clock.blend"
OUTPUT = ROOT / "assets" / "blender" / "clock_breakup.blend"

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
source = bpy.data.collections["WEB_EXPORT"]
originals = list(source.objects)
world_matrices = {obj.name: obj.matrix_world.copy() for obj in originals}
export = bpy.data.collections.new("CLOCK_BREAK_EXPORT")
bpy.context.scene.collection.children.link(export)

families = ["interface", "interaction", "services", "delivery"]
pivots = []
for index, family in enumerate(families):
    pivot = bpy.data.objects.new(f"CLOCK_BREAK / {index + 1:02d} {family} pivot", None)
    export.objects.link(pivot)
    pivots.append(pivot)
mechanism = bpy.data.objects.new("CLOCK_BREAK / mechanism pivot", None)
export.objects.link(mechanism)
mechanism.parent = pivots[2]


def family_for(name):
    if name.startswith("Crystal / ") or name.startswith("Bezel / "):
        return 0
    if name.startswith("HAND_") or name.startswith("Pinion / "):
        return 1
    if name.startswith("Dial / ") or name.startswith("Dial numeral / "):
        return 2
    if name.startswith("Index / "):
        return int(name.rsplit(" ", 1)[1]) % 4
    return 3


for original in originals:
    if original.type not in {"MESH", "FONT"}:
        continue
    index = family_for(original.name)
    copy = original.copy()
    copy.data = original.data.copy()
    copy.name = f"CLOCK_BREAK / {families[index]} / {original.name}"
    export.objects.link(copy)
    copy.parent = pivots[index]
    copy.matrix_world = world_matrices[original.name]
    if original.type == "FONT":
        bpy.ops.object.select_all(action="DESELECT")
        copy.select_set(True)
        bpy.context.view_layer.objects.active = copy
        bpy.ops.object.convert(target="MESH")


steel = bpy.data.materials.new("CLOCK_BREAK / polished gear steel")
steel.diffuse_color = (0.57, 0.67, 0.76, 1)
steel.use_nodes = True
steel_shader = steel.node_tree.nodes.get("Principled BSDF")
steel_shader.inputs["Base Color"].default_value = steel.diffuse_color
steel_shader.inputs["Metallic"].default_value = 0.88
steel_shader.inputs["Roughness"].default_value = 0.26

violet = bpy.data.materials.new("CLOCK_BREAK / mechanism violet")
violet.diffuse_color = (0.52, 0.36, 0.77, 1)
violet.use_nodes = True
violet_shader = violet.node_tree.nodes.get("Principled BSDF")
violet_shader.inputs["Base Color"].default_value = violet.diffuse_color
violet_shader.inputs["Metallic"].default_value = 0.7
violet_shader.inputs["Roughness"].default_value = 0.32
violet_shader.inputs["Emission Color"].default_value = (0.12, 0.06, 0.24, 1)
violet_shader.inputs["Emission Strength"].default_value = 0.28


def move_into_export(obj, parent):
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    export.objects.link(obj)
    obj.parent = parent


def gear(name, x, z, radius, teeth):
    # Le mouvement est caché derrière le cadran assemblé et apparaît à l'éclatement.
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=0.09)
    wheel = bpy.context.object
    move_into_export(wheel, mechanism)
    wheel.name = f"CLOCK_BREAK / mechanism / {name} wheel"
    wheel.location = (x, 0.19, z)
    wheel.rotation_euler.x = math.pi / 2
    wheel.data.materials.append(steel)
    bevel = wheel.modifiers.new("Machined bevel", "BEVEL")
    bevel.width = 0.025
    bevel.segments = 2
    wheel.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius * 0.25, depth=0.12)
    hub = bpy.context.object
    move_into_export(hub, mechanism)
    hub.name = f"CLOCK_BREAK / mechanism / {name} hub"
    hub.location = (x, 0.11, z)
    hub.rotation_euler.x = math.pi / 2
    hub.data.materials.append(violet)
    for tooth in range(teeth):
        angle = tooth * math.tau / teeth
        bpy.ops.mesh.primitive_cube_add(size=1)
        piece = bpy.context.object
        move_into_export(piece, mechanism)
        piece.name = f"CLOCK_BREAK / mechanism / {name} tooth {tooth + 1:02d}"
        piece.location = (
            x + radius * 0.96 * math.cos(angle),
            0.19,
            z + radius * 0.96 * math.sin(angle),
        )
        piece.dimensions = (radius * 0.18, 0.09, radius * 0.22)
        piece.rotation_euler.y = -angle
        piece.data.materials.append(steel)


gear("drive", -0.58, 0.34, 0.46, 12)
gear("transfer", 0.41, 0.12, 0.35, 10)
gear("escapement", -0.12, -0.63, 0.25, 8)

for original in originals:
    bpy.data.objects.remove(original, do_unlink=True)
bpy.data.collections.remove(source)
export.name = "WEB_EXPORT"
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
print(f"CLOCK_BREAKUP_BLEND={OUTPUT}")
