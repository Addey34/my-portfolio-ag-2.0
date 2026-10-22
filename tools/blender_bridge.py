"""Inspection, rendu et export reproductibles des scènes Blender du portfolio."""

import json
import os
import sys
from pathlib import Path

import bpy


def emit(data):
    print("BLENDER_BRIDGE_JSON=" + json.dumps(data, ensure_ascii=False, sort_keys=True))


def scene_summary():
    scene = bpy.context.scene
    objects = sorted(scene.objects, key=lambda obj: obj.name)
    missing_images = []
    for image in bpy.data.images:
        if image.source == "FILE" and image.filepath:
            path = bpy.path.abspath(image.filepath)
            if not os.path.isfile(path):
                missing_images.append({"image": image.name, "path": path})
    return {
        "file": bpy.data.filepath or None,
        "scene": scene.name,
        "camera": scene.camera.name if scene.camera else None,
        "objects": [
            {
                "name": obj.name,
                "type": obj.type,
                "materials": [slot.material.name for slot in obj.material_slots if slot.material],
            }
            for obj in objects
        ],
        "actions": sorted(action.name for action in bpy.data.actions),
        "collections": sorted(collection.name for collection in bpy.data.collections),
        "missing_images": missing_images,
        "render_engine": scene.render.engine,
    }


def main():
    args = sys.argv[sys.argv.index("--") + 1 :]
    action = args[0]
    if action == "doctor":
        emit({"blender": bpy.app.version_string, "python": sys.version.split()[0]})
        return

    if not bpy.data.filepath:
        raise RuntimeError("Aucun fichier .blend chargé.")

    if action == "inspect":
        emit(scene_summary())
        return

    output = Path(args[1])
    output.parent.mkdir(parents=True, exist_ok=True)
    if action == "export":
        if "WEB_EXPORT" not in bpy.data.collections:
            raise RuntimeError("Collection WEB_EXPORT absente du fichier .blend.")
        bpy.ops.export_scene.gltf(
            filepath=str(output),
            export_format="GLB",
            collection="WEB_EXPORT",
            export_cameras=False,
            export_lights=False,
        )
    elif action == "render":
        if bpy.context.scene.camera is None:
            raise RuntimeError("Aucune caméra active pour le rendu.")
        bpy.context.scene.render.filepath = str(output)
        bpy.context.scene.render.image_settings.file_format = "PNG"
        bpy.ops.render.render(write_still=True)
    else:
        raise ValueError(f"Action inconnue : {action}")
    emit({"action": action, "output": str(output), "bytes": output.stat().st_size})


if __name__ == "__main__":
    main()
