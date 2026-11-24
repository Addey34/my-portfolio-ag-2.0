"""Atelier de fabrication Blender : profils tournés, engrenages, arcs et assemblages.

Complète `blender_kit.py` (matières, boîtes, studio) pour les objets du lot « maîtrise
visuelle » : Galaxy, Ludora et MagNotes. Les pièces sont construites en `bmesh` sans
opérateur de sélection, donc reproductibles en arrière-plan.

Convention des profils : liste de polylignes `[(r, z), ...]` parcourues dans le sens
anti-horaire autour de la section de la pièce (l'extérieur est à droite). Les points
d'une même polyligne partagent leurs sommets (surface lisse, congés) ; chaque jonction
entre deux polylignes reste une arête franche.
"""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector

import blender_kit as kit


def arc(cx, cz, radius, start, end, steps=5):
    """Arc de cercle (r, z) en degrés, pour les congés et les gorges."""
    return [
        (
            cx + radius * math.cos(math.radians(start + (end - start) * k / steps)),
            cz + radius * math.sin(math.radians(start + (end - start) * k / steps)),
        )
        for k in range(steps + 1)
    ]


def _link(obj, parent, mat):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    kit.export.objects.link(obj)
    obj.parent = parent
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def _bevel_normals(obj, bevel=0.0, segments=2):
    if bevel:
        modifier = obj.modifiers.new("Machined edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = segments
        modifier.limit_method = "ANGLE"
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def lathe(name, polylines, mat, parent, segments=64, location=(0, 0, 0), rotation=(0, 0, 0), sweep=360.0):
    """Pièce de révolution autour de l'axe Z local.

    `sweep` < 360 produit un arc ouvert (jambage, secteur). Les polylignes d'une même
    pièce restent séparées pour garder des arêtes nettes entre elles.
    """
    mesh = bpy.data.meshes.new(name)
    builder = bmesh.new()
    uv = builder.loops.layers.uv.new("UVMap")
    total = max(1, segments if sweep >= 360 else max(2, int(segments * sweep / 360)))
    steps = total if sweep >= 360 else total
    turn = math.radians(sweep)
    for line in polylines:
        lengths = [0.0]
        for a, b in zip(line, line[1:]):
            lengths.append(lengths[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
        span = lengths[-1] or 1.0
        rings = []
        columns = steps if sweep < 360 else steps
        for r, z in line:
            ring = []
            for j in range(columns + (1 if sweep < 360 else 0)):
                theta = turn * j / steps
                ring.append(builder.verts.new((r * math.cos(theta), r * math.sin(theta), z)))
            rings.append(ring)
        for i in range(len(line) - 1):
            # Les normales sortantes suivent (dz, -dr) pour un profil anti-horaire.
            for j in range(columns):
                j2 = (j + 1) % len(rings[i]) if sweep >= 360 else j + 1
                face_vertices = [rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j]]
                try:
                    face = builder.faces.new(face_vertices)
                except ValueError:
                    continue
                face.smooth = total > 8
                for loop, (jj, ii) in zip(face.loops, [(j, i), (j + 1, i), (j + 1, i + 1), (j, i + 1)]):
                    loop[uv].uv = (jj / steps, lengths[ii] / span)
    # Pour un profil anti-horaire, l'ordre des sommets donne la normale (dz, -dr) : sortante.
    builder.to_mesh(mesh)
    builder.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    return _bevel_normals(_link(obj, parent, mat))


def ring_section(name, radius, section, mat, parent, segments=96, location=(0, 0, 0), rotation=(0, 0, 0), sweep=360.0):
    """Anneau dont la section (dr, z) est donnée autour du rayon moyen."""
    profile = [(radius + dr, z) for dr, z in section]
    return lathe(name, [profile], mat, parent, segments, location, rotation, sweep)


def closed(points):
    """Ferme une polyligne (dernier point = premier) pour un solide de révolution."""
    return points if points[0] == points[-1] else [*points, points[0]]


def disc(name, radius, thickness, mat, parent, segments=64, chamfer=0.01, location=(0, 0, 0), rotation=(0, 0, 0)):
    """Disque plein à bords chanfreinés (profil anti-horaire)."""
    h = thickness / 2
    c = min(chamfer, h * 0.9, radius * 0.4)
    profile = [(0, -h), (radius - c, -h), (radius, -h + c), (radius, h - c), (radius - c, h), (0, h)]
    # Anti-horaire : bas vers la droite, puis le haut vers l'axe.
    return lathe(name, [profile], mat, parent, segments, location, rotation)


def gear(name, teeth, root, tip, thickness, mat, parent, bore=0.0, location=(0, 0, 0), rotation=(0, 0, 0), bevel=0.006, tooth_fill=0.5):
    """Engrenage à dents trapézoïdales, extrudé selon Z, avec alésage optionnel."""
    mesh = bpy.data.meshes.new(name)
    builder = bmesh.new()
    outline = []
    for k in range(teeth):
        base = math.tau * k / teeth
        pitch = math.tau / teeth
        w = pitch * tooth_fill
        for offset, radius in (
            (-w * 0.5, root),
            (-w * 0.28, tip),
            (w * 0.28, tip),
            (w * 0.5, root),
        ):
            angle = base + offset
            outline.append((radius * math.cos(angle), radius * math.sin(angle)))
    top = [builder.verts.new((x, y, thickness / 2)) for x, y in outline]
    bottom = [builder.verts.new((x, y, -thickness / 2)) for x, y in outline]
    count = len(outline)
    for k in range(count):
        k2 = (k + 1) % count
        builder.faces.new([bottom[k], bottom[k2], top[k2], top[k]])
    builder.faces.new(top)
    builder.faces.new(bottom[::-1])
    if bore:
        builder.normal_update()
    for face in builder.faces:
        face.smooth = False
    bmesh.ops.recalc_face_normals(builder, faces=builder.faces[:])
    builder.to_mesh(mesh)
    builder.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    if bore:
        cutter_mesh = bpy.data.meshes.new("bore")
        cutter = bmesh.new()
        bmesh.ops.create_cone(cutter, cap_ends=True, segments=32, radius1=bore, radius2=bore, depth=thickness * 3)
        cutter.to_mesh(cutter_mesh)
        cutter.free()
        cutter_obj = bpy.data.objects.new("bore", cutter_mesh)
        bpy.context.scene.collection.objects.link(cutter_obj)
        cutter_obj.location = obj.location
        cutter_obj.rotation_euler = obj.rotation_euler
        kit.cut(obj, cutter_obj)
    return _bevel_normals(_link(obj, parent, mat), bevel, 1)


def tapered_bar(name, start, end, width_start, width_end, depth, mat, parent, bevel=0.01):
    """Bras effilé entre deux points 3D : jambes de support et leviers."""
    a, b = Vector(start), Vector(end)
    axis = b - a
    length = axis.length
    mesh = bpy.data.meshes.new(name)
    builder = bmesh.new()
    verts = []
    for sign_w, sign_d in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
        verts.append(builder.verts.new((sign_w * width_start / 2, sign_d * depth / 2, 0)))
    for sign_w, sign_d in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
        verts.append(builder.verts.new((sign_w * width_end / 2, sign_d * depth / 2, length)))
    for i in range(4):
        j = (i + 1) % 4
        builder.faces.new([verts[i], verts[j], verts[j + 4], verts[i + 4]])
    builder.faces.new(verts[:4][::-1])
    builder.faces.new(verts[4:])
    bmesh.ops.recalc_face_normals(builder, faces=builder.faces[:])
    builder.to_mesh(mesh)
    builder.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = a
    obj.rotation_euler = axis.to_track_quat("Z", "Y").to_euler()
    return _bevel_normals(_link(obj, parent, mat), bevel, 2)


def bolt_head(name, location, parent, mat, radius=0.04, height=0.026, rotation=(math.pi / 2, 0, 0)):
    """Tête de vis hexagonale sur collerette, posée sur une face (axe Z local tourné)."""
    flange = [(0, 0), (radius * 1.3, 0), (radius * 1.3, height * 0.3), (radius * 1.08, height * 0.36), (0, height * 0.36)]
    lathe(name + " flange", [flange], mat, parent, 20, location, rotation)
    head = lathe(
        name,
        [[(0, height * 0.3), (radius, height * 0.3), (radius * 0.96, height), (0, height)]],
        mat,
        parent,
        6,
        location,
        rotation,
    )
    return head


def pin(name, radius, length, location, mat, parent, rotation=(0, math.pi / 2, 0), cap=True):
    """Axe à épaulements et tête bombée : tourillons et goupilles."""
    h = length / 2
    profile = [
        (0, -h),
        (radius * 0.8, -h),
        (radius * 0.8, -h + length * 0.06),
        (radius, -h + length * 0.1),
        (radius, h - length * 0.1),
        (radius * 1.35, h - length * 0.1),
        (radius * 1.35, h - length * 0.02),
        (radius * 0.9, h),
        (0, h),
    ]
    if not cap:
        profile = [(0, -h), (radius, -h), (radius, h), (0, h)]
    return lathe(name, [profile], mat, parent, 14, location, rotation)


def ticks(name, radius, count, length, width, height, mat, parent, major_every=5, major_scale=1.8, plane="xy", location=(0, 0, 0), rotation=(0, 0, 0)):
    """Graduations radiales fusionnées en un seul objet (décoratives, non scientifiques)."""
    mesh = bpy.data.meshes.new(name)
    builder = bmesh.new()
    for k in range(count):
        angle = math.tau * k / count
        major = k % major_every == 0
        long_ = length * (major_scale if major else 1.0)
        thick = height * (1.25 if major else 1.0)
        cx, cy = radius * math.cos(angle), radius * math.sin(angle)
        ux, uy = math.cos(angle), math.sin(angle)
        vx, vy = -math.sin(angle), math.cos(angle)
        corners = []
        for du, dv in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
            corners.append((cx + ux * du * long_ / 2 + vx * dv * width / 2, cy + uy * du * long_ / 2 + vy * dv * width / 2))
        lower = [builder.verts.new((x, y, -thick / 2)) for x, y in corners]
        upper = [builder.verts.new((x, y, thick / 2)) for x, y in corners]
        for i in range(4):
            j = (i + 1) % 4
            builder.faces.new([lower[i], lower[j], upper[j], upper[i]])
        builder.faces.new(lower[::-1])
        builder.faces.new(upper)
    bmesh.ops.recalc_face_normals(builder, faces=builder.faces[:])
    builder.to_mesh(mesh)
    builder.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    return _bevel_normals(_link(obj, parent, mat))


def hex_pad(name, radius, thickness, chamfer, mat, parent, location=(0, 0, 0)):
    """Plot hexagonal chanfreiné en révolution à six pans : très peu de triangles."""
    h = thickness / 2
    c = min(chamfer, h * 0.9)
    profile = [(0, -h), (radius - c, -h), (radius, -h + c), (radius, h - c), (radius - c, h), (0, h)]
    return lathe(name, [profile], mat, parent, 6, location, (0, 0, math.pi / 6))


def join_by_material(pivot, small=0.22):
    """Fusionne les enfants de même matière d'un pivot, après application des modificateurs.

    Les chanfreins des petites pièces passent à un segment : même arête usinée visible,
    mais une fraction des triangles.
    """
    groups = {}
    for obj in list(pivot.children):
        if obj.type == "MESH" and obj.active_material:
            groups.setdefault(obj.active_material.name, []).append(obj)
    for objects in groups.values():
        for obj in objects:
            bpy.context.view_layer.objects.active = obj
            for modifier in list(obj.modifiers):
                if modifier.type == "BEVEL" and max(obj.dimensions) < small:
                    modifier.segments = 1
                bpy.ops.object.modifier_apply(modifier=modifier.name)
        if len(objects) > 1:
            bpy.ops.object.select_all(action="DESELECT")
            for obj in objects:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = objects[0]
            bpy.ops.object.join()


def detail_materials(prefix):
    """Matières complémentaires : acier bruni, émail, cuir, verre."""
    return {
        "steel": kit.material(f"{prefix} / blued steel", (0.1, 0.13, 0.2), 0.95, 0.3),
        "enamel": kit.material(f"{prefix} / indigo enamel", (0.035, 0.065, 0.16), 0.5, 0.36),
        "leather": kit.material(f"{prefix} / oiled leather", (0.075, 0.05, 0.06), 0.0, 0.62),
        "ivory": kit.material(f"{prefix} / ivory", (0.87, 0.82, 0.7), 0.05, 0.7),
        "gem": kit.material(f"{prefix} / lens glass", (0.5, 0.75, 0.95), 0.0, 0.08, None, 0.0, 0.55),
    }
