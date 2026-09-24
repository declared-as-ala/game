extends Node2D
## Standalone Godot 4 prototype. All positions use a 1080 x 1920 canvas.
## Adjust these in the Inspector on the main node.
@export var orbit_speed: float = 1.25
@export var launch_speed: float = 850.0
@export var show_aim: bool = true
@export var marble_radius: float = 15.0

const CYAN = Color("27e6ff")
const PURPLE = Color("b65cff")
const GOLD = Color("ffda67")
const RED = Color("ff3b62")
const WHITE = Color("f2f8ff")
const MUTED = Color("8191ac")
const CENTERS = [Vector2(260, 1460), Vector2(785, 1100), Vector2(285, 710), Vector2(805, 370)]
const RADII = [175.0, 165.0, 155.0, 130.0]
const COLORS = [CYAN, PURPLE, CYAN, GOLD]
const PAUSE_RECT = Rect2(925, 50, 100, 100)
const RESET_RECT = Rect2(55, 50, 100, 100)

var stage: int = 0
var station: int = 0
var angle: float = -1.15
var direction: float = -1.0
var ball: Vector2 = Vector2.ZERO
var velocity: Vector2 = Vector2.ZERO
var mode: String = "orbit"
var paused: bool = false
var elapsed: float = 0.0
var attempts: int = 1
var jumps: int = 0
var lock_timer: float = 0.0
var trail: Array[Vector2] = []
var hazards: Array[Vector2] = []
var burst: Array[Dictionary] = []
var sounds: Dictionary = {}
var font: Font

func _ready() -> void:
	font = ThemeDB.fallback_font
	for sound in ["launch", "capture", "fail", "win"]:
		var player := AudioStreamPlayer.new()
		player.stream = load("res://audio/" + sound + ".wav")
		player.volume_db = -10.0
		add_child(player)
		sounds[sound] = player
	reset_level()

func reset_level() -> void:
	station = 0
	angle = -1.15
	direction = -1.0
	mode = "orbit"
	paused = false
	jumps = 0
	lock_timer = 0.0
	trail.clear()
	burst.clear()
	ball = CENTERS[0] + Vector2.from_angle(angle) * RADII[0]
	hazards.assign([Vector2(160, 1110), Vector2(930, 1450), Vector2(550, 580)])
	if stage >= 1:
		hazards.append(Vector2(520, 940))
	if stage >= 2:
		hazards.append(Vector2(590, 1340))
	queue_redraw()

func play_sound(key: String) -> void:
	sounds[key].play()

func _unhandled_input(event: InputEvent) -> void:
	var tap: bool = false
	var point := Vector2(-1, -1)
	if event is InputEventScreenTouch and event.pressed:
		tap = true
		point = get_global_transform_with_canvas().affine_inverse() * event.position
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		tap = true
		point = get_global_mouse_position()
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_R:
			attempts += 1
			reset_level()
		elif event.keycode == KEY_P or event.keycode == KEY_ESCAPE:
			paused = not paused
		elif event.keycode == KEY_H:
			show_aim = not show_aim
		elif event.keycode == KEY_SPACE or event.keycode == KEY_ENTER:
			tap = true
	if not tap:
		return
	if PAUSE_RECT.has_point(point):
		paused = not paused
		return
	if RESET_RECT.has_point(point):
		attempts += 1
		reset_level()
		return
	if paused:
		paused = false
		return
	if lock_timer > 0.0:
		return
	if mode == "dead":
		attempts += 1
		reset_level()
	elif mode == "won":
		stage = (stage + 1) % 3
		attempts = 1
		reset_level()
	elif mode == "orbit":
		velocity = tangent() * launch_speed
		mode = "flight"
		jumps += 1
		play_sound("launch")

func tangent() -> Vector2:
	return Vector2(-sin(angle), cos(angle)) * direction

func _physics_process(delta: float) -> void:
	if paused:
		queue_redraw()
		return
	elapsed += delta
	lock_timer = maxf(0.0, lock_timer - delta)
	for i in range(burst.size() - 1, -1, -1):
		burst[i]["life"] -= delta
		burst[i]["position"] += burst[i]["velocity"] * delta
		if burst[i]["life"] <= 0.0:
			burst.remove_at(i)
	if mode == "orbit":
		angle += orbit_speed * (1.0 + stage * 0.15) * direction * delta
		ball = CENTERS[station] + Vector2.from_angle(angle) * RADII[station]
	elif mode == "flight":
		# Substeps prevent passing through an orbit or a hazard at high speed.
		var steps: int = maxi(1, int(ceil(velocity.length() * delta / 6.0)))
		for step in range(steps):
			ball += velocity * delta / float(steps)
			var hit: bool = false
			for hazard in hazards:
				if ball.distance_to(hazard) < 33.0 + marble_radius:
					fail()
					hit = true
					break
			if hit:
				break
			if station < CENTERS.size() - 1 and ball.distance_to(CENTERS[station + 1]) <= RADII[station + 1] + marble_radius:
				capture()
				break
			if not Rect2(-35, 175, 1150, 1555).has_point(ball):
				fail()
				break
	if mode == "orbit" or mode == "flight":
		trail.append(ball)
		if trail.size() > 32:
			trail.pop_front()
	queue_redraw()

func capture() -> void:
	station += 1
	var radial: Vector2 = (ball - CENTERS[station]).normalized()
	angle = radial.angle()
	direction = 1.0 if radial.cross(velocity) >= 0.0 else -1.0
	ball = CENTERS[station] + radial * RADII[station]
	mode = "orbit"
	particles(ball, COLORS[station])
	if station == CENTERS.size() - 1:
		mode = "won"
		lock_timer = 0.5
		play_sound("win")
	else:
		play_sound("capture")

func fail() -> void:
	mode = "dead"
	lock_timer = 0.45
	particles(ball, RED)
	play_sound("fail")

func particles(origin: Vector2, color: Color) -> void:
	for i in range(28):
		burst.append({"position": origin, "velocity": Vector2.from_angle(TAU * i / 28.0) * randf_range(90, 330), "life": 0.7, "color": color})

func text_center(value: String, y: float, size: int, color: Color = WHITE) -> void:
	var width: float = font.get_string_size(value, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	draw_string(font, Vector2((1080 - width) / 2, y), value, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)

func glow_ring(center: Vector2, radius: float, color: Color, width: float = 4.0) -> void:
	for layer in range(5, 0, -1):
		draw_arc(center, radius, 0, TAU, 128, Color(color, 0.018 * (6 - layer)), width + layer * 5, true)
	draw_arc(center, radius, 0, TAU, 128, color, width, true)

func glow_ball(center: Vector2, radius: float, color: Color) -> void:
	for layer in range(6, 0, -1):
		draw_circle(center, radius + layer * 5, Color(color, 0.035))
	draw_circle(center, radius, color)
	draw_circle(center - Vector2(radius * 0.22, radius * 0.22), radius * 0.35, Color(1, 1, 1, 0.65))

func aim_is_clear() -> bool:
	var ray: Vector2 = tangent()
	var offset: Vector2 = CENTERS[station + 1] - ball
	var along: float = offset.dot(ray)
	if along < 0.0 or absf(offset.cross(ray)) > RADII[station + 1]:
		return false
	for hazard in hazards:
		var relative: Vector2 = hazard - ball
		if relative.dot(ray) > 0 and relative.dot(ray) < along and absf(relative.cross(ray)) < 33.0 + marble_radius:
			return false
	return true

func _draw() -> void:
	if font == null:
		return
	text_center("O R B I T", 105, 65)
	text_center("NIVEAU %02d   /   03" % (stage + 1), 157, 23, MUTED)
	# Pause and restart are real touch targets.
	draw_arc(PAUSE_RECT.get_center(), 37, 0, TAU, 40, MUTED, 2, true)
	draw_line(Vector2(965, 84), Vector2(965, 116), WHITE, 5)
	draw_line(Vector2(985, 84), Vector2(985, 116), WHITE, 5)
	draw_arc(RESET_RECT.get_center(), 28, -0.8, 4.5, 40, MUTED, 3, true)
	draw_colored_polygon(PackedVector2Array([Vector2(102, 62), Vector2(91, 79), Vector2(111, 80)]), MUTED)
	for i in range(CENTERS.size()):
		var center: Vector2 = CENTERS[i]
		var color: Color = COLORS[i]
		if i < station:
			color = Color(color, 0.3)
		glow_ring(center, RADII[i], color)
		draw_arc(center, 46, 0, TAU, 64, Color(color, 0.3), 1.5, true)
		glow_ball(center, 24.0 + sin(elapsed * 2 + i) * 2, color)
		var label_text: String = "ARRIVÉE" if i == 3 else "%02d" % (i + 1)
		var width: float = font.get_string_size(label_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 23).x
		draw_string(font, center + Vector2(-width / 2, -RADII[i] - 24), label_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 23, color)
	for hazard in hazards:
		var points := PackedVector2Array()
		for i in range(3):
			points.append(hazard + Vector2.from_angle(-PI / 2 + i * TAU / 3 + elapsed * 0.4) * 33)
		points.append(points[0])
		for layer in range(3, 0, -1):
			draw_polyline(points, Color(RED, 0.06), 5 + layer * 6, true)
		draw_polyline(points, RED, 4, true)
	if show_aim and mode == "orbit" and station < 3:
		var tint: Color = Color("6effbd") if aim_is_clear() else Color(WHITE, 0.4)
		for i in range(1, 16):
			draw_circle(ball + tangent() * i * 22, 2.5, Color(tint, tint.a * (1.0 - i / 18.0)))
	for i in range(1, trail.size()):
		var fraction: float = float(i) / trail.size()
		draw_line(trail[i - 1], trail[i], Color(COLORS[station], fraction * 0.45), fraction * 15 + 1, true)
	if mode != "dead":
		glow_ball(ball, marble_radius, WHITE)
	for p in burst:
		draw_circle(p["position"], 4, Color(p["color"], p["life"] / 0.7))
	for i in range(4):
		draw_circle(Vector2(486 + i * 36, 1735), 6, COLORS[i] if i <= station else Color("263143"))
	text_center("TOUCHE POUR QUITTER L’ORBITE", 1800, 28)
	text_center("Vise l’orbite suivante • Évite les triangles", 1840, 23, MUTED)
	text_center("ESSAI %02d     •     %d SAUTS" % [attempts, jumps], 1890, 20, MUTED)
	if mode == "dead" or mode == "won" or paused:
		draw_rect(Rect2(0, 0, 1080, 1920), Color(0.005, 0.008, 0.018, 0.85))
		var title: String = "PAUSE" if paused else ("ORBITE ATTEINTE !" if mode == "won" else "ENCORE UN ESSAI ?")
		text_center(title, 870, 50, GOLD if mode == "won" else WHITE)
		var subtitle: String = "Touche pour reprendre" if paused else ("Touche pour le niveau suivant" if mode == "won" else "Touche pour recommencer")
		text_center(subtitle, 955, 29, MUTED)
		if mode == "dead" and not paused:
			text_center("Le pointillé vert indique une bonne direction.", 1020, 24, CYAN)
