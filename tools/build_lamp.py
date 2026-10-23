"""Construit une suspension éditable pour éclairer l'horloge du héros."""

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "blender" / "lamp.blend"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

export = bpy.data.collections.new("WEB_EXPORT")
bpy.context.scene.collection.children.link(export)
studio = bpy.data.collections.new("STUDIO_RENDER_ONLY")
bpy.context.scene.collection.children.link(studio)
pivot = bpy.data.objects.new("LAMP_SWING", None)
export.objects.link(pivot)


def move_to(obj, collection):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    if collection == export:
        obj.parent = pivot
    return obj


def material(name, color, metallic=0, roughness=0.4, alpha=1, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, alpha)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Alpha"].default_value = alpha
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission[0], 1)
        shader.inputs["Emission Strength"].default_value = emission[1]
    if alpha < 1:
        mat.surface_render_method = "BLENDED"
    return mat


graphite = material("01 · graphite powder coat", (0.025, 0.039, 0.064), 0.72, 0.31)
outer = material("02 · cobalt enamel shade", (0.035, 0.10, 0.19), 0.65, 0.23)
inner = material("03 · warm porcelain reflector", (0.82, 0.69, 0.53), 0.34, 0.26)
brass = material("04 · brushed brass socket", (0.52, 0.37, 0.19), 0.77, 0.25)
cable = material("05 · black braided cable", (0.013, 0.017, 0.026), 0.02, 0.88)
glass = material("06 · warm bulb glass", (1.0, 0.92, 0.78), 0, 0.055, 0.12)
glass_shader = glass.node_tree.nodes.get("Principled BSDF")
glass_shader.inputs["IOR"].default_value = 1.45
glass_shader.inputs["Transmission Weight"].default_value = 0.9
glass_shader.inputs["Coat Weight"].default_value = 0.24
filament = material(
    "07 · glowing tungsten", (1.0, 0.43, 0.12), 0.28, 0.31,
    emission=((1.0, 0.48, 0.13), 7.0),
)
core = material(
    "08 · luminous bulb core", (1.0, 0.73, 0.43), 0, 0.4,
    emission=((1.0, 0.65, 0.28), 0.75),
)


def cylinder(name, radius, depth, z, surface, vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                        location=(0, 0, z))
    obj = move_to(bpy.context.object, export)
    obj.name = name
    obj.data.materials.append(surface)
    bevel = obj.modifiers.new("Arêtes usinées", "BEVEL")
    bevel.width = min(0.012, depth * 0.2)
    bevel.segments = 3
    obj.modifiers.new("Normales pondérées", "WEIGHTED_NORMAL")
    return obj


def ring(name, radius, thickness, z, surface):
    bpy.ops.mesh.primitive_torus_add(major_segments=64, minor_segments=12,
                                    major_radius=radius, minor_radius=thickness,
                                    location=(0, 0, z))
    obj = move_to(bpy.context.object, export)
    obj.name = name
    obj.data.materials.append(surface)
    return obj


def lathe(name, profile, surfaces, split=None):
    segments = 64
    verts = [
        (radius * math.cos(math.tau * index / segments),
         radius * math.sin(math.tau * index / segments), z)
        for radius, z in profile for index in range(segments)
    ]
    faces = []
    for row in range(len(profile) - 1):
        for index in range(segments):
            next_index = (index + 1) % segments
            faces.append((row * segments + index, row * segments + next_index,
                          (row + 1) * segments + next_index,
                          (row + 1) * segments + index))
    mesh = bpy.data.meshes.new(name + " / géométrie")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    export.objects.link(obj)
    obj.parent = pivot
    for surface in surfaces:
        mesh.materials.append(surface)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        if split is not None and polygon.index // segments >= split:
            polygon.material_index = 1
    return obj


def wire(name, points, radius, surface):
    curve = bpy.data.curves.new(name + " / courbe", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 24
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinates in zip(spline.points, points):
        point.co = (*coordinates, 1)
    obj = bpy.data.objects.new(name, curve)
    export.objects.link(obj)
    obj.parent = pivot
    obj.data.materials.append(surface)
    return obj


# Le pivot supérieur entraîne le câble, l'abat-jour, l'ampoule et la lumière WebGL.
cylinder("Canopy / ceiling rose", 0.16, 0.075, -0.035, graphite)
ring("Canopy / machined edge", 0.152, 0.008, -0.071, brass)
cylinder("Cable / upper strain relief", 0.047, 0.16, -0.15, graphite)
wire("Cable / braided core", [(0, 0, -0.14), (0, 0, -0.74)], 0.018, cable)
for index in range(3):
    phase = math.tau * index / 3
    points = [
        (0.018 * math.cos(phase + step * 0.34),
         0.018 * math.sin(phase + step * 0.34),
         -0.17 - step * 0.011)
        for step in range(50)
    ]
    wire(f"Cable / woven strand {index + 1}", points, 0.002, graphite)

cylinder("Shade / top ferrule", 0.115, 0.18, -0.78, graphite)
ring("Shade / brass neck", 0.118, 0.012, -0.88, brass)
lathe(
    "Shade / spun metal shell",
    [(.11, -.86), (.18, -.94), (.27, -1.03), (.44, -1.17),
     (.65, -1.31), (.74, -1.39), (.735, -1.44), (.695, -1.43),
     (.45, -1.22), (.25, -1.07), (.14, -.97), (.10, -.89)],
    [outer, inner], split=6,
)
ring("Shade / rolled brass lip", 0.725, 0.021, -1.435, brass)
ring("Shade / fine lower seam", 0.685, 0.006, -1.447, graphite)

cylinder("Socket / porcelain insulator", 0.12, 0.16, -1.13, inner)
cylinder("Socket / brass shell", 0.102, 0.25, -1.26, brass)
for index in range(3):
    ring(f"Socket / screw thread {index + 1}", 0.102, 0.008,
         -1.25 - index * 0.055, graphite)
cylinder("Bulb / metal base", 0.09, 0.14, -1.43, brass)
lathe(
    "Bulb / clear glass envelope",
    [(.045, -1.47), (.08, -1.50), (.12, -1.55), (.15, -1.61),
     (.17, -1.67), (.175, -1.72), (.17, -1.78), (.155, -1.84),
     (.13, -1.90), (.095, -1.95), (.05, -1.98), (.005, -1.99)],
    [glass],
)
cylinder("Bulb / glass stem", 0.023, 0.23, -1.67, glass, 24)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16,
                                     radius=0.007, location=(0, 0, -1.76))
glow = move_to(bpy.context.object, export)
glow.name = "Bulb / warm luminous core"
glow.data.materials.append(core)
wire("Filament / left support", [(-.065, 0, -1.59), (-.065, -.025, -1.76)],
     0.004, brass)
wire("Filament / right support", [(.065, 0, -1.59), (.065, -.025, -1.76)],
     0.004, brass)
wire(
    "Filament / glowing coil",
    [(-.065 + index * .13 / 87,
      -.025 + .011 * math.cos(index * math.tau * 10 / 87),
      -1.76 + .011 * math.sin(index * math.tau * 10 / 87))
     for index in range(88)],
    0.005, filament,
)


def area(name, location, power, color, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    studio.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, -1)) - obj.location).to_track_quat(
        "-Z", "Y"
    ).to_euler()


area("Studio / warm key", (-3, -4, 2), 650, (1.0, .77, .53), 4)
area("Studio / cool rim", (3, 2, 0), 800, (.45, .75, 1.0), 3)
camera_data = bpy.data.cameras.new("Product camera")
camera = bpy.data.objects.new("Product camera", camera_data)
studio.objects.link(camera)
camera.location = (2.4, -6, -1)
camera.rotation_euler = (Vector((0, 0, -1)) - camera.location).to_track_quat(
    "-Z", "Y"
).to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 3.5
bpy.context.scene.camera = camera
bpy.context.scene.render.engine = "CYCLES"
bpy.context.scene.cycles.samples = 64
bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 900
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.world.color = (0.025, 0.033, 0.055)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
print("LAMP_SOURCE=" + str(OUTPUT))
