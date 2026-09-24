extends Node2D

const VIEW_SIZE := Vector2(1080.0, 1920.0)
const CENTER := Vector2(540.0, 1040.0)
const ARENA_RADIUS := 450.0
const ARENA_WIDTH := 7.0
const GAP_HALF_ANGLE := deg_to_rad(18.0)
const GAP_ROTATION_SPEED := 0.68
const ARM_ROTATION_SPEED := -2.4
const ARM_WIDTH := 7.0
const ARM_COLLISION_RADIUS := 5.0

const BALL_RADIUS := 7.0
const GRAVITY := 620.0
const AIR_DRAG := 0.9995
const WALL_BOUNCE := 0.89
const BALL_BOUNCE := 0.93
const MAX_BALL_SPEED := 900.0
const SUBSTEPS := 6
const ESCAPE_DISTANCE := ARENA_RADIUS + 72.0
const MAX_BALLS := 900
const CELL_SIZE := 22.0
const SOUND_POOL_SIZE := 14

const ALT_COLOR_A := Color("#FFD34D")
const ALT_COLOR_B := Color("#8C7BFF")
const COLOR_SWAP_INTERVAL := 0.9

const BALL_COLORS: Array[Color] = [
	Color("#FF6E5B"),
	Color("#FFC15B"),
	Color("#ECFF6A"),
	Color("#6CFF9D"),
	Color("#5CF0FF"),
	Color("#6F9BFF"),
	Color("#A16EFF"),
	Color("#FF7CC6")
]

var rng := RandomNumberGenerator.new()
var balls: Array[Dictionary] = []
var flashes: Array[Dictionary] = []
var gap_angle: float = -PI * 0.5
var arm_angle: float = 0.55
var total_escapes: int = 0
var recording_mode: bool = false
var wall_sound_cooldown: float = 0.0
var color_swap_timer: float = 0.0

var count_label: Label

var bounce_players: Array[AudioStreamPlayer] = []
var bounce_index: int = 0
var escape_players: Array[AudioStreamPlayer] = []
var escape_index: int = 0


func _ready() -> void:
	recording_mode = OS.get_cmdline_user_args().has("--recording")
	if recording_mode:
		DisplayServer.window_set_size(Vector2i(1080, 1920))
		get_viewport().size = Vector2i(1080, 1920)

	rng.randomize()
	_create_ui()
	_create_audio()
	_ensure_recording_dir()
	_reset_simulation()
	queue_redraw()


func _process(delta: float) -> void:
	wall_sound_cooldown = maxf(0.0, wall_sound_cooldown - delta)
	color_swap_timer += delta

	var sub_delta: float = delta / float(SUBSTEPS)
	for _step in range(SUBSTEPS):
		gap_angle = fposmod(gap_angle + GAP_ROTATION_SPEED * sub_delta, TAU)
		arm_angle = fposmod(arm_angle + ARM_ROTATION_SPEED * sub_delta, TAU)
		_update_balls(sub_delta)
		_resolve_ball_collisions()

	_process_escaped_balls()
	_update_effects(delta)
	_update_ui()
	queue_redraw()


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, VIEW_SIZE), Color.BLACK)
	_draw_arena()
	_draw_flashes()
	_draw_balls()


func _reset_simulation() -> void:
	balls.clear()
	flashes.clear()
	gap_angle = -PI * 0.5
	arm_angle = 0.55
	color_swap_timer = 0.0
	total_escapes = 0
	_spawn_marble(true)
	_update_ui()


func _create_ui() -> void:
	count_label = Label.new()
	count_label.position = Vector2(0.0, 400.0)
	count_label.size = Vector2(1080.0, 80.0)
	count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	count_label.add_theme_font_size_override("font_size", 68)
	count_label.add_theme_color_override("font_color", Color("#FFF8E7"))
	add_child(count_label)


func _update_ui() -> void:
	if count_label:
		count_label.text = str(balls.size())


func _spawn_marble(initial: bool = false) -> void:
	if balls.size() >= MAX_BALLS:
		return

	var spawn_position: Vector2
	if initial:
		spawn_position = CENTER + Vector2(120.0, -120.0)
	else:
		spawn_position = CENTER + Vector2.RIGHT.rotated(rng.randf_range(0.0, TAU)) * rng.randf_range(12.0, 72.0)

	var velocity: Vector2 = Vector2.RIGHT.rotated(rng.randf_range(0.0, TAU)) * rng.randf_range(150.0, 260.0)
	balls.append({
		"position": spawn_position,
		"velocity": velocity,
		"color": BALL_COLORS[rng.randi_range(0, BALL_COLORS.size() - 1)],
		"escaped": false,
		"arm_cooldown": 0.0
	})


func _update_balls(delta: float) -> void:
	for i in range(balls.size()):
		var ball: Dictionary = balls[i]
		var position: Vector2 = ball["position"]
		var velocity: Vector2 = ball["velocity"]
		var escaped: bool = bool(ball["escaped"])
		var arm_cooldown: float = maxf(0.0, float(ball["arm_cooldown"]) - delta)

		velocity.y += GRAVITY * delta
		velocity *= AIR_DRAG
		if velocity.length() > MAX_BALL_SPEED:
			velocity = velocity.normalized() * MAX_BALL_SPEED
		var previous_position: Vector2 = position
		position += velocity * delta

		if not escaped:
			var wall_result: Dictionary = _resolve_circle_wall(position, velocity)
			position = wall_result["position"]
			velocity = wall_result["velocity"]
			escaped = bool(wall_result["escaped"])
			if bool(wall_result["hit"]):
				_play_bounce_sound()

			if not escaped and arm_cooldown <= 0.0:
				var arm_result: Dictionary = _resolve_rotating_arm(previous_position, position, velocity)
				if bool(arm_result["hit"]):
					position = arm_result["position"]
					velocity = arm_result["velocity"]
					arm_cooldown = 0.055
					_play_bounce_sound()

		ball["position"] = position
		ball["velocity"] = velocity
		ball["escaped"] = escaped
		ball["arm_cooldown"] = arm_cooldown
		balls[i] = ball


func _resolve_circle_wall(position: Vector2, velocity: Vector2) -> Dictionary:
	var offset: Vector2 = position - CENTER
	var distance: float = offset.length()
	if distance <= 0.0001:
		return {"position": position, "velocity": velocity, "escaped": false, "hit": false}

	var normal: Vector2 = offset / distance
	var angle: float = atan2(offset.y, offset.x)
	var in_gap: bool = absf(_angle_difference(angle, gap_angle)) <= GAP_HALF_ANGLE
	var outward_speed: float = velocity.dot(normal)

	if distance + BALL_RADIUS > ARENA_RADIUS:
		if in_gap and outward_speed > 0.0:
			return {"position": position, "velocity": velocity, "escaped": true, "hit": false}

		position = CENTER + normal * (ARENA_RADIUS - BALL_RADIUS - 1.0)
		if outward_speed > 0.0:
			velocity = velocity.bounce(normal) * WALL_BOUNCE
			velocity = velocity.rotated(rng.randf_range(-0.028, 0.028))
		return {"position": position, "velocity": velocity, "escaped": false, "hit": true}

	return {"position": position, "velocity": velocity, "escaped": false, "hit": false}


func _resolve_rotating_arm(previous_position: Vector2, position: Vector2, velocity: Vector2) -> Dictionary:
	var arm_dir: Vector2 = Vector2.RIGHT.rotated(arm_angle)
	var a: Vector2 = CENTER + arm_dir * 30.0
	var b: Vector2 = CENTER + arm_dir * ARENA_RADIUS
	var collision_distance: float = BALL_RADIUS + ARM_COLLISION_RADIUS

	# Swept check: catches a marble even when it crosses the fast arm
	# between two physics positions.
	var sweep_hit: Dictionary = _segment_intersection(previous_position, position, a, b)
	var contact: Vector2
	var distance: float

	if bool(sweep_hit["hit"]):
		contact = sweep_hit["point"]
		distance = 0.0
	else:
		contact = _closest_point_on_segment(position, a, b)
		distance = position.distance_to(contact)
		if distance > collision_distance:
			return {"hit": false}

	var relative_contact: Vector2 = contact - CENTER
	var wall_velocity: Vector2 = Vector2(-relative_contact.y, relative_contact.x) * ARM_ROTATION_SPEED
	var relative_velocity: Vector2 = velocity - wall_velocity
	var normal: Vector2 = Vector2(-arm_dir.y, arm_dir.x)
	if relative_velocity.dot(normal) > 0.0:
		normal = -normal

	if relative_velocity.dot(normal) >= -1.0:
		return {"hit": false}

	# Push the marble fully away from the arm before applying the bounce.
	position = contact + normal * (collision_distance + 2.0)
	relative_velocity = relative_velocity.bounce(normal) * WALL_BOUNCE
	velocity = relative_velocity + wall_velocity

	# Keep the outgoing velocity clearly on the safe side of the arm.
	if velocity.dot(normal) < 30.0:
		velocity += normal * (30.0 - velocity.dot(normal))

	return {"hit": true, "position": position, "velocity": velocity}


func _segment_intersection(p1: Vector2, p2: Vector2, q1: Vector2, q2: Vector2) -> Dictionary:
	var r: Vector2 = p2 - p1
	var s_vec: Vector2 = q2 - q1
	var denominator: float = r.cross(s_vec)
	if absf(denominator) <= 0.00001:
		return {"hit": false, "point": Vector2.ZERO}

	var qp: Vector2 = q1 - p1
	var t: float = qp.cross(s_vec) / denominator
	var u: float = qp.cross(r) / denominator
	if t >= 0.0 and t <= 1.0 and u >= 0.0 and u <= 1.0:
		return {"hit": true, "point": p1 + r * t}
	return {"hit": false, "point": Vector2.ZERO}


func _resolve_ball_collisions() -> void:
	if balls.size() < 2:
		return

	var grid: Dictionary = {}
	for i in range(balls.size()):
		if bool(balls[i]["escaped"]):
			continue
		var p: Vector2 = balls[i]["position"]
		var key := Vector2i(int(floor(p.x / CELL_SIZE)), int(floor(p.y / CELL_SIZE)))
		if not grid.has(key):
			grid[key] = []
		var bucket: Array = grid[key]
		bucket.append(i)
		grid[key] = bucket

	var min_distance: float = BALL_RADIUS * 2.0
	var min_distance_sq: float = min_distance * min_distance

	for i in range(balls.size()):
		if bool(balls[i]["escaped"]):
			continue
		var ball_a: Dictionary = balls[i]
		var pos_a: Vector2 = ball_a["position"]
		var vel_a: Vector2 = ball_a["velocity"]
		var cell := Vector2i(int(floor(pos_a.x / CELL_SIZE)), int(floor(pos_a.y / CELL_SIZE)))

		for oy in range(-1, 2):
			for ox in range(-1, 2):
				var neighbor := cell + Vector2i(ox, oy)
				if not grid.has(neighbor):
					continue
				var bucket: Array = grid[neighbor]
				for j_variant in bucket:
					var j: int = int(j_variant)
					if j <= i or bool(balls[j]["escaped"]):
						continue

					var ball_b: Dictionary = balls[j]
					var pos_b: Vector2 = ball_b["position"]
					var delta: Vector2 = pos_b - pos_a
					var distance_sq: float = delta.length_squared()
					if distance_sq >= min_distance_sq:
						continue

					var distance: float = sqrt(maxf(distance_sq, 0.0001))
					var normal: Vector2 = delta / distance
					if distance <= 0.001:
						normal = Vector2.RIGHT.rotated(rng.randf_range(0.0, TAU))

					var penetration: float = min_distance - distance
					pos_a -= normal * penetration * 0.5
					pos_b += normal * penetration * 0.5

					var vel_b: Vector2 = ball_b["velocity"]
					var relative_velocity: Vector2 = vel_b - vel_a
					var velocity_along_normal: float = relative_velocity.dot(normal)
					if velocity_along_normal < 0.0:
						var impulse_strength: float = -(1.0 + BALL_BOUNCE) * velocity_along_normal * 0.5
						var impulse: Vector2 = normal * impulse_strength
						vel_a -= impulse
						vel_b += impulse

					ball_b["position"] = pos_b
					ball_b["velocity"] = vel_b
					balls[j] = ball_b

		ball_a["position"] = pos_a
		ball_a["velocity"] = vel_a
		balls[i] = ball_a


func _process_escaped_balls() -> void:
	var kept: Array[Dictionary] = []
	var spawn_count: int = 0
	for ball in balls:
		if bool(ball["escaped"]):
			var position: Vector2 = ball["position"]
			if position.distance_to(CENTER) >= ESCAPE_DISTANCE:
				total_escapes += 1
				spawn_count += 2
				_add_escape_flash(position, ball["color"])
				_play_escape_sound()
				continue
		kept.append(ball)
	balls = kept

	var available: int = maxi(0, MAX_BALLS - balls.size())
	spawn_count = mini(spawn_count, available)
	for _i in range(spawn_count):
		_spawn_marble(false)


func _angle_difference(a: float, b: float) -> float:
	return fposmod(a - b + PI, TAU) - PI


func _closest_point_on_segment(point: Vector2, a: Vector2, b: Vector2) -> Vector2:
	var ab: Vector2 = b - a
	var len_sq: float = ab.length_squared()
	if len_sq <= 0.0001:
		return a
	var t: float = clampf((point - a).dot(ab) / len_sq, 0.0, 1.0)
	return a + ab * t


func _draw_arena() -> void:
	var ring_color := Color("#5B8CFF")
	var arm_color := Color("#FFD85C")
	var start_angle: float = gap_angle + GAP_HALF_ANGLE
	var end_angle: float = gap_angle + TAU - GAP_HALF_ANGLE

	draw_arc(CENTER, ARENA_RADIUS, start_angle, end_angle, 240, Color(ring_color.r, ring_color.g, ring_color.b, 0.07), ARENA_WIDTH + 28.0, true)
	draw_arc(CENTER, ARENA_RADIUS, start_angle, end_angle, 240, Color(ring_color.r, ring_color.g, ring_color.b, 0.20), ARENA_WIDTH + 13.0, true)
	draw_arc(CENTER, ARENA_RADIUS, start_angle, end_angle, 240, ring_color, ARENA_WIDTH, true)

	var arm_dir: Vector2 = Vector2.RIGHT.rotated(arm_angle)
	var arm_a: Vector2 = CENTER + arm_dir * 30.0
	var arm_b: Vector2 = CENTER + arm_dir * ARENA_RADIUS
	draw_line(arm_a, arm_b, Color(arm_color.r, arm_color.g, arm_color.b, 0.07), ARM_WIDTH + 24.0, true)
	draw_line(arm_a, arm_b, Color(arm_color.r, arm_color.g, arm_color.b, 0.20), ARM_WIDTH + 11.0, true)
	draw_line(arm_a, arm_b, arm_color, ARM_WIDTH, true)


func _draw_balls() -> void:
	for ball in balls:
		var p: Vector2 = ball["position"]
		var color: Color = ball["color"]
		draw_circle(p, BALL_RADIUS * 2.7, Color(color.r, color.g, color.b, 0.07))
		draw_circle(p, BALL_RADIUS * 1.75, Color(color.r, color.g, color.b, 0.18))
		draw_circle(p, BALL_RADIUS, color)
		draw_circle(p + Vector2(-2.0, -2.0), 1.8, Color(1.0, 1.0, 1.0, 0.82))


func _add_escape_flash(position: Vector2, color: Color) -> void:
	flashes.append({
		"position": position,
		"color": color,
		"life": 0.34,
		"max_life": 0.34
	})


func _update_effects(delta: float) -> void:
	var kept: Array[Dictionary] = []
	for flash in flashes:
		flash["life"] = float(flash["life"]) - delta
		if float(flash["life"]) > 0.0:
			kept.append(flash)
	flashes = kept


func _draw_flashes() -> void:
	for flash in flashes:
		var ratio: float = clampf(float(flash["life"]) / float(flash["max_life"]), 0.0, 1.0)
		var color: Color = flash["color"]
		var radius: float = lerpf(42.0, 10.0, ratio)
		draw_arc(flash["position"], radius, 0.0, TAU, 30, Color(color.r, color.g, color.b, 0.75 * ratio), 3.0, true)


func _create_audio() -> void:
	var bounce_stream: AudioStreamWAV = _make_bounce_sound()
	var escape_stream: AudioStreamWAV = _make_escape_sound()
	for _i in range(SOUND_POOL_SIZE):
		var bounce_player := AudioStreamPlayer.new()
		bounce_player.stream = bounce_stream
		bounce_player.volume_db = -20.0
		add_child(bounce_player)
		bounce_players.append(bounce_player)

		var escape_player := AudioStreamPlayer.new()
		escape_player.stream = escape_stream
		escape_player.volume_db = -11.0
		add_child(escape_player)
		escape_players.append(escape_player)


func _play_bounce_sound() -> void:
	if bounce_players.is_empty() or wall_sound_cooldown > 0.0:
		return
	wall_sound_cooldown = 0.022
	var player: AudioStreamPlayer = bounce_players[bounce_index]
	bounce_index = (bounce_index + 1) % bounce_players.size()
	player.pitch_scale = rng.randf_range(0.94, 1.08)
	player.play()


func _play_escape_sound() -> void:
	if escape_players.is_empty():
		return
	var player: AudioStreamPlayer = escape_players[escape_index]
	escape_index = (escape_index + 1) % escape_players.size()
	player.pitch_scale = rng.randf_range(0.96, 1.10)
	player.play()


func _make_bounce_sound() -> AudioStreamWAV:
	var sample_rate: int = 44100
	var duration: float = 0.035
	var sample_count: int = int(float(sample_rate) * duration)
	var data := PackedByteArray()
	data.resize(sample_count * 2)
	for i in range(sample_count):
		var t: float = float(i) / float(sample_rate)
		var progress: float = float(i) / float(maxi(1, sample_count - 1))
		var envelope: float = pow(1.0 - progress, 4.0)
		var frequency: float = lerpf(1050.0, 650.0, progress)
		var value: float = sin(TAU * frequency * t) * envelope * 0.12
		data.encode_s16(i * 2, int(clampf(value, -1.0, 1.0) * 32767.0))
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	wav.data = data
	return wav


func _make_escape_sound() -> AudioStreamWAV:
	var sample_rate: int = 44100
	var duration: float = 0.12
	var sample_count: int = int(float(sample_rate) * duration)
	var data := PackedByteArray()
	data.resize(sample_count * 2)
	for i in range(sample_count):
		var t: float = float(i) / float(sample_rate)
		var progress: float = float(i) / float(maxi(1, sample_count - 1))
		var envelope: float = pow(1.0 - progress, 2.4)
		var frequency: float = lerpf(660.0, 1280.0, progress)
		var value: float = (sin(TAU * frequency * t) + sin(TAU * frequency * 2.0 * t) * 0.12) * envelope * 0.16
		data.encode_s16(i * 2, int(clampf(value, -1.0, 1.0) * 32767.0))
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	wav.data = data
	return wav


func _ensure_recording_dir() -> void:
	var project_path := ProjectSettings.globalize_path("res://")
	DirAccess.make_dir_recursive_absolute(project_path.path_join("recording"))


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_R:
			_reset_simulation()
		elif event.keycode == KEY_V:
			if recording_mode:
				_stop_recording()
			else:
				_start_recording()


func _start_recording() -> void:
	var project_path := ProjectSettings.globalize_path("res://")
	var recordings_path := project_path.path_join("recording")
	DirAccess.make_dir_recursive_absolute(recordings_path)
	var output_path := recordings_path.path_join("clip.avi")
	var args := PackedStringArray([
		"--path", project_path,
		"--resolution", "1080x1920",
		"--write-movie", output_path,
		"--fixed-fps", "60",
		"--",
		"--recording"
	])
	OS.create_process(OS.get_executable_path(), args)


func _stop_recording() -> void:
	await get_tree().process_frame
	get_tree().quit()
