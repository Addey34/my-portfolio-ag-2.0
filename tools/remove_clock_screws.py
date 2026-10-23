"""Retire uniquement les anciennes vis saillantes du pourtour de l'horloge."""

import bpy


export = bpy.data.collections["WEB_EXPORT"]
removed = []
for obj in list(export.objects):
    if obj.name.startswith("Bezel screw /"):
        removed.append(obj.name)
        bpy.data.objects.remove(obj, do_unlink=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print("CLOCK_SCREWS_REMOVED=" + ",".join(removed))
