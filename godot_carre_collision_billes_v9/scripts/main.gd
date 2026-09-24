extends Node2D

const VIEW_SIZE := Vector2(1080.0, 1920.0)
const SQUARE_CENTER := Vector2(540.0, 1010.0)
const SQUARE_HALF_SIZE: float = 390.0
const BALL_RADIUS: float = 12.0
const BALL_SPEED: float = 350.0
const MAX_BALLS: int = 600
const WALL_THICKNESS: float = 10.0
const COLLISION_CELL_SIZE: float = BALL_RADIUS * 2.5
const CONTACT_REARM_DISTANCE: float = BALL_RADIUS * 3.5

var balls: Array[Dictionary] = []
var flashes: Array[Dictionary] = []
var rng := RandomNumberGenerator.new()

var square_points: PackedVector2Array
var side_colors: Array[Color] = []
var count_label: Label

var sound_pool: Array[AudioStreamPlayer] = []
var sound_index: int = 0

var next_ball_id: int = 1
var active_ball_contacts: Dictionary = {}

var recording_mode: bool = false
var recording_pid: int = 0
var recording_launching: bool = false
var recordings_path: String = ""
var stop_signal_path: String = ""

var palette: Array[Color] = [
	Color("#35ff38"),
	Color("#00ddff"),
	Color("#ff238f"),
	Color("#ffe000"),
	Color("#ff8d00"),
	Color("#a760ff"),
	Color("#ffffff")
]


func _ready() -> void:
	recording_mode = OS.get_cmdline_user_args().has("--recording")

	if recording_mode:
		DisplayServer.window_set_size(Vector2i(1080, 1920))
		get_viewport().size = Vector2i(1080, 1920)

	var project_path: String = ProjectSettings.globalize_path("res://")
	recordings_path = project_path.path_join("recordings")
	stop_signal_path = recordings_path.path_join("stop_recording.signal")
	DirAccess.make_dir_recursive_absolute(recordings_path)

	# Supprime uniquement un ancien signal resté après une fermeture imprévue.
	if not recording_mode and FileAccess.file_exists(stop_signal_path):
		DirAccess.remove_absolute(stop_signal_path)

	rng.randomize()
	_build_square()
	_create_ui()
	_create_sound_pool()

	_add_ball(
		SQUARE_CENTER + Vector2(-90.0, -40.0),
		Vector2(0.82, 0.58),
		Color("#35ff38")
	)
	_add_ball(
		SQUARE_CENTER + Vector2(95.0, 25.0),
		Vector2(-0.72, 0.70),
		Color("#00ddff")
	)

	queue_redraw()


func _input(event: InputEvent) -> void:
	if not (event is InputEventKey):
		return

	var key_event := event as InputEventKey
	if not key_event.pressed or key_event.echo:
		return

	if key_event.keycode == KEY_V or key_event.physical_keycode == KEY_V:
		_toggle_recording()
		get_viewport().set_input_as_handled()


func _process(delta: float) -> void:
	if recording_mode and FileAccess.file_exists(stop_signal_path):
		DirAccess.remove_absolute(stop_signal_path)
		_finish_recording()
		return

	if not recording_mode and recording_pid > 0 and not OS.is_process_running(recording_pid):
		recording_pid = 0

	_update_balls(delta)
	_update_flashes(delta)
	queue_redraw()


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, VIEW_SIZE), Color.BLACK)
	_draw_neon_square()
	_draw_flashes()
	_draw_balls()


func _build_square() -> void:
	square_points = PackedVector2Array([
		SQUARE_CENTER + Vector2(-SQUARE_HALF_SIZE, -SQUARE_HALF_SIZE),
		SQUARE_CENTER + Vector2(SQUARE_HALF_SIZE, -SQUARE_HALF_SIZE),
		SQUARE_CENTER + Vector2(SQUARE_HALF_SIZE, SQUARE_HALF_SIZE),
		SQUARE_CENTER + Vector2(-SQUARE_HALF_SIZE, SQUARE_HALF_SIZE)
	])

	side_colors = [
		Color("#35ff38"),
		Color("#35ff38"),
		Color("#35ff38"),
		Color("#35ff38")
	]


func _create_ui() -> void:
	var concept_label := Label.new()
	concept_label.text = "Every contact = a new ball ⚡"
	concept_label.position = Vector2(40.0, 70.0)
	concept_label.size = Vector2(1000.0, 90.0)
	concept_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	concept_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	concept_label.add_theme_font_size_override("font_size", 48)
	concept_label.add_theme_color_override("font_color", Color.WHITE)
	add_child(concept_label)

	var title := Label.new()
	title.text = "Want to see ur name in the next video? 👀"
	title.position = Vector2(40.0, 180.0)
	title.size = Vector2(1000.0, 90.0)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 40)
	title.add_theme_color_override("font_color", Color.WHITE)
	add_child(title)

	count_label = Label.new()
	count_label.text = "2 balls"
	count_label.position = Vector2(0.0, 285.0)
	count_label.size = Vector2(1080.0, 70.0)
	count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	count_label.add_theme_font_size_override("font_size", 35)
	count_label.add_theme_color_override("font_color", Color(1.0, 1.0, 1.0, 0.48))
	add_child(count_label)


func _add_ball(position: Vector2, direction: Vector2, color: Color) -> void:
	if balls.size() >= MAX_BALLS:
		return

	var safe_direction := direction
	if safe_direction.length_squared() < 0.0001:
		safe_direction = Vector2.RIGHT.rotated(rng.randf_range(0.0, TAU))

	balls.append({
		"id": next_ball_id,
		"position": _clamp_ball_inside(position),
		"velocity": safe_direction.normalized() * BALL_SPEED,
		"color": color,
		"trail": PackedVector2Array()
	})
	next_ball_id += 1
	_update_count_label()


func _update_balls(delta: float) -> void:
	# Déplacement et rebond contre les quatre parois entièrement fermées.
	for ball_index in range(balls.size()):
		var ball: Dictionary = balls[ball_index]
		var pos: Vector2 = ball["position"]
		var vel: Vector2 = ball["velocity"]
		var trail: PackedVector2Array = ball["trail"]
		var remaining_time: float = delta

		trail.append(pos)
		while trail.size() > 14:
			trail.remove_at(0)

		# Plusieurs passages empêchent une bille de traverser un angle.
		for collision_pass in range(4):
			if remaining_time <= 0.00001:
				break

			var target: Vector2 = pos + vel * remaining_time
			var collision: Dictionary = _find_first_wall_collision(pos, target)

			if not bool(collision["hit"]):
				pos = target
				remaining_time = 0.0
				break

			var side_index: int = int(collision["side"])
			var hit_center: Vector2 = collision["center"]
			var hit_point: Vector2 = collision["point"]
			var normal: Vector2 = collision["normal"]
			var travel_t: float = float(collision["travel_t"])

			side_colors[side_index] = palette[
				rng.randi_range(0, palette.size() - 2)
			]

			pos = hit_center + normal * 1.5
			vel = vel.bounce(normal).normalized() * BALL_SPEED
			remaining_time *= maxf(0.0, 1.0 - travel_t)

			_add_flash(hit_point, side_colors[side_index])
			_play_collision_sound()

		ball["position"] = _clamp_ball_inside(pos)
		ball["velocity"] = vel.normalized() * BALL_SPEED
		ball["trail"] = trail
		balls[ball_index] = ball

	_handle_ball_collisions()
	_update_count_label()


func _handle_ball_collisions() -> void:
	var grid: Dictionary = {}
	var positions_by_id: Dictionary = {}

	for ball_index in range(balls.size()):
		var pos: Vector2 = balls[ball_index]["position"]
		var ball_id: int = int(balls[ball_index]["id"])
		positions_by_id[ball_id] = pos

		var cell := Vector2i(
			floori(pos.x / COLLISION_CELL_SIZE),
			floori(pos.y / COLLISION_CELL_SIZE)
		)

		if not grid.has(cell):
			grid[cell] = []
		var indices: Array = grid[cell]
		indices.append(ball_index)
		grid[cell] = indices

	# Un contact déjà compté reste verrouillé tant que les deux billes ne se sont
	# pas réellement éloignées. Cela évite les créations infinies causées par
	# les micro-séparations d'une image à l'autre.
	var retained_contacts: Dictionary = {}
	var rearm_distance_squared: float = CONTACT_REARM_DISTANCE * CONTACT_REARM_DISTANCE

	for stored_key_value in active_ball_contacts.keys():
		var stored_key: String = str(stored_key_value)
		var ids: PackedStringArray = stored_key.split(":")
		if ids.size() != 2:
			continue

		var stored_id_a: int = int(ids[0])
		var stored_id_b: int = int(ids[1])
		if not positions_by_id.has(stored_id_a) or not positions_by_id.has(stored_id_b):
			continue

		var stored_pos_a: Vector2 = positions_by_id[stored_id_a]
		var stored_pos_b: Vector2 = positions_by_id[stored_id_b]
		if stored_pos_a.distance_squared_to(stored_pos_b) <= rearm_distance_squared:
			retained_contacts[stored_key] = true

	active_ball_contacts = retained_contacts

	var spawn_count: int = 0
	var minimum_distance: float = BALL_RADIUS * 2.0
	var minimum_distance_squared: float = minimum_distance * minimum_distance

	for ball_index in range(balls.size()):
		var ball_a: Dictionary = balls[ball_index]
		var pos_a: Vector2 = ball_a["position"]
		var cell_a := Vector2i(
			floori(pos_a.x / COLLISION_CELL_SIZE),
			floori(pos_a.y / COLLISION_CELL_SIZE)
		)

		for offset_x in range(-1, 2):
			for offset_y in range(-1, 2):
				var neighbor_cell := cell_a + Vector2i(offset_x, offset_y)
				if not grid.has(neighbor_cell):
					continue

				var neighbor_indices: Array = grid[neighbor_cell]
				for other_value in neighbor_indices:
					var other_index: int = int(other_value)
					if other_index <= ball_index:
						continue

					var ball_b: Dictionary = balls[other_index]
					var pos_b: Vector2 = ball_b["position"]
					var difference: Vector2 = pos_b - pos_a
					var distance_squared: float = difference.length_squared()

					if distance_squared > minimum_distance_squared:
						continue

					var id_a: int = int(ball_a["id"])
					var id_b: int = int(ball_b["id"])
					var contact_key := "%d:%d" % [mini(id_a, id_b), maxi(id_a, id_b)]
					var is_new_contact: bool = not active_ball_contacts.has(contact_key)
					active_ball_contacts[contact_key] = true

					var normal: Vector2
					var distance: float
					if distance_squared < 0.0001:
						normal = Vector2.RIGHT.rotated(rng.randf_range(0.0, TAU))
						distance = 0.0
					else:
						distance = sqrt(distance_squared)
						normal = difference / distance

					# Sépare les deux billes pour éviter qu'elles restent collées.
					var overlap: float = maxf(0.0, minimum_distance - distance)
					if overlap > 0.0:
						pos_a = _clamp_ball_inside(pos_a - normal * (overlap * 0.5 + 0.2))
						pos_b = _clamp_ball_inside(pos_b + normal * (overlap * 0.5 + 0.2))

					var velocity_a: Vector2 = ball_a["velocity"]
					var velocity_b: Vector2 = ball_b["velocity"]
					var relative_velocity: Vector2 = velocity_b - velocity_a

					# Collision élastique entre deux billes de même masse.
					if relative_velocity.dot(normal) < 0.0:
						var normal_speed_a: float = velocity_a.dot(normal)
						var normal_speed_b: float = velocity_b.dot(normal)
						velocity_a += (normal_speed_b - normal_speed_a) * normal
						velocity_b += (normal_speed_a - normal_speed_b) * normal

						if velocity_a.length_squared() > 0.0001:
							velocity_a = velocity_a.normalized() * BALL_SPEED
						if velocity_b.length_squared() > 0.0001:
							velocity_b = velocity_b.normalized() * BALL_SPEED

					ball_a["position"] = pos_a
					ball_a["velocity"] = velocity_a
					ball_b["position"] = pos_b
					ball_b["velocity"] = velocity_b
					balls[ball_index] = ball_a
					balls[other_index] = ball_b

					# Une seule nouvelle bille pour toute la durée de ce contact.
					if is_new_contact:
						spawn_count += 1
						_add_flash((pos_a + pos_b) * 0.5, Color.WHITE)
						_play_spawn_sound()

	for spawn_index in range(spawn_count):
		if balls.size() >= MAX_BALLS:
			break

		var spawn_position: Vector2 = _random_point_inside_square_safe()
		var spawn_direction := Vector2.RIGHT.rotated(rng.randf_range(0.0, TAU))
		var spawn_color: Color = palette[rng.randi_range(0, palette.size() - 1)]
		_add_ball(spawn_position, spawn_direction, spawn_color)
		_add_flash(spawn_position, spawn_color)


func _find_first_wall_collision(start: Vector2, target: Vector2) -> Dictionary:
	var best_hit: Dictionary = {"hit": false}
	var best_t: float = 2.0

	for side_index in range(4):
		var a: Vector2 = square_points[side_index]
		var b: Vector2 = square_points[(side_index + 1) % 4]
		var edge: Vector2 = b - a
		var normal: Vector2 = Vector2(-edge.y, edge.x).normalized()

		# Toujours orienter la normale vers l'intérieur du carré.
		if (SQUARE_CENTER - a).dot(normal) < 0.0:
			normal = -normal

		var start_distance: float = (start - a).dot(normal)
		var target_distance: float = (target - a).dot(normal)

		if target_distance >= BALL_RADIUS:
			continue

		var travel_t: float = 0.0
		var denominator: float = start_distance - target_distance

		if start_distance > BALL_RADIUS and denominator > 0.00001:
			travel_t = clampf(
				(start_distance - BALL_RADIUS) / denominator,
				0.0,
				1.0
			)

		if travel_t >= best_t:
			continue

		var hit_center: Vector2 = start.lerp(target, travel_t)
		var contact_point: Vector2 = hit_center - normal * BALL_RADIUS
		var side_t: float = clampf(
			(contact_point - a).dot(edge) / maxf(edge.length_squared(), 0.001),
			0.0,
			1.0
		)

		best_t = travel_t
		best_hit = {
			"hit": true,
			"side": side_index,
			"center": hit_center,
			"point": a.lerp(b, side_t),
			"normal": normal,
			"travel_t": travel_t
		}

	return best_hit


func _clamp_ball_inside(point: Vector2) -> Vector2:
	var min_x: float = SQUARE_CENTER.x - SQUARE_HALF_SIZE + BALL_RADIUS
	var max_x: float = SQUARE_CENTER.x + SQUARE_HALF_SIZE - BALL_RADIUS
	var min_y: float = SQUARE_CENTER.y - SQUARE_HALF_SIZE + BALL_RADIUS
	var max_y: float = SQUARE_CENTER.y + SQUARE_HALF_SIZE - BALL_RADIUS
	return Vector2(
		clampf(point.x, min_x, max_x),
		clampf(point.y, min_y, max_y)
	)


func _random_point_inside_square() -> Vector2:
	var margin: float = BALL_RADIUS * 3.0
	return SQUARE_CENTER + Vector2(
		rng.randf_range(-SQUARE_HALF_SIZE + margin, SQUARE_HALF_SIZE - margin),
		rng.randf_range(-SQUARE_HALF_SIZE + margin, SQUARE_HALF_SIZE - margin)
	)


func _random_point_inside_square_safe() -> Vector2:
	var candidate: Vector2 = _random_point_inside_square()
	var safe_distance_squared: float = pow(BALL_RADIUS * 3.2, 2.0)

	for attempt in range(50):
		candidate = _random_point_inside_square()
		var is_free: bool = true

		for ball in balls:
			var ball_position: Vector2 = ball["position"]
			if candidate.distance_squared_to(ball_position) < safe_distance_squared:
				is_free = false
				break

		if is_free:
			return candidate

	return candidate


func _draw_neon_square() -> void:
	for side_index in range(4):
		var a: Vector2 = square_points[side_index]
		var b: Vector2 = square_points[(side_index + 1) % 4]
		_draw_neon_line(a, b, side_colors[side_index])


func _draw_neon_line(a: Vector2, b: Vector2, color: Color) -> void:
	draw_line(a, b, Color(color.r, color.g, color.b, 0.045), 34.0, true)
	draw_line(a, b, Color(color.r, color.g, color.b, 0.12), 20.0, true)
	draw_line(a, b, color, WALL_THICKNESS, true)


func _draw_balls() -> void:
	for ball in balls:
		var pos: Vector2 = ball["position"]
		var color: Color = ball["color"]
		var trail: PackedVector2Array = ball["trail"]

		for i in range(trail.size()):
			var ratio: float = float(i + 1) / float(maxi(1, trail.size()))
			draw_circle(
				trail[i],
				BALL_RADIUS * ratio * 0.72,
				Color(color.r, color.g, color.b, ratio * 0.17)
			)

		draw_circle(pos, BALL_RADIUS * 3.3, Color(color.r, color.g, color.b, 0.045))
		draw_circle(pos, BALL_RADIUS * 2.0, Color(color.r, color.g, color.b, 0.13))
		draw_circle(pos, BALL_RADIUS, color)
		draw_circle(pos + Vector2(-3.0, -3.0), 3.2, Color(1.0, 1.0, 1.0, 0.72))


func _add_flash(position: Vector2, color: Color) -> void:
	flashes.append({
		"position": position,
		"color": color,
		"life": 0.30,
		"max_life": 0.30
	})


func _update_flashes(delta: float) -> void:
	var alive: Array[Dictionary] = []

	for flash in flashes:
		flash["life"] = float(flash["life"]) - delta
		if float(flash["life"]) > 0.0:
			alive.append(flash)

	flashes = alive


func _draw_flashes() -> void:
	for flash in flashes:
		var life: float = float(flash["life"])
		var max_life: float = float(flash["max_life"])
		var ratio: float = clampf(life / max_life, 0.0, 1.0)
		var pos: Vector2 = flash["position"]
		var color: Color = flash["color"]
		var radius: float = lerpf(82.0, 14.0, ratio)

		draw_circle(pos, radius, Color(color.r, color.g, color.b, 0.07 * ratio))
		draw_arc(
			pos,
			radius,
			0.0,
			TAU,
			48,
			Color(color.r, color.g, color.b, 0.70 * ratio),
			4.5,
			true
		)


func _create_sound_pool() -> void:
	var collision_stream: AudioStreamWAV = _make_tone(900.0, 0.035)
	var spawn_stream: AudioStreamWAV = _make_tone(1350.0, 0.075)

	for i in range(8):
		var player := AudioStreamPlayer.new()
		player.stream = collision_stream if i < 6 else spawn_stream
		player.volume_db = -15.0
		add_child(player)
		sound_pool.append(player)


func _make_tone(frequency: float, duration: float) -> AudioStreamWAV:
	var sample_rate: int = 44100
	var sample_count: int = int(sample_rate * duration)
	var data: PackedByteArray = PackedByteArray()
	data.resize(sample_count * 2)

	for i in range(sample_count):
		var t: float = float(i) / float(sample_rate)
		var envelope: float = pow(1.0 - float(i) / float(sample_count), 2.0)
		var value: float = sin(TAU * frequency * t) * envelope * 0.32
		data.encode_s16(i * 2, int(clampf(value, -1.0, 1.0) * 32767.0))

	var wav: AudioStreamWAV = AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	wav.data = data
	return wav


func _play_collision_sound() -> void:
	if sound_pool.is_empty():
		return

	var player := sound_pool[sound_index % 6]
	sound_index = (sound_index + 1) % 6
	player.pitch_scale = rng.randf_range(0.88, 1.14)
	player.volume_db = -18.0
	player.play()


func _play_spawn_sound() -> void:
	if sound_pool.size() < 8:
		return

	for i in range(2):
		var player := sound_pool[6 + i]
		player.pitch_scale = 1.0 + float(i) * 0.22
		player.volume_db = -10.0
		player.play()


func _update_count_label() -> void:
	if count_label == null:
		return
	count_label.text = "%d balls" % balls.size()


func _toggle_recording() -> void:
	if recording_mode:
		_finish_recording()
		return

	if recording_pid > 0 and OS.is_process_running(recording_pid):
		_request_recording_stop()
		return

	_start_recording()


func _start_recording() -> void:
	if recording_launching:
		return

	recording_launching = true

	if FileAccess.file_exists(stop_signal_path):
		DirAccess.remove_absolute(stop_signal_path)

	var project_path: String = ProjectSettings.globalize_path("res://")
	var filename: String = "square_ball_collision_%s.avi" % Time.get_datetime_string_from_system().replace(":", "-")
	var output_path: String = recordings_path.path_join(filename)

	var args := PackedStringArray([
		"--path", project_path,
		"--resolution", "1080x1920",
		"--write-movie", output_path,
		"--fixed-fps", "60",
		"--",
		"--recording"
	])

	recording_pid = OS.create_process(OS.get_executable_path(), args)
	if recording_pid <= 0:
		push_error("Impossible de lancer l'enregistrement.")
		recording_pid = 0

	await get_tree().create_timer(0.8).timeout
	recording_launching = false


func _request_recording_stop() -> void:
	var signal_file := FileAccess.open(stop_signal_path, FileAccess.WRITE)
	if signal_file == null:
		push_error("Impossible d'envoyer le signal d'arrêt de l'enregistrement.")
		return

	signal_file.store_string("stop")
	signal_file.close()


func _finish_recording() -> void:
	set_process(false)
	await get_tree().process_frame
	get_tree().quit()
