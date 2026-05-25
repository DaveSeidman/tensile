bl_info = {
    "name": "Twister Blinds Controls",
    "author": "Codex",
    "version": (0, 1, 0),
    "blender": (3, 6, 0),
    "location": "View3D > Sidebar > Twister Blinds",
    "description": "Controls segmented twisting blind strips and animation presets.",
    "category": "Animation",
}

import math

import bpy
from bpy.app.handlers import persistent


MAX_STRIPS = 60
DEFAULT_STRIPS = 18
STRIP_WIDTH = 2.0 / 12.0
STRIP_HEIGHT = 4.0
STRIP_DEPTH = 0.035
VERTICAL_SEGMENTS = 192
GAP = 0.5 / 12.0
CENTER_SPACING = STRIP_WIDTH + GAP
PANEL_CATEGORY = "Twister Blinds"
COLLECTION_NAME = "vertical_blinds_concept_2in_x_4ft"
MATERIAL_NAMES = (
    "PBR_off_white_tensioned_rubber_satin",
    "warm_white_satin_blind_material",
)


def strip_name(index):
    return f"closed_vertical_blind_strip_{index:02d}"


def get_blind_material():
    for name in MATERIAL_NAMES:
        mat = bpy.data.materials.get(name)
        if mat:
            return mat

    mat = bpy.data.materials.new(MATERIAL_NAMES[0])
    mat.diffuse_color = (0.82, 0.80, 0.73, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = (0.82, 0.80, 0.73, 1.0)
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = 0.38
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def get_collection():
    collection = bpy.data.collections.get(COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(COLLECTION_NAME)
        bpy.context.scene.collection.children.link(collection)
    return collection


def active_count(scene):
    return max(1, min(MAX_STRIPS, int(getattr(scene, "twister_strip_count", DEFAULT_STRIPS))))


def build_twisted_mesh(turns):
    verts = []
    faces = []
    half_w = STRIP_WIDTH / 2.0
    half_d = STRIP_DEPTH / 2.0
    corners = [
        (-half_w, -half_d),
        (half_w, -half_d),
        (half_w, half_d),
        (-half_w, half_d),
    ]
    bottom_angle = -math.pi * turns
    top_angle = math.pi * turns

    for j in range(VERTICAL_SEGMENTS + 1):
        t = j / VERTICAL_SEGMENTS
        z = -STRIP_HEIGHT / 2.0 + STRIP_HEIGHT * t
        angle = bottom_angle + (top_angle - bottom_angle) * t
        ca = math.cos(angle)
        sa = math.sin(angle)
        for x, y in corners:
            verts.append((x * ca - y * sa, x * sa + y * ca, z))

    for j in range(VERTICAL_SEGMENTS):
        a = j * 4
        b = (j + 1) * 4
        faces.extend(
            [
                (a + 0, a + 1, b + 1, b + 0),
                (a + 1, a + 2, b + 2, b + 1),
                (a + 2, a + 3, b + 3, b + 2),
                (a + 3, a + 0, b + 0, b + 3),
            ]
        )
    faces.append((0, 1, 2, 3))
    top = VERTICAL_SEGMENTS * 4
    faces.append((top + 3, top + 2, top + 1, top + 0))
    return verts, faces


def make_or_get_strip(index):
    obj = bpy.data.objects.get(strip_name(index))
    if obj is not None:
        return obj

    mesh = bpy.data.meshes.new(strip_name(index) + "_mesh")
    obj = bpy.data.objects.new(strip_name(index), mesh)
    get_collection().objects.link(obj)
    obj.location.z = STRIP_HEIGHT / 2.0
    obj.data.materials.append(get_blind_material())
    return obj


def apply_turn_to_strip(index, turns):
    obj = make_or_get_strip(index)
    last = obj.get("_twister_last_applied_turns")
    if last is not None and abs(float(last) - float(turns)) < 0.0001:
        return obj

    verts, faces = build_twisted_mesh(float(turns))
    old_mesh = obj.data
    mesh = bpy.data.meshes.new(f"{strip_name(index)}_twisted_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    for material in old_mesh.materials:
        mesh.materials.append(material)
    if not mesh.materials:
        mesh.materials.append(get_blind_material())

    obj.data = mesh
    obj["_twister_last_applied_turns"] = float(turns)
    obj["turns"] = float(turns)
    obj["top_motor_turns"] = float(turns) / 2.0
    obj["bottom_motor_turns"] = -float(turns) / 2.0
    obj["image_column_index"] = index - 1

    if old_mesh.users == 0:
        try:
            bpy.data.meshes.remove(old_mesh)
        except RuntimeError:
            pass

    if not obj.modifiers.get("small_soft_edge_bevel"):
        bevel = obj.modifiers.new("small_soft_edge_bevel", "BEVEL")
        bevel.width = 0.003
        bevel.segments = 1
    if not obj.modifiers.get("weighted_edge_normals"):
        obj.modifiers.new("weighted_edge_normals", "WEIGHTED_NORMAL")
    return obj


def apply_all_turns(scene):
    count = active_count(scene)
    start_x = -((count - 1) * CENTER_SPACING) / 2.0

    for i in range(1, count + 1):
        turns = getattr(scene, f"twister_turn_{i:02d}", 0.0)
        obj = apply_turn_to_strip(i, turns)
        obj.location.x = start_x + (i - 1) * CENTER_SPACING
        obj.location.y = 0.0
        obj.location.z = STRIP_HEIGHT / 2.0
        obj.hide_viewport = False
        obj.hide_render = False

    for i in range(count + 1, MAX_STRIPS + 1):
        obj = bpy.data.objects.get(strip_name(i))
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)


def update_turn(self, context):
    if context and context.scene:
        apply_all_turns(context.scene)


def update_count(self, context):
    if context and context.scene:
        apply_all_turns(context.scene)


@persistent
def twister_frame_change_handler(scene):
    apply_all_turns(scene)


class TWISTER_OT_apply_current_turns(bpy.types.Operator):
    bl_idname = "twister.apply_current_turns"
    bl_label = "Apply Current Turns"

    def execute(self, context):
        apply_all_turns(context.scene)
        return {"FINISHED"}


class TWISTER_OT_keyframe_current_turns(bpy.types.Operator):
    bl_idname = "twister.keyframe_current_turns"
    bl_label = "Keyframe Current Settings"
    bl_description = "Keyframe strip count and all visible turn sliders at the current frame"

    def execute(self, context):
        scene = context.scene
        frame = scene.frame_current
        count = active_count(scene)
        scene.keyframe_insert(data_path="twister_strip_count", frame=frame)
        for i in range(1, count + 1):
            scene.keyframe_insert(data_path=f"twister_turn_{i:02d}", frame=frame)
        apply_all_turns(scene)
        self.report({"INFO"}, f"Keyframed {count} strip sliders at frame {frame}")
        return {"FINISHED"}


class TWISTER_OT_reset_turns(bpy.types.Operator):
    bl_idname = "twister.reset_turns"
    bl_label = "Reset All To Flat"

    def execute(self, context):
        for i in range(1, active_count(context.scene) + 1):
            setattr(context.scene, f"twister_turn_{i:02d}", 0.0)
        apply_all_turns(context.scene)
        return {"FINISHED"}


class TWISTER_OT_animate_to_current_turns(bpy.types.Operator):
    bl_idname = "twister.animate_to_current_turns"
    bl_label = "Animate Flat To Slider Values"

    def execute(self, context):
        scene = context.scene
        count = active_count(scene)
        start = scene.frame_current
        end = start + scene.twister_animation_frames
        targets = [float(getattr(scene, f"twister_turn_{i:02d}", 0.0)) for i in range(1, count + 1)]

        scene.frame_set(start)
        for i in range(1, count + 1):
            prop = f"twister_turn_{i:02d}"
            setattr(scene, prop, 0.0)
            scene.keyframe_insert(data_path=prop, frame=start)

        scene.frame_set(end)
        for i, target in enumerate(targets, start=1):
            prop = f"twister_turn_{i:02d}"
            setattr(scene, prop, target)
            scene.keyframe_insert(data_path=prop, frame=end)

        scene.frame_start = start
        scene.frame_end = end
        scene.frame_set(start)
        apply_all_turns(scene)
        return {"FINISHED"}


class TWISTER_OT_sequence_one_by_one(bpy.types.Operator):
    bl_idname = "twister.sequence_one_by_one"
    bl_label = "Sequence: One By One Twist"
    bl_description = "300-frame wave: each strip twists 0 to 4 turns and back, with overlap"

    def execute(self, context):
        scene = context.scene
        count = active_count(scene)
        start = scene.frame_current
        total_frames = 300
        peak_turns = 4.0
        duration = 40
        overlap = 18
        step = max(1, duration - overlap)

        scene.frame_start = start
        scene.frame_end = start + total_frames

        for i in range(1, count + 1):
            prop = f"twister_turn_{i:02d}"
            strip_start = start + (i - 1) * step
            strip_peak = strip_start + duration // 2
            strip_end = strip_start + duration

            keyframes = [
                (start, 0.0),
                (strip_start, 0.0),
                (strip_peak, peak_turns),
                (strip_end, 0.0),
                (start + total_frames, 0.0),
            ]
            for frame, value in keyframes:
                frame = min(start + total_frames, max(start, int(frame)))
                setattr(scene, prop, value)
                scene.keyframe_insert(data_path=prop, frame=frame)

        for i in range(count + 1, MAX_STRIPS + 1):
            prop = f"twister_turn_{i:02d}"
            if hasattr(scene, prop):
                setattr(scene, prop, 0.0)

        scene.frame_set(start)
        apply_all_turns(scene)

        action = scene.animation_data.action if scene.animation_data else None
        if action:
            for fc in action.fcurves:
                if fc.data_path.startswith("twister_turn_"):
                    for key in fc.keyframe_points:
                        key.interpolation = "BEZIER"

        self.report({"INFO"}, f"Created {total_frames}-frame one-by-one twist sequence for {count} strips")
        return {"FINISHED"}


class TWISTER_OT_open_turns_dialog(bpy.types.Operator):
    bl_idname = "twister.open_turns_dialog"
    bl_label = "Blind Turn Sliders"

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=500)

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        layout.prop(scene, "twister_strip_count", slider=True)
        layout.operator("twister.keyframe_current_turns", icon="KEY_HLT")
        layout.operator("twister.sequence_one_by_one")
        for i in range(1, active_count(scene) + 1):
            layout.prop(scene, f"twister_turn_{i:02d}", slider=True)
        layout.separator()
        layout.prop(scene, "twister_animation_frames")

    def execute(self, context):
        apply_all_turns(context.scene)
        return {"FINISHED"}


class TWISTER_PT_blind_controls(bpy.types.Panel):
    bl_label = "Blind Twist Controls"
    bl_idname = "TWISTER_PT_blind_controls"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = PANEL_CATEGORY

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        layout.prop(scene, "twister_strip_count", slider=True)
        layout.operator("twister.keyframe_current_turns", icon="KEY_HLT")
        layout.operator("twister.sequence_one_by_one")
        layout.operator("twister.open_turns_dialog", icon="PREFERENCES")
        layout.operator("twister.animate_to_current_turns", icon="PLAY")
        layout.operator("twister.reset_turns", icon="LOOP_BACK")
        layout.prop(scene, "twister_animation_frames")
        layout.separator()
        for i in range(1, active_count(scene) + 1):
            layout.prop(scene, f"twister_turn_{i:02d}", slider=True)


CLASSES = (
    TWISTER_OT_apply_current_turns,
    TWISTER_OT_keyframe_current_turns,
    TWISTER_OT_reset_turns,
    TWISTER_OT_animate_to_current_turns,
    TWISTER_OT_sequence_one_by_one,
    TWISTER_OT_open_turns_dialog,
    TWISTER_PT_blind_controls,
)


def infer_initial_count():
    strips = [o for o in bpy.context.scene.objects if o.name.startswith("closed_vertical_blind_strip_")]
    return max(1, min(MAX_STRIPS, len(strips) or DEFAULT_STRIPS))


def preserve_turn_values():
    values = {}
    scene = bpy.context.scene
    for i in range(1, MAX_STRIPS + 1):
        prop = f"twister_turn_{i:02d}"
        obj = bpy.data.objects.get(strip_name(i))
        if hasattr(scene, prop):
            values[prop] = float(getattr(scene, prop))
        elif obj:
            values[prop] = float(obj.get("turns", 0.0))
        else:
            values[prop] = 0.0
    return values


def register():
    initial_count = infer_initial_count()
    values = preserve_turn_values()

    bpy.types.Scene.twister_strip_count = bpy.props.IntProperty(
        name="Strip Count",
        description="Number of vertical blind strips",
        default=initial_count,
        min=1,
        max=MAX_STRIPS,
        soft_max=40,
        update=update_count,
    )
    for i in range(1, MAX_STRIPS + 1):
        prop = f"twister_turn_{i:02d}"
        setattr(
            bpy.types.Scene,
            prop,
            bpy.props.FloatProperty(
                name=f"Strip {i:02d}",
                description="Total relative twist turns. Top motor is +turns/2; bottom motor is -turns/2.",
                default=values[prop],
                min=-10.0,
                max=10.0,
                soft_min=-8.0,
                soft_max=8.0,
                step=10,
                precision=2,
                update=update_turn,
            ),
        )
    bpy.types.Scene.twister_animation_frames = bpy.props.IntProperty(
        name="Animation Frames",
        default=96,
        min=12,
        max=360,
    )

    for cls in CLASSES:
        bpy.utils.register_class(cls)

    for handler in list(bpy.app.handlers.frame_change_post):
        if getattr(handler, "__name__", "") == "twister_frame_change_handler":
            bpy.app.handlers.frame_change_post.remove(handler)
    bpy.app.handlers.frame_change_post.append(twister_frame_change_handler)

    scene = bpy.context.scene
    scene.twister_strip_count = initial_count
    for i in range(1, MAX_STRIPS + 1):
        setattr(scene, f"twister_turn_{i:02d}", values[f"twister_turn_{i:02d}"])
    apply_all_turns(scene)


def unregister():
    for handler in list(bpy.app.handlers.frame_change_post):
        if getattr(handler, "__name__", "") == "twister_frame_change_handler":
            bpy.app.handlers.frame_change_post.remove(handler)

    for cls in reversed(CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except RuntimeError:
            pass

    for prop in ["twister_strip_count", "twister_animation_frames"]:
        if hasattr(bpy.types.Scene, prop):
            delattr(bpy.types.Scene, prop)
    for i in range(1, MAX_STRIPS + 1):
        prop = f"twister_turn_{i:02d}"
        if hasattr(bpy.types.Scene, prop):
            delattr(bpy.types.Scene, prop)


if __name__ == "__main__":
    register()
