"""Élargit l'abat-jour de la suspension sans déplacer sa source lumineuse."""

import math

import bpy


PROFILE = (
    (0.11, -0.86),
    (0.18, -0.94),
    (0.27, -1.03),
    (0.44, -1.17),
    (0.65, -1.31),
    (0.74, -1.39),
    (0.735, -1.44),
    (0.695, -1.43),
    (0.45, -1.22),
    (0.25, -1.07),
    (0.14, -0.97),
    (0.10, -0.89),
)
SEGMENTS = 64


def reshape_shell():
    shell = bpy.data.objects["Shade / spun metal shell"]
    mesh = shell.data
    if len(mesh.vertices) != len(PROFILE) * SEGMENTS:
        raise RuntimeError("Profil de l'abat-jour inattendu")
    for row, (radius, height) in enumerate(PROFILE):
        for index in range(SEGMENTS):
            angle = math.tau * index / SEGMENTS
            mesh.vertices[row * SEGMENTS + index].co = (
                radius * math.cos(angle),
                radius * math.sin(angle),
                height,
            )
    mesh.update()


def resize_ring(name, target_radius, height):
    ring = bpy.data.objects[name]
    mesh = ring.data
    current_radius = sum(
        math.hypot(vertex.co.x, vertex.co.y) for vertex in mesh.vertices
    ) / len(mesh.vertices)
    delta = target_radius - current_radius
    for vertex in mesh.vertices:
        radius = math.hypot(vertex.co.x, vertex.co.y)
        vertex.co.x *= (radius + delta) / radius
        vertex.co.y *= (radius + delta) / radius
    mesh.update()
    ring.location.z = height


reshape_shell()
resize_ring("Shade / rolled brass lip", 0.725, -1.435)
resize_ring("Shade / fine lower seam", 0.685, -1.447)

# Le bord reste au-dessus du verre : la bobine et la source WebGL gardent
# exactement le même centre sous le réflecteur agrandi.
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
