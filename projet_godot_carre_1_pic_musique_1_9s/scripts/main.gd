extends Node2D

const VIEW_SIZE := Vector2(1080.0, 1920.0)
const CENTER := Vector2(540.0, 1040.0)
const SQUARE_HALF_SIZE := 455.0
const BALL_START_RADIUS := 14.0
const BALL_MAX_RADIUS := 54.0
const BALL_GROWTH := 2.0
const BALL_SPEED := 430.0
const WALL_WIDTH := 8.0
const POINTS_PER_HIT := 100
const AUDIO_SLICE_SECONDS := 1.9
const AUDIO_PLAYER_COUNT := 6
const RESPAWN_DELAY := 0.42
const SPIKE_LENGTH := 72.0
const SPIKE_BASE_HALF_WIDTH := 40.0
const BOUNCE_VARIATION_MIN := deg_to_rad(7.0)
const BOUNCE_VARIATION_MAX := deg_to_rad(18.0)
const SPIKE_PATH_SPEED := 0.060
const SPIKE_BASE_PROGRESS := [0.16]

const ARENA_COLOR := Color("#34f5ff")
const SPIKE_COLOR := Color("#ff8a00")
const BALL_BASE_COLOR := Color("#d8ff32")

var rng := RandomNumberGenerator.new()
var spike_path_progress := 0.0

var ball_position := CENTER + Vector2(-35.0, 10.0)
var ball_velocity := Vector2(cos(deg_to_rad(45.0)), sin(deg_to_rad(45.0))) * BALL_SPEED
var ball_radius := BALL_START_RADIUS
var ball_alive := true
var respawn_timer := 0.0
var trail := PackedVector2Array()

var impact_lines: Array[Dictionary] = []
var flashes: Array[Dictionary] = []
var particles: Array[Dictionary] = []
var explosion_rings: Array[Dictionary] = []

var hit_count := 0
var score := 0
var explosion_count := 0
var score_label: Label
var hits_label: Label
var record_button: Button
var recording_mode := false

var music_stream: AudioStream
var audio_players: Array[AudioStreamPlayer] = []
var audio_remaining: Array[float] = []
var audio_cursor := 0.0
var stream_length := 0.0
var audio_finished := false


func _ready() -> void:
	recording_mode = OS.get_cmdline_user_args().has("--recording")

	if recording_mode:
		DisplayServer.window_set_size(Vector2i(1080, 1920))
		get_viewport().size = Vector2i(1080, 1920)

	rng.randomize()
	_create_ui()
	_create_audio()
	queue_redraw()


func _process(delta: float) -> void:
	spike_path_progress = fposmod(
		spike_path_progress + SPIKE_PATH_SPEED * delta,
		1.0
	)
	_update_audio(delta)

	if ball_alive:
		_update_ball(delta)
	else:
		respawn_timer -= delta
		if respawn_timer <= 0.0:
			_spawn_new_ball()

	_update_effects(delta)
	queue_redraw()


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, VIEW_SIZE), Color.BLACK)
	_draw_arena()
	_draw_impact_lines()
	_draw_effects()

	if ball_alive:
		_draw_ball()


func _create_ui() -> void:
	var title := Label.new()
	title.text = "SQUARE EVOLUTION VS SPIKE"
	title.position = Vector2(0, 190)
	title.size = Vector2(1080, 90)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 50)
	title.add_theme_color_override("font_color", Color.WHITE)
	add_child(title)

	score_label = Label.new()
	score_label.position = Vector2(0, 292)
	score_label.size = Vector2(1080, 58)
	score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	score_label.add_theme_font_size_override("font_size", 34)
	score_label.add_theme_color_override("font_color", BALL_BASE_COLOR)
	add_child(score_label)

	hits_label = Label.new()
	hits_label.position = Vector2(0, 350)
	hits_label.size = Vector2(1080, 48)
	hits_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hits_label.add_theme_font_size_override("font_size", 27)
	hits_label.add_theme_color_override("font_color", Color(1, 1, 1, 0.52))
	add_child(hits_label)

	var restart := Button.new()
	restart.text = "RECOMMENCER"
	restart.position = Vector2(142.5, 1762.5)
	restart.size = Vector2(345, 87)
	restart.pressed.connect(func(): get_tree().reload_current_scene())
	add_child(restart)

	record_button = Button.new()
	record_button.position = Vector2(592.5, 1762.5)
	record_button.size = Vector2(345, 87)

	if recording_mode:
		record_button.text = "■ ARRÊTER ET SAUVEGARDER"
		record_button.pressed.connect(_stop_recording)
	else:
		record_button.text = "● ENREGISTRER"
		record_button.pressed.connect(_start_recording)

	add_child(record_button)
	_update_labels()


func _create_audio() -> void:
	music_stream = load("res://audio/contact_music.mp3")

	if music_stream != null:
		stream_length = music_stream.get_length()

	for i in range(AUDIO_PLAYER_COUNT):
		var player := AudioStreamPlayer.new()
		player.stream = music_stream
		player.volume_db = -7.0
		add_child(player)
		audio_players.append(player)
		audio_remaining.append(0.0)


func _update_ball(delta: float) -> void:
	var next_position := ball_position + ball_velocity * delta

	for triangle in _get_spike_triangles():
		if _circle_intersects_triangle(next_position, ball_radius, triangle):
			ball_position = next_position
			_explode_ball()
			return

	var vertices := _get_arena_vertices()
	var collided := false
	var collision_normal := Vector2.ZERO
	var deepest_penetration := 0.0

	for i in range(vertices.size()):
		var a: Vector2 = vertices[i]
		var b: Vector2 = vertices[(i + 1) % vertices.size()]
		var edge := b - a
		var inward_normal := Vector2(-edge.y, edge.x).normalized()

		if (CENTER - a).dot(inward_normal) < 0.0:
			inward_normal = -inward_normal

		var signed_distance := (next_position - a).dot(inward_normal)
		var penetration := ball_radius - signed_distance

		if penetration > 0.0:
			next_position += inward_normal * (penetration + 1.5)
			if penetration > deepest_penetration:
				deepest_penetration = penetration
				collision_normal = inward_normal
			collided = true

	ball_position = next_position

	if collided and collision_normal != Vector2.ZERO:
		var reflected := ball_velocity.bounce(collision_normal).normalized()
		var variation := rng.randf_range(
			BOUNCE_VARIATION_MIN,
			BOUNCE_VARIATION_MAX
		)
		if rng.randi() % 2 == 0:
			variation = -variation

		reflected = reflected.rotated(variation).normalized()

		if reflected.dot(collision_normal) < 0.12:
			reflected = (reflected + collision_normal * 0.42).normalized()

		ball_velocity = reflected * BALL_SPEED

		var contact_point := ball_position - collision_normal * ball_radius
		_register_wall_collision(contact_point)

	trail.append(ball_position)
	while trail.size() > 24:
		trail.remove_at(0)


func _register_wall_collision(contact_point: Vector2) -> void:
	hit_count += 1
	score += POINTS_PER_HIT
	ball_radius = minf(BALL_MAX_RADIUS, ball_radius + BALL_GROWTH)

	var line_color := Color.from_hsv(
		fmod(0.18 + float(hit_count) * 0.075, 1.0),
		0.78,
		1.0
	)

	impact_lines.append({
		"anchor": contact_point,
		"color": line_color
	})

	_add_flash(contact_point, line_color)
	_spawn_impact_particles(contact_point, line_color)
	_play_audio_slice()
	_update_labels()


func _explode_ball() -> void:
	if not ball_alive:
		return

	ball_alive = false
	explosion_count += 1
	respawn_timer = RESPAWN_DELAY
	trail.clear()
	impact_lines.clear()

	_spawn_explosion_particles(ball_position)
	_add_explosion_ring(ball_position, SPIKE_COLOR, 0.52, 28.0, 150.0)
	_add_explosion_ring(ball_position, Color.WHITE, 0.34, 18.0, 105.0)
	_update_labels()


func _spawn_new_ball() -> void:
	ball_radius = BALL_START_RADIUS
	ball_position = CENTER + Vector2(
		rng.randf_range(-55.0, 55.0),
		rng.randf_range(-55.0, 55.0)
	)

	var safe_direction := _get_safe_spawn_direction()
	ball_velocity = safe_direction * BALL_SPEED
	ball_alive = true

	_add_flash(ball_position, BALL_BASE_COLOR)
	_spawn_respawn_particles(ball_position)


func _get_safe_spawn_direction() -> Vector2:
	for attempt in range(30):
		var angle := rng.randf_range(0.0, TAU)
		var direction := Vector2(cos(angle), sin(angle))
		if absf(direction.x) > 0.22 and absf(direction.y) > 0.18:
			return direction

	return Vector2(0.83, -0.56).normalized()


func _get_arena_vertices(radius_offset: float = 0.0) -> PackedVector2Array:
	var vertices := PackedVector2Array()
	var half_size := SQUARE_HALF_SIZE + radius_offset
	vertices.append(CENTER + Vector2(-half_size, -half_size))
	vertices.append(CENTER + Vector2(half_size, -half_size))
	vertices.append(CENTER + Vector2(half_size, half_size))
	vertices.append(CENTER + Vector2(-half_size, half_size))
	return vertices


func _get_arena_perimeter() -> float:
	var vertices := _get_arena_vertices()
	var perimeter := 0.0

	for i in range(vertices.size()):
		perimeter += vertices[i].distance_to(vertices[(i + 1) % vertices.size()])

	return perimeter


func _get_perimeter_frame(progress: float) -> Dictionary:
	var vertices := _get_arena_vertices()
	var perimeter := _get_arena_perimeter()
	var target_distance := fposmod(progress, 1.0) * perimeter

	for i in range(vertices.size()):
		var a: Vector2 = vertices[i]
		var b: Vector2 = vertices[(i + 1) % vertices.size()]
		var edge := b - a
		var edge_length := edge.length()

		if target_distance <= edge_length or i == vertices.size() - 1:
			var t := clampf(target_distance / edge_length, 0.0, 1.0)
			var tangent := edge / edge_length
			var inward_normal := Vector2(-tangent.y, tangent.x)

			if (CENTER - a).dot(inward_normal) < 0.0:
				inward_normal = -inward_normal

			return {
				"position": a.lerp(b, t),
				"tangent": tangent,
				"normal": inward_normal
			}

		target_distance -= edge_length

	return {
		"position": vertices[0],
		"tangent": (vertices[1] - vertices[0]).normalized(),
		"normal": (CENTER - vertices[0]).normalized()
	}


func _get_spike_triangles() -> Array[PackedVector2Array]:
	var triangles: Array[PackedVector2Array] = []

	for base_progress in SPIKE_BASE_PROGRESS:
		var frame := _get_perimeter_frame(base_progress + spike_path_progress)
		var position: Vector2 = frame["position"]
		var tangent: Vector2 = frame["tangent"]
		var inward_normal: Vector2 = frame["normal"]

		var base_a := position - tangent * SPIKE_BASE_HALF_WIDTH
		var base_b := position + tangent * SPIKE_BASE_HALF_WIDTH
		var tip := position + inward_normal * SPIKE_LENGTH

		triangles.append(PackedVector2Array([base_a, base_b, tip]))

	return triangles


func _circle_intersects_triangle(
	circle_center: Vector2,
	circle_radius: float,
	triangle: PackedVector2Array
) -> bool:
	var a := triangle[0]
	var b := triangle[1]
	var c := triangle[2]

	if _point_in_triangle(circle_center, a, b, c):
		return true

	var radius_squared := circle_radius * circle_radius
	var closest_ab := _closest_point_on_segment(circle_center, a, b)
	var closest_bc := _closest_point_on_segment(circle_center, b, c)
	var closest_ca := _closest_point_on_segment(circle_center, c, a)

	return (
		circle_center.distance_squared_to(closest_ab) <= radius_squared
		or circle_center.distance_squared_to(closest_bc) <= radius_squared
		or circle_center.distance_squared_to(closest_ca) <= radius_squared
	)


func _closest_point_on_segment(point: Vector2, a: Vector2, b: Vector2) -> Vector2:
	var segment := b - a
	var length_squared := segment.length_squared()

	if length_squared <= 0.0001:
		return a

	var t := clampf((point - a).dot(segment) / length_squared, 0.0, 1.0)
	return a + segment * t


func _point_in_triangle(point: Vector2, a: Vector2, b: Vector2, c: Vector2) -> bool:
	var d1 := _triangle_sign(point, a, b)
	var d2 := _triangle_sign(point, b, c)
	var d3 := _triangle_sign(point, c, a)
	var has_negative := d1 < 0.0 or d2 < 0.0 or d3 < 0.0
	var has_positive := d1 > 0.0 or d2 > 0.0 or d3 > 0.0
	return not (has_negative and has_positive)


func _triangle_sign(p1: Vector2, p2: Vector2, p3: Vector2) -> float:
	return (
		(p1.x - p3.x) * (p2.y - p3.y)
		- (p2.x - p3.x) * (p1.y - p3.y)
	)


func _draw_closed_polygon_outline(
	points: PackedVector2Array,
	color: Color,
	width: float
) -> void:
	var closed := PackedVector2Array(points)
	closed.append(points[0])
	draw_polyline(closed, color, width, true)


func _draw_arena() -> void:
	_draw_closed_polygon_outline(
		_get_arena_vertices(12.0),
		Color(ARENA_COLOR.r, ARENA_COLOR.g, ARENA_COLOR.b, 0.045),
		34.0
	)
	_draw_closed_polygon_outline(
		_get_arena_vertices(5.0),
		Color(ARENA_COLOR.r, ARENA_COLOR.g, ARENA_COLOR.b, 0.16),
		18.0
	)
	_draw_closed_polygon_outline(
		_get_arena_vertices(),
		ARENA_COLOR,
		WALL_WIDTH
	)

	for triangle in _get_spike_triangles():
		_draw_spike(triangle)


func _draw_spike(triangle: PackedVector2Array) -> void:
	var glow_triangle := PackedVector2Array()
	var centroid := (triangle[0] + triangle[1] + triangle[2]) / 3.0

	for point in triangle:
		glow_triangle.append(centroid + (point - centroid) * 1.12)

	draw_colored_polygon(
		glow_triangle,
		Color(SPIKE_COLOR.r, SPIKE_COLOR.g, SPIKE_COLOR.b, 0.14)
	)
	draw_colored_polygon(triangle, SPIKE_COLOR)

	var outline := PackedVector2Array(triangle)
	outline.append(triangle[0])
	draw_polyline(outline, Color.WHITE, 2.2, true)


func _draw_impact_lines() -> void:
	if not ball_alive:
		return

	for line_data in impact_lines:
		var color: Color = line_data["color"]
		var anchor: Vector2 = line_data["anchor"]

		draw_line(
			anchor,
			ball_position,
			Color(color.r, color.g, color.b, 0.045),
			18.0,
			true
		)
		draw_line(
			anchor,
			ball_position,
			Color(color.r, color.g, color.b, 0.16),
			8.0,
			true
		)
		draw_line(anchor, ball_position, color, 2.8, true)


func _get_ball_color() -> Color:
	return Color.from_hsv(
		fmod(0.12 + float(hit_count) * 0.045, 1.0),
		0.72,
		1.0
	)


func _draw_ball() -> void:
	var color := _get_ball_color()

	for i in range(trail.size()):
		var ratio := float(i + 1) / float(maxi(1, trail.size()))
		draw_circle(
			trail[i],
			ball_radius * ratio * 0.72,
			Color(color.r, color.g, color.b, ratio * 0.14)
		)

	draw_circle(
		ball_position,
		ball_radius * 3.2,
		Color(color.r, color.g, color.b, 0.05)
	)
	draw_circle(
		ball_position,
		ball_radius * 2.0,
		Color(color.r, color.g, color.b, 0.14)
	)
	draw_circle(ball_position, ball_radius, color)
	draw_circle(
		ball_position + Vector2(-ball_radius * 0.23, -ball_radius * 0.23),
		maxf(3.0, ball_radius * 0.22),
		Color.WHITE
	)


func _add_flash(position: Vector2, color: Color) -> void:
	flashes.append({
		"position": position,
		"color": color,
		"life": 0.30,
		"max_life": 0.30
	})


func _add_explosion_ring(
	position: Vector2,
	color: Color,
	life: float,
	start_radius: float,
	end_radius: float
) -> void:
	explosion_rings.append({
		"position": position,
		"color": color,
		"life": life,
		"max_life": life,
		"start_radius": start_radius,
		"end_radius": end_radius
	})


func _spawn_impact_particles(position: Vector2, color: Color) -> void:
	var inward := (CENTER - position).normalized()

	for i in range(18):
		var direction := inward.rotated(rng.randf_range(-0.82, 0.82))
		particles.append({
			"position": position,
			"velocity": direction * rng.randf_range(80.0, 230.0),
			"color": color,
			"life": rng.randf_range(0.30, 0.65),
			"max_life": 0.65,
			"radius": rng.randf_range(2.8, 5.2)
		})


func _spawn_explosion_particles(position: Vector2) -> void:
	for i in range(82):
		var angle := rng.randf_range(0.0, TAU)
		var direction := Vector2(cos(angle), sin(angle))
		var color := SPIKE_COLOR if i % 3 != 0 else Color.WHITE
		particles.append({
			"position": position,
			"velocity": direction * rng.randf_range(150.0, 560.0),
			"color": color,
			"life": rng.randf_range(0.45, 1.0),
			"max_life": 1.0,
			"radius": rng.randf_range(3.0, 8.5)
		})


func _spawn_respawn_particles(position: Vector2) -> void:
	for i in range(24):
		var angle := TAU * float(i) / 24.0
		var direction := Vector2(cos(angle), sin(angle))
		particles.append({
			"position": position,
			"velocity": direction * rng.randf_range(90.0, 190.0),
			"color": BALL_BASE_COLOR,
			"life": 0.42,
			"max_life": 0.42,
			"radius": 4.0
		})


func _update_effects(delta: float) -> void:
	var alive_flashes: Array[Dictionary] = []

	for flash in flashes:
		flash["life"] = float(flash["life"]) - delta
		if float(flash["life"]) > 0.0:
			alive_flashes.append(flash)

	flashes = alive_flashes

	var alive_particles: Array[Dictionary] = []

	for particle in particles:
		particle["life"] = float(particle["life"]) - delta
		particle["position"] = (
			Vector2(particle["position"])
			+ Vector2(particle["velocity"]) * delta
		)
		particle["velocity"] = Vector2(particle["velocity"]) * 0.982

		if float(particle["life"]) > 0.0:
			alive_particles.append(particle)

	particles = alive_particles

	var alive_rings: Array[Dictionary] = []

	for ring in explosion_rings:
		ring["life"] = float(ring["life"]) - delta
		if float(ring["life"]) > 0.0:
			alive_rings.append(ring)

	explosion_rings = alive_rings


func _draw_effects() -> void:
	for flash in flashes:
		var ratio := clampf(
			float(flash["life"]) / float(flash["max_life"]),
			0.0,
			1.0
		)
		var color: Color = flash["color"]
		var radius := lerpf(85.0, 12.0, ratio)

		draw_arc(
			flash["position"],
			radius,
			0.0,
			TAU,
			42,
			Color(color.r, color.g, color.b, 0.78 * ratio),
			4.0,
			true
		)

	for ring in explosion_rings:
		var ratio := clampf(
			float(ring["life"]) / float(ring["max_life"]),
			0.0,
			1.0
		)
		var progress := 1.0 - ratio
		var color: Color = ring["color"]
		var radius := lerpf(
			float(ring["start_radius"]),
			float(ring["end_radius"]),
			progress
		)

		draw_arc(
			ring["position"],
			radius,
			0.0,
			TAU,
			64,
			Color(color.r, color.g, color.b, ratio),
			lerpf(10.0, 2.0, progress),
			true
		)

	for particle in particles:
		var ratio := clampf(
			float(particle["life"]) / float(particle["max_life"]),
			0.0,
			1.0
		)
		var color: Color = particle["color"]

		draw_circle(
			particle["position"],
			float(particle["radius"]) * ratio,
			Color(color.r, color.g, color.b, ratio)
		)


func _play_audio_slice() -> void:
	if music_stream == null or audio_players.is_empty() or audio_finished:
		return

	if stream_length <= 0.0:
		return

	var remaining_in_track := stream_length - audio_cursor
	if remaining_in_track <= 0.0:
		audio_finished = true
		return

	var slice_duration := minf(AUDIO_SLICE_SECONDS, remaining_in_track)
	var selected_index := -1
	var shortest_remaining := INF

	for i in range(audio_players.size()):
		if audio_remaining[i] <= 0.0:
			selected_index = i
			break

		if audio_remaining[i] < shortest_remaining:
			shortest_remaining = audio_remaining[i]
			selected_index = i

	var player := audio_players[selected_index]
	player.stop()
	player.play(audio_cursor)
	audio_remaining[selected_index] = slice_duration

	audio_cursor += slice_duration
	if audio_cursor >= stream_length - 0.0001:
		audio_cursor = stream_length
		audio_finished = true


func _update_audio(delta: float) -> void:
	for i in range(audio_players.size()):
		if audio_remaining[i] <= 0.0:
			continue

		audio_remaining[i] = float(audio_remaining[i]) - delta
		if audio_remaining[i] <= 0.0:
			audio_players[i].stop()
			audio_remaining[i] = 0.0


func _update_labels() -> void:
	score_label.text = "%d POINTS" % score
	hits_label.text = "%d contacts  •  %d explosions" % [hit_count, explosion_count]


func _start_recording() -> void:
	record_button.disabled = true
	record_button.text = "OUVERTURE..."

	var project_path := ProjectSettings.globalize_path("res://")
	var recordings_path := project_path.path_join("recordings")
	DirAccess.make_dir_recursive_absolute(recordings_path)

	var filename := (
		"square_spike_%s.avi"
		% Time.get_datetime_string_from_system().replace(":", "-")
	)
	var output_path := recordings_path.path_join(filename)

	var args := PackedStringArray([
		"--path", project_path,
		"--resolution", "1080x1920",
		"--write-movie", output_path,
		"--fixed-fps", "60",
		"--",
		"--recording"
	])

	var pid := OS.create_process(OS.get_executable_path(), args)

	if pid <= 0:
		record_button.disabled = false
		record_button.text = "ERREUR"
	else:
		record_button.text = "ENREGISTREMENT OUVERT"
		await get_tree().create_timer(1.0).timeout
		record_button.disabled = false
		record_button.text = "● ENREGISTRER"


func _stop_recording() -> void:
	record_button.disabled = true
	record_button.text = "SAUVEGARDE..."
	await get_tree().process_frame
	get_tree().quit()
