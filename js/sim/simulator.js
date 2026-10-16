/* Loaded in order by js/sim/boot.js. Do not load this file on its own. */
const $ = id => document.getElementById(id);

let isRunning = false;
globalThis.__simRun = { get on() { return isRunning; } };
let currentWireColor = '#15803d';
let components = [];
let wires = [];
let view = { x: 0, y: 0, z: 1 };
let nextCompId = 1;
let selectedPin = null;
let pinStates = {};
let serialInputQueue = [];
let serialPaused = false;
let serialBuffer = '';
let serialShowTime = false;
let serialBaud = 0;
let labRunOk = false;
let labActivity = false;
let projectName = 'Untitled';
let activeProjectId = '';
let projectDirty = false;
let scopeData = new Array(80).fill(0);
let scopeAnimId = null;
let executionStartTime = 0;

let audioCtx = null;
let activeOscillators = {};

const PART_NAMES = {
  led_r: 'Red LED', led_y: 'Yellow LED', led_g: 'Green LED', led_b: 'Blue LED', rgb: 'RGB LED', btn: 'Push button',
  pot: 'Potentiometer', ultrasonic: 'HC-SR04', servo: 'SG90', buz: 'Buzzer',
  pir: 'PIR sensor', relay: 'Relay', ldr: 'LDR', soil: 'Soil moisture', dht: 'DHT11', seg7: '7-segment',
  lcd: 'LCD 16×2', oled: 'OLED 0.96"', lamp: 'Lamp', fan: 'DC motor', pump: 'Water pump', switch: 'Slide switch',
  res: 'Resistor', bat: 'Battery'
};

const COMP_SPECS = {
  led_r: { name: '🔴 LED (Red)', pins: ['ANODE', 'CATHODE'], color: '#ef4444' },
  led_y: { name: '🟡 LED (Yellow)', pins: ['ANODE', 'CATHODE'], color: '#eab308' },
  led_g: { name: '🟢 LED (Green)', pins: ['ANODE', 'CATHODE'], color: '#22c55e' },
  led_b: { name: '🔵 LED (Blue)', pins: ['ANODE', 'CATHODE'], color: '#3b82f6' },
  rgb: { name: '🌈 RGB LED', pins: ['R', 'G', 'B', 'GND'] },
  btn: { name: '🔘 Push Button', pins: ['PIN1', 'PIN2'] },
  pot: { name: '🎛 Potentiometer', pins: ['VCC', 'OUT', 'GND'] },
  ultrasonic: { name: '🦇 HC-SR04', pins: ['VCC', 'TRIG', 'ECHO', 'GND'] },
  servo: { name: '🦾 Servo Motor', pins: ['PWM', 'VCC', 'GND'] },
  buz: { name: '🔊 Buzzer', pins: ['POS', 'GND'] },
  pir: { name: '🚶‍♂️ PIR Motion', pins: ['VCC', 'OUT', 'GND'] },
  relay: { name: '⚡ Relay Module', pins: ['IN', 'VCC', 'GND', 'COM', 'NO'] },
  ldr: { name: '☀️ LDR Sensor', pins: ['VCC', 'OUT', 'GND'] },
  soil: { name: '🌱 Soil Moisture', pins: ['VCC', 'OUT', 'GND'] },
  dht: { name: '🌡 DHT11', pins: ['VCC', 'DATA', 'GND'] },
  seg7: { name: '🔢 7-Segment', pins: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'COM'] },
  lcd: { name: '🖥 LCD 16x2', pins: ['VCC', 'GND', 'SDA', 'SCL'] },
  oled: { name: '🟦 OLED 0.96"', pins: ['VCC', 'GND', 'SDA', 'SCL'] },
  lamp: { name: '💡 Lamp', pins: ['POS', 'GND'] },
  fan: { name: '🌀 Fan/Motor', pins: ['POS', 'GND'] },
  pump: { name: '💧 Water Pump', pins: ['POS', 'GND'] },
  switch: { name: '🎚 Slide Switch', pins: ['PIN1', 'PIN2'] },
  res: { name: '🟤 Resistor', pins: ['A', 'B'] },
  bat: { name: '🔋 Battery', pins: ['NEG', 'POS'] }
};

// Global Keyboard listener for push buttons (Press Spacebar to activate button)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    components.filter(c => c.type === 'btn').forEach(btn => {
      btn.state.pressed = true;
    });
    renderComponents();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    components.filter(c => c.type === 'btn').forEach(btn => {
      btn.state.pressed = false;
    });
    renderComponents();
  }
});

function toggleTheme() {
  const cur = document.body.getAttribute('data-theme');
  document.body.setAttribute('data-theme', cur === 'light' ? 'dark' : 'light');
}

function handleCodeTab(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    e.target.value = e.target.value.substring(0, start) + '  ' + e.target.value.substring(end);
    e.target.selectionStart = e.target.selectionEnd = start + 2;
  }
}

function pinHole(pin, label, title, pwm) {
  return `<div class="pin-node${pwm ? ' is-pwm' : ''}" data-pin="${pin}" title="${title}"><i class="hole"></i><span>${label}</span></div>`;
}

let boardId = 'uno';

function initArduinoBoardUI() {
  if (boardId === 'esp32') { initEsp32BoardUI(); return; }
  const pwm = { '11': 1, '10': 1, '9': 1, '6': 1, '5': 1, '3': 1 };
  const digital = [
    ['SCL', 159, 'SCL', 'SCL (A5)'], ['SDA', 177, 'SDA', 'SDA (A4)'],
    ['AREF', 195, 'AREF', 'AREF'], ['GND3', 213, 'GND', 'GND'],
    ['13', 231], ['12', 249], ['11', 267], ['10', 285], ['9', 303], ['8', 321],
    ['7', 349], ['6', 367], ['5', 385], ['4', 403], ['3', 421], ['2', 439], ['1', 457], ['0', 475]
  ];
  const bottom = [
    ['IOREF', 160, 'IOREF', 'IOREF (5V)'], ['RESET', 178, 'RESET', 'RESET'],
    ['3V3', 196, '3.3V', '3.3V'], ['5V', 214, '5V', '5V'],
    ['GND', 232, 'GND', 'GND'], ['GND2', 250, 'GND', 'GND'], ['VIN', 268, 'Vin', 'Vin'],
    ['A0', 322, 'A0', 'A0'], ['A1', 340, 'A1', 'A1'], ['A2', 358, 'A2', 'A2'],
    ['A3', 376, 'A3', 'A3'], ['A4', 394, 'A4', 'A4'], ['A5', 412, 'A5', 'A5']
  ];
  const place = (parent, pin, cx, cy, label, title, isPwm) => {
    const el = document.createElement('div');
    el.className = 'pin-node' + (isPwm ? ' is-pwm' : '');
    el.dataset.pin = pin;
    el.title = title;
    el.style.left = (cx / 540 * 100) + '%';
    el.style.top = (cy / 400 * 100) + '%';
    el.innerHTML = `<i class="hole"></i><span>${label}</span>`;
    parent.appendChild(el);
  };
  const digitalHost = $('digital-pins');
  const powerHost = $('power-analog-pins');
  digitalHost.innerHTML = '';
  powerHost.innerHTML = '';
  digital.forEach(([pin, cx, label, title]) => {
    const name = label || pin;
    const tip = title || (pin === '1' ? 'TX (D1)' : pin === '0' ? 'RX (D0)' : (pwm[pin] ? 'PWM D' + pin : 'D' + pin));
    place(digitalHost, pin, cx, 55, name, tip, !!pwm[pin]);
  });
  bottom.forEach(([pin, cx, label, title]) => place(powerHost, pin, cx, 325, label, title || label, false));
}

function initEsp32BoardUI() {
  const x0 = 168, pitch = 34, W = 720, H = 300;
  const top = [
    ['3V3', '3V3', '3V3'], ['GND', 'GND', 'GND'], ['15', '15', 'GPIO15'], ['2', '2', 'GPIO2 (LED)'],
    ['4', '4', 'GPIO4'], ['16', '16', 'GPIO16 RX2'], ['17', '17', 'GPIO17 TX2'], ['5', '5', 'GPIO5'],
    ['18', '18', 'GPIO18'], ['19', '19', 'GPIO19'], ['21', '21', 'GPIO21 SDA'], ['3', '3', 'GPIO3 RX'],
    ['1', '1', 'GPIO1 TX'], ['22', '22', 'GPIO22 SCL'], ['23', '23', 'GPIO23']
  ];
  const bottom = [
    ['VIN', 'VIN', 'VIN (5V)'], ['GND2', 'GND', 'GND'], ['13', '13', 'GPIO13'], ['12', '12', 'GPIO12'],
    ['14', '14', 'GPIO14'], ['27', '27', 'GPIO27'], ['26', '26', 'GPIO26'], ['25', '25', 'GPIO25'],
    ['33', '33', 'GPIO33'], ['32', '32', 'GPIO32'], ['35', '35', 'GPIO35 input'], ['34', '34', 'GPIO34 input'],
    ['39', 'VN', 'GPIO39 VN'], ['36', 'VP', 'GPIO36 VP'], ['EN', 'EN', 'EN']
  ];
  const place = (parent, pin, cx, cy, label, title) => {
    const el = document.createElement('div');
    el.className = 'pin-node';
    el.dataset.pin = pin;
    el.title = title;
    el.style.left = (cx / W * 100) + '%';
    el.style.top = (cy / H * 100) + '%';
    el.innerHTML = `<i class="hole"></i><span>${label}</span>`;
    parent.appendChild(el);
  };
  const digitalHost = $('digital-pins');
  const powerHost = $('power-analog-pins');
  digitalHost.innerHTML = '';
  powerHost.innerHTML = '';
  top.forEach(([pin, label, title], i) => place(digitalHost, pin, x0 + i * pitch, 45, label, title));
  bottom.forEach(([pin, label, title], i) => place(powerHost, pin, x0 + i * pitch, 255, label, title));
}

function setBoard(id) {
  const next = id === 'esp32' ? 'esp32' : 'uno';
  const changed = next !== boardId;
  boardId = next;
  const board = $('arduino-uno');
  if (board) {
    board.classList.toggle('board-esp32', boardId === 'esp32');
    const img = board.querySelector('.uno-face');
    if (img) img.src = boardId === 'esp32' ? 'assets/svg/esp32-devkit.svg' : 'assets/svg/arduino-uno.svg?v=r3';
  }
  const scope = $('scope-pin');
  if (scope) scope.textContent = boardId === 'esp32' ? 'GPIO2' : 'D13';
  const sel = $('board-select');
  if (sel && sel.value !== boardId) sel.value = boardId;
  initArduinoBoardUI();
  try {
    const key = 'edu-platform-progress';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    const mid = boardId === 'esp32' ? 'simulator/esp32' : 'simulator/arduino-uno';
    if (!data[mid] || data[mid].status !== 'complete') data[mid] = { status: 'started', at: Date.now() };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
  if (typeof renderWires === 'function') renderWires();
  if (changed) histRemember();
}

function autoWireColor(type, pinId) {
  if (type === 'bb') {
    const n = holeNet(pinId);
    if (n === 'tp' || n === 'bp') return '#dc2626';
    if (n === 'tn' || n === 'bn') return '#171717';
    return null;
  }
  if (type !== 'ard') return null;
  if (pinId === 'GND' || pinId === 'GND2' || pinId === 'GND3') return '#171717';
  if (pinId === '5V' || pinId === '3V3' || pinId === 'VIN' || pinId === 'IOREF') return '#dc2626';
  return null;
}

function handlePinClick(type, pinId) {
  const pin = { type, pinId };
  if (!drawing) beginDraw(pin, null);
  else if (samePin(drawing.from, pin) && !drawing.bends.length) cancelDraw();
  else if (!samePin(drawing.from, pin)) finishDraw(pin);
}

function highlightSelectedPin(target, enable) {
  let selector = target.type === 'ard'
    ? `.pin-node[data-pin="${target.pinId}"]`
    : target.type === 'bb'
      ? `.bb-hole[data-hole="${target.pinId}"]`
      : `.term-pin[data-pin-id="${target.pinId}"]`;
  const el = document.querySelector(selector);
  if (el) {
    if (enable) el.classList.add('wire-source');
    else el.classList.remove('wire-source');
  }
}

function setWireColor(color, el) {
  currentWireColor = color;
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
  const dot = el || document.querySelector(`.color-dot[data-color="${color}"]`);
  if (dot) dot.classList.add('selected');
  if (drawing) renderPreview();
}

function clearWires() {
  wires = [];
  renderWires();
  histRemember();
}

function removeWire(wireId) {
  wires = wires.filter(w => w.id !== wireId);
  renderWires();
  histRemember();
}

function stagePoint(clientX, clientY) {
  const s = $('stage').getBoundingClientRect();
  return { x: (clientX - s.left) / view.z, y: (clientY - s.top) / view.z };
}
function applyView() {
  const stage = $('stage');
  if (stage) {
    const z = view.z || 1;
    stage.style.right = 'auto';
    stage.style.bottom = 'auto';
    stage.style.width = (100 / z) + '%';
    stage.style.height = (100 / z) + '%';
    stage.style.transform = `translate(${view.x}px, ${view.y}px) scale(${z})`;
  }
  const lbl = $('zoom-lbl');
  if (lbl) lbl.textContent = Math.round(view.z * 100) + '%';
  paintCanvasSurface();
}
function zoomBy(factor) {
  const ws = $('workspace').getBoundingClientRect();
  const old = view.z;
  const next = Math.min(2.6, Math.max(0.35, old * factor));
  view.x = ws.width / 2 - (ws.width / 2 - view.x) * (next / old);
  view.y = ws.height / 2 - (ws.height / 2 - view.y) * (next / old);
  view.z = next;
  applyView();
}
function resetView() {
  view.x = 0;
  view.y = 0;
  view.z = 1;
  applyView();
}
function restoreView(v) {
  if (!v || typeof v.z !== 'number') return;
  view = { x: Number(v.x) || 0, y: Number(v.y) || 0, z: Math.min(2.6, Math.max(0.35, Number(v.z) || 1)) };
  applyView();
}
const CANVAS_BG = [
  { name: 'Graphite', color: '#2b3036', grid: 'rgba(255,255,255,.04)', ink: '#e5e7eb' },
  { name: 'Midnight', color: '#0b1220', grid: 'rgba(148,163,184,.12)', ink: '#e5e7eb' },
  { name: 'Light', color: '#f4f4f5', grid: 'rgba(15,23,42,.08)', ink: '#18181b' },
  { name: 'Blueprint', color: '#16324f', grid: 'rgba(186,230,253,.16)', ink: '#e0f2fe' }
];
let canvasBgIndex = 0;
let gridVisible = true;
function paintCanvasSurface() {
  const mode = CANVAS_BG[canvasBgIndex] || CANVAS_BG[0];
  const stage = $('stage');
  const ws = $('workspace');
  if (stage) {
    stage.style.background = 'transparent';
  }
  if (!ws) return;
  ws.style.backgroundColor = mode.color;
  if (!gridVisible) {
    ws.style.backgroundImage = 'none';
    return;
  }
  const cell = 16 * (view.z || 1);
  const line = Math.max(1, cell / 16);
  const bars = mode.grid + ' 0, ' + mode.grid + ' ' + line + 'px, transparent ' + line + 'px, transparent ' + cell + 'px';
  ws.style.backgroundImage = 'repeating-linear-gradient(to bottom, ' + bars + '), repeating-linear-gradient(to right, ' + bars + ')';
  ws.style.backgroundSize = 'auto';
  ws.style.backgroundPosition = (view.x || 0) + 'px ' + (view.y || 0) + 'px';
}
function setGridVisible(on) {
  gridVisible = !!on;
  const box = $('grid-toggle');
  if (box) box.checked = gridVisible;
  try { localStorage.setItem('arduino_canvas_grid', gridVisible ? '1' : '0'); } catch (e) {}
  paintCanvasSurface();
}
function applyCanvasBg(index) {
  const count = CANVAS_BG.length;
  canvasBgIndex = ((index % count) + count) % count;
  const mode = CANVAS_BG[canvasBgIndex];
  paintCanvasSurface();
  const btn = $('canvas-bg');
  if (btn) {
    btn.style.setProperty('--swatch', mode.color);
    btn.title = 'Canvas: ' + mode.name;
    btn.setAttribute('aria-label', 'Canvas background ' + mode.name);
    const name = $('canvas-bg-name');
    if (name) name.textContent = mode.name;
  }
  try { localStorage.setItem('arduino_canvas_bg', String(canvasBgIndex)); } catch (e) {}
}
function cycleCanvasBg() {
  applyCanvasBg(canvasBgIndex + 1);
}
function onViewWheel(e) {
  e.preventDefault();
  const ws = $('workspace').getBoundingClientRect();
  const mx = e.clientX - ws.left;
  const my = e.clientY - ws.top;
  const old = view.z;
  const next = Math.min(2.6, Math.max(0.35, old * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  if (Math.abs(next - old) < 0.001) return;
  view.x = mx - (mx - view.x) * (next / old);
  view.y = my - (my - view.y) * (next / old);
  view.z = next;
  applyView();
}
let panDrag = null;
let panMode = false;
let marquee = null;
let selectedIds = new Set();
let dragGroup = null;
function togglePanMode() {
  panMode = !panMode;
  const b = $('pan-mode');
  const ws = $('workspace');
  if (b) { b.classList.toggle('on', panMode); b.setAttribute('aria-pressed', panMode ? 'true' : 'false'); }
  if (ws) ws.classList.toggle('pan-mode', panMode);
}
function onPanDown(e) {
  if (drawing || dragItem || boardDrag || bbDrag || marquee) return;
  if (e.button != null && e.button !== 0 && e.button !== 1) return;
  if (e.target.closest('.view-hud, button, input, .edge-drag, .parts-pop, .prop-pop')) return;
  const onPart = e.target.closest('.comp-box, .arduino-board, .breadboard, .pin-node, .term-pin, .bb-hole, .jumper');
  if (e.button === 0 && onPart) return;
  if (e.button === 1 || panMode) {
    if (e.button === 1) e.preventDefault();
    panDrag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    $('workspace').classList.add('panning');
    document.addEventListener('pointermove', onPanMove);
    document.addEventListener('pointerup', onPanUp);
    return;
  }
  beginMarquee(e);
}
function onPanMove(e) {
  if (!panDrag) return;
  view.x = panDrag.vx + (e.clientX - panDrag.x);
  view.y = panDrag.vy + (e.clientY - panDrag.y);
  applyView();
}
function onPanUp() {
  panDrag = null;
  const ws = $('workspace');
  if (ws) ws.classList.remove('panning');
  document.removeEventListener('pointermove', onPanMove);
  document.removeEventListener('pointerup', onPanUp);
}
function setSelected(ids) {
  selectedIds = new Set(ids);
  document.querySelectorAll('.comp-box.selected, .arduino-board.selected').forEach(el => el.classList.remove('selected'));
  selectedIds.forEach(id => {
    const el = id === 'arduino' ? $('arduino-uno') : $('comp-' + id);
    if (el && !el.classList.contains('is-closed')) el.classList.add('selected');
  });
  const del = $('sel-delete');
  if (del) del.disabled = ![...selectedIds].some(id => id !== 'arduino');
}
function beginMarquee(e) {
  const ws = $('workspace');
  const r = ws.getBoundingClientRect();
  marquee = {
    x0: e.clientX, y0: e.clientY,
    sx: e.clientX - r.left, sy: e.clientY - r.top,
    base: e.shiftKey ? new Set(selectedIds) : new Set(),
    moved: false
  };
  const box = document.createElement('div');
  box.id = 'marquee';
  box.className = 'marquee';
  ws.appendChild(box);
  document.addEventListener('pointermove', onMarqueeMove);
  document.addEventListener('pointerup', onMarqueeUp);
}
function onMarqueeMove(e) {
  if (!marquee) return;
  if (Math.hypot(e.clientX - marquee.x0, e.clientY - marquee.y0) > 4) marquee.moved = true;
  const ws = $('workspace').getBoundingClientRect();
  const x1 = e.clientX - ws.left, y1 = e.clientY - ws.top;
  const box = $('marquee');
  if (box) {
    box.style.left = Math.min(marquee.sx, x1) + 'px';
    box.style.top = Math.min(marquee.sy, y1) + 'px';
    box.style.width = Math.abs(x1 - marquee.sx) + 'px';
    box.style.height = Math.abs(y1 - marquee.sy) + 'px';
  }
  const area = {
    l: Math.min(marquee.x0, e.clientX), t: Math.min(marquee.y0, e.clientY),
    r: Math.max(marquee.x0, e.clientX), b: Math.max(marquee.y0, e.clientY)
  };
  const sel = new Set(marquee.base);
  function hits(el) {
    if (!el || el.classList.contains('is-closed')) return false;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) return false;
    return b.left < area.r && b.right > area.l && b.top < area.b && b.bottom > area.t;
  }
  components.forEach(c => { if (hits($('comp-' + c.id))) sel.add(c.id); });
  if (hits($('arduino-uno'))) sel.add('arduino');
  setSelected(sel);
}
function onMarqueeUp() {
  const moved = marquee && marquee.moved;
  document.removeEventListener('pointermove', onMarqueeMove);
  document.removeEventListener('pointerup', onMarqueeUp);
  const box = $('marquee');
  if (box) box.remove();
  if (marquee && !moved) setSelected([]);
  marquee = null;
}
function deleteSelected() {
  const ids = new Set([...selectedIds].filter(id => id !== 'arduino'));
  if (!ids.size) return;
  components = components.filter(c => !ids.has(c.id));
  wires = wires.filter(w => {
    const from = w.from.type === 'comp' ? w.from.pinId.split('-')[0] : '';
    const to = w.to.type === 'comp' ? w.to.pinId.split('-')[0] : '';
    return !ids.has(from) && !ids.has(to);
  });
  setSelected([]);
  closeProps();
  renderComponents();
  renderWires();
  histRemember();
}
$('workspace').addEventListener('wheel', onViewWheel, { passive: false });
$('workspace').addEventListener('pointerdown', onPanDown);

function getPinCoords(pinRef) {
  let el = null;
  if (pinRef.type === 'ard' && $('arduino-uno') && $('arduino-uno').classList.contains('is-closed')) return null;
  if (pinRef.type === 'ard') {
    el = document.querySelector(`.pin-node[data-pin="${pinRef.pinId}"]`);
  } else if (pinRef.type === 'bb') {
    el = document.querySelector(`.bb-hole[data-hole="${CSS.escape(pinRef.pinId)}"]`);
  } else {
    el = document.querySelector(`.term-pin[data-pin-id="${pinRef.pinId}"]`);
  }
  if (!el) return { x: 0, y: 0 };
  const r = el.getBoundingClientRect();
  return stagePoint(r.left + r.width / 2, r.top + r.height / 2);
}

function wireRim(color) {
  const hex = String(color || '').replace('#', '');
  if (hex.length !== 6) return 'rgba(0,0,0,.55)';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 80 ? '#e4e4e7' : 'rgba(0,0,0,.55)';
}

function pinLeavesUp(ref) {
  if (!ref || ref.type !== 'ard') return false;
  const el = document.querySelector(`.pin-node[data-pin="${ref.pinId}"]`);
  return !!(el && el.closest('#digital-pins'));
}

function pinExit(ref) {
  if (!ref || ref.type !== 'ard') return { x: 0, y: 1 };
  const digital = pinLeavesUp(ref);
  if (!boardVertical) return { x: 0, y: digital ? -1 : 1 };
  return digital ? { x: 1, y: 0 } : { x: -1, y: 0 };
}

function roundedOrtho(points, radius) {
  const pts = [];
  for (const p of points) {
    const q = pts[pts.length - 1];
    if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 0.8) pts.push(p);
  }
  if (pts.length < 2) return '';
  const f = n => n.toFixed(1);
  if (pts.length === 2) return `M ${f(pts[0].x)} ${f(pts[0].y)} L ${f(pts[1].x)} ${f(pts[1].y)}`;
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1], cur = pts[i], next = pts[i + 1];
    const v1x = cur.x - prev.x, v1y = cur.y - prev.y;
    const v2x = next.x - cur.x, v2y = next.y - cur.y;
    const len1 = Math.hypot(v1x, v1y) || 1;
    const len2 = Math.hypot(v2x, v2y) || 1;
    if (Math.abs(v1x * v2y - v1y * v2x) < 1) {
      d += ` L ${f(cur.x)} ${f(cur.y)}`;
      continue;
    }
    const rad = Math.min(radius, len1 / 2.2, len2 / 2.2);
    d += ` L ${f(cur.x - (v1x / len1) * rad)} ${f(cur.y - (v1y / len1) * rad)} Q ${f(cur.x)} ${f(cur.y)} ${f(cur.x + (v2x / len2) * rad)} ${f(cur.y + (v2y / len2) * rad)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${f(last.x)} ${f(last.y)}`;
  return d;
}

function jumperPath(p1, p2, from, to, index) {
  const lane = 14 + (index % 5) * 7;
  const dir = pinExit(from);
  const a = { x: p1.x + dir.x * lane, y: p1.y + dir.y * lane };
  const pts = [p1, a];
  if (Math.abs(a.x - p2.x) > 1 && Math.abs(a.y - p2.y) > 1) pts.push({ x: p2.x, y: a.y });
  pts.push(p2);
  return roundedOrtho(pts, 10);
}

function renderWires() {
  touchAdj();
  const svg = $('wires-svg');
  if (!svg) return;
  svg.innerHTML = wires.map((w, i) => {
    const p1 = getPinCoords(w.from);
    const p2 = getPinCoords(w.to);
    if (!p1 || !p2) return '';
    const d = (w.bends && w.bends.length) ? routePoints(p1, p2, w.from, w.bends) : jumperPath(p1, p2, w.from, w.to, i);
    const rim = wireRim(w.color);
    return `<g class="jumper" id="${w.id}">
      <path d="${d}" stroke="${rim}" stroke-width="6.2"/>
      <path class="jumper-core" d="${d}" stroke="${w.color}" stroke-width="3.3"/>
      <path d="${d}" stroke="rgba(255,255,255,.42)" stroke-width="1.2" pointer-events="none"/>
      <path d="${d}" stroke="transparent" stroke-width="14" onclick="recolorWire('${w.id}', event)" ondblclick="removeWire('${w.id}')"/>
    </g>`;
  }).join('') + previewMarkup();
  if (typeof pollResetPin === 'function') pollResetPin();
  if (typeof updateVisualOutputs === 'function') updateVisualOutputs();
}

const WIRE_PALETTE = ['#171717','#92400e','#dc2626','#f97316','#eab308','#15803d','#2563eb','#7c3aed','#f4f4f5'];
let drawing = null;
let previewPt = null;
let downOnEmpty = false;

function samePin(a, b) {
  return !!(a && b && a.type === b.type && a.pinId === b.pinId);
}

function pinRefOf(el) {
  if (!el || !el.closest) return null;
  const pin = el.closest('.pin-node, .term-pin, .bb-hole');
  if (!pin) return null;
  if (pin.classList.contains('pin-node')) return { type: 'ard', pinId: pin.dataset.pin };
  if (pin.classList.contains('bb-hole')) return { type: 'bb', pinId: pin.dataset.hole };
  return { type: 'comp', pinId: pin.dataset.pinId };
}

function pinAt(x, y) {
  const list = document.elementsFromPoint(x, y);
  for (const el of list) {
    const pin = pinRefOf(el);
    if (pin) return pin;
  }
  return null;
}

function wsPoint(e) {
  return stagePoint(e.clientX, e.clientY);
}

function snapPt(p) {
  const g = 8;
  return { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g };
}

function linkOrtho(pts, p) {
  const last = pts[pts.length - 1];
  if (Math.abs(last.x - p.x) > 1 && Math.abs(last.y - p.y) > 1) pts.push({ x: p.x, y: last.y });
  if (Math.hypot(last.x - p.x, last.y - p.y) > 0.8) pts.push({ x: p.x, y: p.y });
}

function routePoints(p1, p2, fromRef, bends) {
  const pts = [p1];
  const dir = pinExit(fromRef);
  pts.push({ x: p1.x + dir.x * 14, y: p1.y + dir.y * 14 });
  for (const b of (bends || [])) linkOrtho(pts, b);
  linkOrtho(pts, p2);
  return roundedOrtho(pts, 10);
}

function wireHint(msg, active) {
  const h = $('hint');
  if (!h) return;
  h.classList.toggle('active', !!active);
  h.innerText = msg;
}

function beginDraw(pin, e) {
  const auto = autoWireColor(pin.type, pin.pinId);
  if (auto) setWireColor(auto);
  drawing = { from: pin, bends: [], moved: false, sx: e ? e.clientX : 0, sy: e ? e.clientY : 0 };
  selectedPin = pin;
  highlightSelectedPin(pin, true);
  previewPt = e ? wsPoint(e) : getPinCoords(pin);
  $('workspace').classList.add('wiring');
  document.addEventListener('pointermove', onWirePointerMove);
  document.addEventListener('pointerup', onWirePointerUp);
  wireHint('Drop the wire on a pin or a breadboard hole.', true);
  renderPreview();
}

function finishDraw(pin) {
  if (!drawing || samePin(drawing.from, pin)) return;
  wires.push({
    id: 'wire-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    from: drawing.from,
    to: pin,
    color: currentWireColor,
    bends: drawing.bends.slice()
  });
  const from = drawing.from;
  drawing = null;
  selectedPin = null;
  previewPt = null;
  downOnEmpty = false;
  highlightSelectedPin(from, false);
  $('workspace').classList.remove('wiring');
  document.removeEventListener('pointermove', onWirePointerMove);
  document.removeEventListener('pointerup', onWirePointerUp);
  renderWires();
  wireHint('Wire connected. Click a pin to start the next one.', false);
  histRemember();
}

function cancelDraw() {
  if (drawing) highlightSelectedPin(drawing.from, false);
  drawing = null;
  selectedPin = null;
  previewPt = null;
  downOnEmpty = false;
  const ws = $('workspace');
  if (ws) ws.classList.remove('wiring');
  document.removeEventListener('pointermove', onWirePointerMove);
  document.removeEventListener('pointerup', onWirePointerUp);
  const prev = document.getElementById('wire-preview');
  if (prev) prev.remove();
  wireHint('Click a pin, then click the part leg.', false);
}

function previewMarkup() {
  if (!drawing || !previewPt) return '';
  const d = routePoints(getPinCoords(drawing.from), previewPt, drawing.from, drawing.bends);
  return `<g id="wire-preview" pointer-events="none">
    <path d="${d}" stroke="${currentWireColor}" stroke-width="3.6" stroke-dasharray="8 6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function renderPreview() {
  const svg = $('wires-svg');
  if (!svg) return;
  const prev = document.getElementById('wire-preview');
  const html = previewMarkup();
  if (!html) { if (prev) prev.remove(); return; }
  if (prev) prev.outerHTML = html;
  else svg.insertAdjacentHTML('beforeend', html);
}

function onWirePointerMove(e) {
  if (!drawing) return;
  if (Math.hypot(e.clientX - drawing.sx, e.clientY - drawing.sy) > 5) drawing.moved = true;
  previewPt = wsPoint(e);
  renderPreview();
}

function onWirePointerUp(e) {
  if (!drawing) return;
  const pin = pinAt(e.clientX, e.clientY);
  if (pin && !samePin(pin, drawing.from)) {
    finishDraw(pin);
    return;
  }
  if (downOnEmpty || (drawing.moved && !pin)) {
    drawing.bends.push(snapPt(wsPoint(e)));
    drawing.moved = false;
    downOnEmpty = false;
    drawing.sx = e.clientX;
    drawing.sy = e.clientY;
    previewPt = wsPoint(e);
    renderPreview();
  }
}

function onWirePointerDown(e) {
  if (e.button != null && e.button !== 0) return;
  const pin = pinRefOf(e.target);
  if (pin) {
    if (!drawing) beginDraw(pin, e);
    else if (samePin(drawing.from, pin) && !drawing.bends.length) cancelDraw();
    else if (!samePin(drawing.from, pin)) finishDraw(pin);
    return;
  }
  if (!drawing) return;
  if (e.target.closest && e.target.closest('.jumper')) return;
  const ws = $('workspace');
  if (!ws || !ws.contains(e.target)) return;
  if (e.target.closest('.comp-box, .arduino-board, button, input')) return;
  downOnEmpty = true;
}

document.addEventListener('pointerdown', onWirePointerDown);

function recolorWire(id, ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  if (drawing) return;
  if (ev && ev.detail > 1) return;
  const w = wires.find(x => x.id === id);
  if (!w) return;
  let next = currentWireColor;
  if (String(w.color).toLowerCase() === String(currentWireColor).toLowerCase()) {
    const i = WIRE_PALETTE.findIndex(c => c.toLowerCase() === String(w.color).toLowerCase());
    next = WIRE_PALETTE[(Math.max(i, 0) + 1) % WIRE_PALETTE.length];
    setWireColor(next);
  }
  w.color = next;
  renderWires();
  histRemember();
}

const PART_GAP = 52;

function boardSize() {
  const w = boardId === 'esp32' ? 680 : 486;
  const h = boardId === 'esp32' ? 283 : 360;
  return boardVertical ? { w: h, h: w, rawW: w, rawH: h } : { w, h, rawW: w, rawH: h };
}

function rowOrigin() {
  const size = boardSize();
  const startX = 16 + Math.round(size.w * 0.78);
  const top = 20;
  const ws = $('workspace');
  const maxRight = Math.max(startX + 240, ((ws ? ws.clientWidth : 1100) / (view.z || 1)) - 20);
  return { startX, top, maxRight };
}

function placeBoardBelow(rowBottom) {
  const board = $('arduino-uno');
  if (!board || board.classList.contains('is-closed')) return;
  const size = boardSize();
  const gap = 96;
  if (boardVertical) {
    const cy = rowBottom + gap + size.h / 2;
    arduinoPos.x = 16 + (size.rawW - size.w) / 2;
    arduinoPos.y = cy - size.rawH / 2;
  } else {
    arduinoPos.x = 16;
    arduinoPos.y = rowBottom + gap;
  }
  applyArduinoPos();
}

function layoutComponentsParallel() {
  const free = components.filter(c => !c.seat);
  if (!free.length) return;
  const origin = rowOrigin();
  free.forEach(c => { c.x = origin.startX; c.y = origin.top; });
  renderComponents();
  const sizes = free.map(c => {
    const el = $('comp-' + c.id);
    return { w: el ? el.offsetWidth : 72, h: el ? el.offsetHeight : 96 };
  });
  const rowH = Math.max(...sizes.map(s => s.h));
  const rowBottom = origin.top + rowH;
  let x = origin.startX;
  free.forEach((c, i) => {
    c.x = x;
    c.y = rowBottom - sizes[i].h;
    x += sizes[i].w + PART_GAP;
  });
  placeBoardBelow(rowBottom);
  renderComponents();
  renderWires();
  const ws = $('workspace');
  const size = boardSize();
  const needX = Math.max(x - PART_GAP + 28, arduinoPos.x + size.w + 24);
  const needY = arduinoPos.y + size.h + 20;
  const fitX = ws && needX > 0 ? (ws.clientWidth - 8) / needX : 1;
  const fitY = ws && needY > 0 ? (ws.clientHeight - 8) / needY : 1;
  view.x = 0;
  view.y = 0;
  view.z = Math.max(0.45, Math.min(1, fitX, fitY));
  applyView();
}

function nextPartPos() {
  const origin = rowOrigin();
  const loose = components.filter(c => !c.seat);
  if (!loose.length) return { x: origin.startX, y: origin.top };
  let best = loose[0];
  loose.forEach(c => { if (c.x > best.x) best = c; });
  const el = $('comp-' + best.id);
  const w = el ? el.offsetWidth : 80;
  return { x: best.x + w + PART_GAP, y: best.y };
}

function addComponent(type, x, y) {
  if (x === undefined || y === undefined) {
    const slot = nextPartPos();
    x = slot.x;
    y = slot.y;
  }
  
  const id = 'c' + nextCompId++;
  components.push({
    id,
    type,
    x,
    y,
    state: { value: 512, pressed: false, text: "Arduino Ready", angle: 0, distance: 25, temp: 28, hum: 60, motion: false, segNum: 0, relayOn: false, r: 0, g: 0, b: 0, ohms: 220, volts: 9 }
  });
  renderComponents();
  renderWires();
  histRemember();
  return id;
}

function removeComponent(id) {
  components = components.filter(c => c.id !== id);
  wires = wires.filter(w => !((w.from.type === 'comp' && w.from.pinId.startsWith(id)) || (w.to.type === 'comp' && w.to.pinId.startsWith(id))));
  renderComponents();
  renderWires();
  histRemember();
}

function renderComponents() {
  touchAdj();
  const container = $('comps-container');
  if (!container) return;
  container.innerHTML = components.map(c => {
    const spec = COMP_SPECS[c.type];
    if (!spec) return '';
    let bodyHtml = '';
    
    if (c.type === 'led_r' || c.type === 'led_y' || c.type === 'led_g' || c.type === 'led_b') {
      const file = c.type === 'led_g' ? 'led-green' : c.type === 'led_b' ? 'led-blue' : c.type === 'led_y' ? 'led-yellow' : 'led-red';
      bodyHtml = `<div class="led-part" id="led-node-${c.id}" style="--led:${spec.color}"><img src="assets/svg/${file}.svg" alt="" draggable="false"></div>`;
    } else if (c.type === 'rgb') {
      bodyHtml = `<div class="led-part rgb-led" id="rgb-node-${c.id}"><svg viewBox="0 0 48 64" width="40" height="52"><rect x="20" y="40" width="3" height="18" fill="#94a3b8"/><rect x="26" y="44" width="3" height="14" fill="#94a3b8"/><path class="dome" d="M10 40 L10 22 A14 14 0 0 1 38 22 L38 40 Z"/><ellipse cx="24" cy="40" rx="14" ry="4" fill="#27272a"/></svg></div>`;
    } else if (c.type === 'btn') {
      bodyHtml = `<button class="tact svg-btn${c.state.pressed ? ' down' : ''}" onmousedown="setCompVal('${c.id}', 'pressed', true)" onmouseup="setCompVal('${c.id}', 'pressed', false)" onmouseleave="setCompVal('${c.id}', 'pressed', false)" ontouchstart="setCompVal('${c.id}', 'pressed', true)" ontouchend="setCompVal('${c.id}', 'pressed', false)" title="Press"><img src="assets/svg/button.svg" alt="" draggable="false"></button>`;
    } else if (c.type === 'pot') {
      const ang = (Number(c.state.value) / 1023) * 270 - 135;
      bodyHtml = `<div class="pot-svg"><img class="part-art" src="assets/svg/pot.svg" alt="" draggable="false"><div class="pot-knob" style="transform:rotate(${ang}deg)"></div></div><span class="val-lbl">${labelFor(c)}</span>`;
    } else if (c.type === 'ldr') {
      bodyHtml = `<img class="part-art ldr-svg" src="assets/svg/ldr.svg" alt="" draggable="false"><span class="val-lbl">${labelFor(c)}</span>`;
    } else if (c.type === 'soil') {
      bodyHtml = `<img class="part-art soil-svg" src="assets/svg/soil.svg" alt="" draggable="false"><span class="val-lbl">${labelFor(c)}</span>`;
    } else if (c.type === 'ultrasonic') {
      bodyHtml = `<img class="part-art sr04-svg" src="assets/svg/hcsr04.svg" alt="" draggable="false"><span class="val-lbl">${labelFor(c)}</span>`;
    } else if (c.type === 'pir') {
      bodyHtml = `<button class="pir-dome svg-pir${c.state.motion ? ' active' : ''}" onclick="toggleCompBool('${c.id}', 'motion')" title="Toggle motion"><img src="assets/svg/pir.svg" alt="" draggable="false"></button>`;
    } else if (c.type === 'relay') {
      bodyHtml = `<div class="relay-svg"><img class="part-art" src="assets/svg/relay.svg" alt="" draggable="false"><i class="relay-switch${c.state.relayOn ? ' active' : ''}"></i></div>`;
    } else if (c.type === 'dht') {
      bodyHtml = `<img class="part-art dht-svg" src="assets/svg/dht11.svg" alt="" draggable="false"><span class="val-lbl">${labelFor(c)}</span>`;
    } else if (c.type === 'seg7') {
      bodyHtml = `<div class="seg-svg"><img class="part-art" src="assets/svg/seg7.svg" alt="" draggable="false"><div class="seg-display" id="seg-${c.id}">${c.state.segNum}</div></div>`;
    } else if (c.type === 'servo') {
      bodyHtml = `
        <div class="servo-svg">
          <img class="part-art" src="assets/svg/servo.svg" alt="" draggable="false">
          <div class="servo-horn" id="servo-horn-${c.id}" style="transform:rotate(${c.state.angle}deg)"></div>
        </div>
        <span class="val-lbl" id="servo-lbl-${c.id}">${c.state.angle}°</span>
      `;
    } else if (c.type === 'lcd') {
      bodyHtml = `<div class="lcd-svg"><img class="part-art" src="assets/svg/lcd.svg" alt="" draggable="false"><div class="lcd-screen" id="lcd-screen-${c.id}">${c.state.text}</div></div>`;
    } else if (c.type === 'oled') {
      bodyHtml = `<div class="oled-svg"><img class="part-art" src="assets/svg/oled.svg" alt="" draggable="false"><div class="oled-screen" id="oled-screen-${c.id}"></div></div>`;
    } else if (c.type === 'buz') {
      bodyHtml = `<div class="buzz-svg" id="buz-${c.id}"><img class="part-art" src="assets/svg/buzzer.svg" alt="" draggable="false"></div><span class="val-lbl" id="buz-lbl-${c.id}">off</span>`;
    } else if (c.type === 'lamp') {
      bodyHtml = `<div class="bulb-svg" id="lamp-${c.id}"><img class="part-art" src="assets/svg/bulb.svg" alt="" draggable="false"></div>`;
    } else if (c.type === 'fan') {
      bodyHtml = `<div class="fan-svg" id="fan-${c.id}"><img class="part-art" src="assets/svg/fan.svg" alt="" draggable="false"><img class="part-art fan-rotor" src="assets/svg/fan-rotor.svg" alt="" draggable="false"></div>`;
    } else if (c.type === 'pump') {
      bodyHtml = `<div class="pump-svg" id="pump-${c.id}"><img class="part-art" src="assets/svg/pump.svg" alt="" draggable="false"><img class="part-art pump-rotor" src="assets/svg/pump-rotor.svg" alt="" draggable="false"></div>`;
    } else if (c.type === 'switch') {
      bodyHtml = `<button class="slide svg-slide${c.state.on ? ' on' : ''}" onclick="toggleCompBool('${c.id}', 'on')" title="Toggle"><img src="assets/svg/switch.svg" alt="" draggable="false"><i></i></button>`;
    } else if (c.type === 'res') {
      bodyHtml = `<div class="res-body"><img class="part-art" src="assets/svg/resistor.svg" alt="" draggable="false"><span class="val-lbl">${labelFor(c)}</span></div>`;
    } else if (c.type === 'bat') {
      bodyHtml = `<div class="bat-body"><img class="part-art" src="assets/svg/battery.svg" alt="" draggable="false"><span class="val-lbl">${labelFor(c)}</span></div>`;
    }

    const lay = c.seat ? seatedLayout(c) : null;
    if (lay) { c.x = lay.x; c.y = lay.y; }
    const pinLabel = { ANODE: '+', CATHODE: '−', POS: '+', PIN1: '1', PIN2: '2', OUT: 'S', DATA: 'DAT', PWM: 'SIG', A: '1', B: '2', NEG: '−' };
    const sideOf = { A: 'l', B: 'r', NEG: 'l', POS: 'r' };
    const termPinsHtml = spec.pins.map(p => {
      const st = lay && lay.pins[p] ? ` style="left:${lay.pins[p].left}px;top:${lay.pins[p].top}px"` : '';
      const side = sideOf[p] ? ` data-side="${sideOf[p]}"` : '';
      return `<div class="term-pin" data-pin-id="${c.id}-${p}" data-lbl="${pinLabel[p] || p}" title="${p}"${side}${st}></div>`;
    }).join('');
    const side = (c.type === 'res' || c.type === 'bat') ? ' side-pins' : '';

    return `
      <div class="comp-box part part-${c.type}${side}${lay ? ' seated' : ''}${lay && lay.flat ? ' flat' : ''}${pickedId === c.id ? ' picked' : ''}${selectedIds.has(c.id) ? ' selected' : ''}" id="comp-${c.id}" style="left:${c.x}px; top:${c.y}px;${lay ? `width:${lay.w}px;height:${lay.h}px;` : ''}" onmousedown="dragStart(event, '${c.id}')" ontouchstart="dragStart(event, '${c.id}')">
        <span class="part-name">${PART_NAMES[c.type] || spec.name}</span>
        <button class="comp-close" onclick="removeComponent('${c.id}')" title="Remove">✕</button>
        <div class="comp-body">${bodyHtml}</div>
        <div class="terminals">${termPinsHtml}</div>
      </div>
    `;
  }).join('');

  markOccupiedHoles();
  updateVisualOutputs();
}

function setCompVal(id, key, val) {
  const c = components.find(item => item.id === id);
  if (c) {
    c.state[key] = val;
    renderComponents();
  }
}

function toggleCompBool(id, key) {
  const c = components.find(item => item.id === id);
  if (c) {
    c.state[key] = !c.state[key];
    renderComponents();
    histRemember();
  }
}

let dragItem = null;
let dragOffset = { x: 0, y: 0 };
let pickedId = null;
let partPress = null;
const PROP_FIELDS = {
  res: [{ key: 'ohms', label: 'Resistance (ohm)', min: 1, max: 1000000, step: 1, fallback: 220 }],
  pot: [{ key: 'value', label: 'Position (0-1023)', min: 0, max: 1023, step: 1, fallback: 512 }],
  ldr: [{ key: 'value', label: 'Light (0-1023)', min: 0, max: 1023, step: 1, fallback: 512 }],
  soil: [{ key: 'value', label: 'Moisture (0 dry - 1023 wet)', min: 0, max: 1023, step: 1, fallback: 512 }],
  ultrasonic: [{ key: 'distance', label: 'Distance (cm)', min: 2, max: 400, step: 1, fallback: 25 }],
  dht: [
    { key: 'temp', label: 'Temperature (C)', min: 0, max: 50, step: 1, fallback: 28 },
    { key: 'hum', label: 'Humidity (%)', min: 0, max: 100, step: 1, fallback: 60 }
  ],
  bat: [{ key: 'volts', label: 'Voltage (V)', options: [1.5, 3, 3.3, 5, 9, 12], fallback: 9 }]
};
function closeProps() {
  pickedId = null;
  const pop = $('prop-pop');
  if (pop) pop.hidden = true;
  document.querySelectorAll('.comp-box.picked').forEach(el => el.classList.remove('picked'));
}
function openProps(id) {
  const c = components.find(x => x.id === id);
  const spec = c && PROP_FIELDS[c.type];
  const pop = $('prop-pop');
  const box = $('comp-' + id);
  if (!c || !spec || !pop || !box) { closeProps(); return; }
  pickedId = id;
  document.querySelectorAll('.comp-box.picked').forEach(el => el.classList.remove('picked'));
  box.classList.add('picked');
  $('prop-title').textContent = PART_NAMES[c.type] || c.type;
  $('prop-fields').innerHTML = spec.map(f => {
    const cur = c.state[f.key] != null ? c.state[f.key] : f.fallback;
    if (f.options) {
      return `<label>${f.label}<select data-key="${f.key}">${f.options.map(v => `<option value="${v}"${Number(v) === Number(cur) ? ' selected' : ''}>${v} V</option>`).join('')}</select></label>`;
    }
    return `<label>${f.label}<input data-key="${f.key}" type="number" min="${f.min}" max="${f.max}" step="${f.step}" value="${cur}"><input data-key="${f.key}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${cur}"></label>`;
  }).join('');
  $('prop-fields').querySelectorAll('[data-key]').forEach(el => {
    el.addEventListener('input', () => {
      setCompVal(id, el.dataset.key, Number(el.value));
      $('prop-fields').querySelectorAll(`[data-key="${el.dataset.key}"]`).forEach(other => { if (other !== el) other.value = el.value; });
      if (typeof updateVisualOutputs === 'function') updateVisualOutputs();
    });
    el.addEventListener('change', () => histRemember());
  });
  const wr = $('workspace').getBoundingClientRect();
  const br = box.getBoundingClientRect();
  pop.hidden = false;
  let left = br.left - wr.left;
  let top = br.bottom - wr.top + 8;
  if (left + 240 > wr.width) left = Math.max(8, wr.width - 240);
  if (top + 190 > wr.height) top = Math.max(8, br.top - wr.top - 180);
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function dragStart(e, id) {
  if (drawing) return;
  if (e.button !== undefined && e.button !== 0) return;
  if (e.target.closest('input, button, .term-pin, #prop-pop')) return;
  
  dragItem = components.find(c => c.id === id);
  if (!dragItem) return;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  partPress = { id, x: clientX, y: clientY, moved: false, shift: !!(e.shiftKey) };
  if (e.shiftKey) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    if (!selectedIds.has(id)) { dragItem = null; return; }
  } else if (!selectedIds.has(id)) {
    setSelected([id]);
  }
  const moving = components.filter(c => selectedIds.has(c.id));
  dragGroup = moving.map(c => ({ c, x: c.x, y: c.y }));
  dragBoardOrigin = selectedIds.has('arduino') ? { x: arduinoPos.x, y: arduinoPos.y } : null;
  if (!dragGroup.length && !dragBoardOrigin) { dragItem = null; return; }
  if (dragBoardOrigin) $('arduino-uno').classList.add('dragging');
  dragOffset = stagePoint(clientX, clientY);

  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragEnd);
  document.addEventListener('touchmove', dragMove, { passive: false });
  document.addEventListener('touchend', dragEnd);
}

function dragMove(e) {
  if (!dragItem || !dragGroup) return;
  if (e.cancelable) e.preventDefault();

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  if (partPress && Math.hypot(clientX - partPress.x, clientY - partPress.y) > 5) partPress.moved = true;

  const p = stagePoint(clientX, clientY);
  const dx = p.x - dragOffset.x;
  const dy = p.y - dragOffset.y;
  const clamp = n => Math.max(-2500, Math.min(6500, n));
  dragGroup.forEach(g => {
    g.c.x = clamp(g.x + dx);
    g.c.y = clamp(g.y + dy);
    const el = $('comp-' + g.c.id);
    if (el) {
      el.style.left = g.c.x + 'px';
      el.style.top = g.c.y + 'px';
    }
  });
  if (dragBoardOrigin) {
    arduinoPos.x = clamp(dragBoardOrigin.x + dx);
    arduinoPos.y = clamp(dragBoardOrigin.y + dy);
    applyArduinoPos();
  }
  renderWires();
}

function dragEnd() {
  const dropped = dragItem;
  const tap = partPress && !partPress.moved ? partPress.id : null;
  const shifted = partPress && partPress.shift;
  const group = dragGroup || [];
  partPress = null;
  dragItem = null;
  dragGroup = null;
  dragBoardOrigin = null;
  const board = $('arduino-uno');
  if (board) board.classList.remove('dragging');
  document.removeEventListener('mousemove', dragMove);
  document.removeEventListener('mouseup', dragEnd);
  document.removeEventListener('touchmove', dragMove);
  document.removeEventListener('touchend', dragEnd);
  if (!dropped) return;
  if (tap && !shifted && selectedIds.size > 1) setSelected([dropped.id]);
  group.forEach(g => { if (g.c && g.c.id !== 'arduino' && !snapPartToBoard(g.c)) g.c.seat = null; });
  renderComponents();
  renderWires();
  if (tap && !shifted && selectedIds.size === 1 && PROP_FIELDS[dropped.type]) openProps(tap);
  else if (tap) closeProps();
  histRemember();
}

let arduinoPos = { x: 12, y: 48 };
let boardVertical = false;
let bbPos = { x: 12, y: 300 };
let bbOn = false;
let boardDrag = null;
let dragBoardOrigin = null;

function applyArduinoPos() {
  const el = $('arduino-uno');
  if (!el) return;
  el.style.left = arduinoPos.x + 'px';
  el.style.top = arduinoPos.y + 'px';
}

function applyBoardOrient() {
  const board = $('arduino-uno');
  if (board) board.classList.toggle('is-vertical', boardVertical);
  const flat = boardVertical ? 'Lay the board flat' : 'Stand the board vertical';
  const orient = $('board-orient');
  if (orient) {
    orient.classList.toggle('on', boardVertical);
    orient.textContent = boardVertical ? '↔ Horizontal' : '↻ Vertical';
    orient.title = flat;
  }
  const spin = $('board-rotate');
  if (spin) {
    spin.title = flat;
    spin.setAttribute('aria-label', flat);
  }
  if (typeof renderWires === 'function') renderWires();
}

function toggleBoardVertical() {
  boardVertical = !boardVertical;
  applyBoardOrient();
  histRemember();
}

function startBoardDrag(e) {
  if (drawing) return;
  if (e.target.closest('.pin-node, .uno-reset, .board-close, .board-rotate')) return;
  if (e.button !== undefined && e.button !== 0) return;
  const el = $('arduino-uno');
  if (!el || el.classList.contains('is-closed')) return;
  if (e.shiftKey) {
    const next = new Set(selectedIds);
    if (next.has('arduino')) next.delete('arduino'); else next.add('arduino');
    setSelected(next);
    if (!selectedIds.has('arduino')) return;
  } else if (!selectedIds.has('arduino')) {
    setSelected(['arduino']);
  }
  const pt = e.touches ? e.touches[0] : e;
  dragItem = { id: 'arduino' };
  partPress = { id: 'arduino', x: pt.clientX, y: pt.clientY, moved: false, shift: !!e.shiftKey };
  const moving = components.filter(c => selectedIds.has(c.id));
  dragGroup = moving.map(c => ({ c, x: c.x, y: c.y }));
  dragBoardOrigin = { x: arduinoPos.x, y: arduinoPos.y };
  dragOffset = stagePoint(pt.clientX, pt.clientY);
  el.classList.add('dragging');
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragEnd);
  document.addEventListener('touchmove', dragMove, { passive: false });
  document.addEventListener('touchend', dragEnd);
}

function moveBoardDrag(e) {
  if (!boardDrag) return;
  if (e.cancelable) e.preventDefault();
  const pt = e.touches ? e.touches[0] : e;
  const p = stagePoint(pt.clientX, pt.clientY);
  arduinoPos.x = Math.max(-2500, Math.min(6500, p.x - boardDrag.dx));
  arduinoPos.y = Math.max(-2500, Math.min(6500, p.y - boardDrag.dy));
  applyArduinoPos();
  renderWires();
}

function endBoardDrag() {
  boardDrag = null;
  const el = $('arduino-uno');
  if (el) el.classList.remove('dragging');
  document.removeEventListener('mousemove', moveBoardDrag);
  document.removeEventListener('mouseup', endBoardDrag);
  document.removeEventListener('touchmove', moveBoardDrag);
  document.removeEventListener('touchend', endBoardDrag);
  histRemember();
}

$('arduino-uno').addEventListener('mousedown', startBoardDrag);
$('arduino-uno').addEventListener('touchstart', startBoardDrag, { passive: true });


/* Loaded in order by js/sim/boot.js. Do not load this file on its own. */
/* ===== breadboard: rails + 5-hole rows, parts snap in, wires land on holes ===== */
const BB = { cols: 24, pitch: 14, hole: 5 };

function bbMetrics() {
  const p = BB.pitch;
  const lab = 16;
  let y = 4;
  const numY = y;
  y += 12;
  const rails = {};
  rails['t+'] = y; y += p;
  rails['t-'] = y; y += p;
  y += 6;
  const rows = {};
  for (let i = 0; i < 5; i++) rows['abcde'[i]] = y + i * p;
  y += 5 * p + 12;
  for (let i = 0; i < 5; i++) rows['fghij'[i]] = y + i * p;
  y += 5 * p + 6;
  rails['b+'] = y; y += p;
  rails['b-'] = y; y += p;
  y += 8;
  return { lab, rails, rows, numY, width: lab + BB.cols * p + 8, height: y };
}

function parseHole(id) {
  const rail = String(id).match(/^(t\+|t-|b\+|b-)(\d+)$/);
  if (rail) return { rail: rail[1], col: +rail[2], row: null };
  const cell = String(id).match(/^(\d+)([a-j])$/);
  if (cell) return { rail: null, col: +cell[1], row: cell[2] };
  return null;
}

function holeNet(id) {
  const p = parseHole(id);
  if (!p || p.col < 1 || p.col > BB.cols) return null;
  if (p.rail === 't+') return 'tp';
  if (p.rail === 't-') return 'tn';
  if (p.rail === 'b+') return 'bp';
  if (p.rail === 'b-') return 'bn';
  if (p.row && 'abcde'.includes(p.row)) return 't' + p.col;
  if (p.row && 'fghij'.includes(p.row)) return 'b' + p.col;
  return null;
}

function holeCenter(id) {
  const p = parseHole(id);
  const m = bbMetrics();
  if (!p) return { x: 0, y: 0 };
  const top = p.rail ? m.rails[p.rail] : m.rows[p.row];
  return {
    x: bbPos.x + m.lab + (p.col - 1) * BB.pitch + BB.pitch / 2,
    y: bbPos.y + top + BB.pitch / 2
  };
}

function applyBbPos() {
  const el = $('breadboard');
  if (!el) return;
  el.classList.toggle('off', !bbOn);
  el.style.left = bbPos.x + 'px';
  el.style.top = bbPos.y + 'px';
}
function addBreadboard() {
  if (bbOn) return;
  bbOn = true;
  bbPos = { x: arduinoPos.x, y: arduinoPos.y + 380 };
  applyBbPos();
  histRemember();
}
function removeBreadboard() {
  if (!bbOn) return;
  bbOn = false;
  components.forEach(c => { c.seat = null; });
  wires = wires.filter(w => w.from.type !== 'bb' && w.to.type !== 'bb');
  applyBbPos();
  renderComponents();
  renderWires();
  histRemember();
}

function renderBreadboard() {
  const el = $('breadboard');
  if (!el) return;
  const m = bbMetrics();
  const p = BB.pitch;
  const h = BB.hole;
  const ox = (p - h) / 2;
  el.style.width = m.width + 'px';
  el.style.height = m.height + 'px';
  const holes = [];
  const labs = [];
  for (let col = 1; col <= BB.cols; col++) {
    const x = m.lab + (col - 1) * p;
    labs.push(`<span class="bb-lab bb-num" style="left:${x}px;top:${m.numY}px">${col}</span>`);
    for (const rail of ['t+', 't-', 'b+', 'b-']) {
      const id = rail + col;
      const mark = rail.endsWith('+') ? '+' : '−';
      holes.push(`<i class="bb-hole" data-hole="${id}" title="${mark} ${col}" style="left:${x + ox}px;top:${m.rails[rail] + ox}px"></i>`);
    }
    for (const row of 'abcdefghij') {
      const id = col + row;
      holes.push(`<i class="bb-hole" data-hole="${id}" title="${col}${row}" style="left:${x + ox}px;top:${m.rows[row] + ox}px"></i>`);
    }
  }
  for (const row of 'abcdefghij') {
    labs.push(`<span class="bb-lab" style="left:1px;top:${m.rows[row]}px">${row}</span>`);
  }
  [['t+', 'plus', '+'], ['t-', 'minus', '−'], ['b+', 'plus', '+'], ['b-', 'minus', '−']].forEach(([rail, cls, ch]) => {
    labs.push(`<span class="bb-lab bb-pow ${cls}" style="left:1px;top:${m.rails[rail]}px">${ch}</span>`);
  });
  const line = (rail, color) => `<i class="bb-line" style="left:${m.lab}px;top:${m.rails[rail] + p / 2 - 1}px;width:${BB.cols * p}px;background:${color}"></i>`;
  const trenchTop = m.rows.e + p;
  el.innerHTML = `
    <i class="bb-trench" style="left:${m.lab}px;top:${trenchTop}px;width:${BB.cols * p}px;height:${m.rows.f - trenchTop}px"></i>
    <span class="bb-silk" style="top:${trenchTop}px;line-height:${m.rows.f - trenchTop}px">BREADBOARD</span>
    ${line('t+', '#dc2626')}${line('t-', '#2563eb')}${line('b+', '#dc2626')}${line('b-', '#2563eb')}
    <button type="button" class="bb-close" onclick="removeBreadboard()" title="Remove">✕</button>
    ${labs.join('')}${holes.join('')}`;
  applyBbPos();
}

function nearestGridHole(x, y, maxDist) {
  const m = bbMetrics();
  let best = null;
  let bd = maxDist;
  for (let col = 1; col <= BB.cols; col++) {
    for (const row of 'abcdefghij') {
      const cx = bbPos.x + m.lab + (col - 1) * BB.pitch + BB.pitch / 2;
      const cy = bbPos.y + m.rows[row] + BB.pitch / 2;
      const d = Math.hypot(x - cx, y - cy);
      if (d < bd) { bd = d; best = { col, row }; }
    }
  }
  return best;
}

function markOccupiedHoles() {
  const taken = new Set();
  components.forEach(c => {
    if (!c.seat) return;
    Object.values(c.seat).forEach(id => taken.add(String(id)));
  });
  document.querySelectorAll('#breadboard .bb-hole').forEach(el => {
    el.classList.toggle('occupied', taken.has(el.dataset.hole));
  });
}

function seatedLayout(c) {
  const spec = COMP_SPECS[c.type];
  if (!c.seat || !spec) return null;
  const pts = [];
  for (const pin of spec.pins) {
    const id = c.seat[pin];
    const parsed = id && parseHole(id);
    if (!parsed || parsed.rail) return null;
    pts.push({ pin, ...holeCenter(id) });
  }
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const dot = 4;
  const flat = c.type === 'res' || c.type === 'bat';
  if (flat) {
    const boxW = Math.max(maxX - minX, 8);
    const boxH = c.type === 'bat' ? 22 : 18;
    const x = minX;
    const y = (Math.min(...ys) + maxY) / 2 - boxH / 2;
    const pins = {};
    pts.forEach(p => { pins[p.pin] = { left: p.x - x - dot, top: p.y - y - dot }; });
    return { x, y, w: boxW, h: boxH, pins, flat: true };
  }
  const wide = { lcd: 176, oled: 168, ultrasonic: 124, relay: 96, seg7: 84, servo: 78, rgb: 48 };
  const tall = ['pot', 'ldr', 'ultrasonic', 'dht'].includes(c.type);
  const boxW = Math.max(wide[c.type] || 52, maxX - minX + 20);
  const pinFromTop = tall ? 86 : 46;
  const boxH = pinFromTop + 8;
  const x = (minX + maxX) / 2 - boxW / 2;
  const y = maxY - pinFromTop;
  const pins = {};
  pts.forEach(p => { pins[p.pin] = { left: p.x - x - dot, top: p.y - y - dot }; });
  return { x, y, w: boxW, h: boxH, pins, flat: false };
}

function applySeatedPositions() {
  components.forEach(c => {
    const lay = seatedLayout(c);
    if (!lay) return;
    c.x = lay.x;
    c.y = lay.y;
    const el = $('comp-' + c.id);
    if (!el) return;
    el.style.left = lay.x + 'px';
    el.style.top = lay.y + 'px';
    const spec = COMP_SPECS[c.type];
    spec.pins.forEach(p => {
      const pinEl = el.querySelector(`.term-pin[data-pin-id="${c.id}-${p}"]`);
      if (pinEl && lay.pins[p]) {
        pinEl.style.left = lay.pins[p].left + 'px';
        pinEl.style.top = lay.pins[p].top + 'px';
      }
    });
  });
}

function holeTaken(hole, exceptId) {
  return components.some(o => o.id !== exceptId && o.seat && Object.values(o.seat).includes(hole));
}

function snapPartToBoard(c) {
  if (!bbOn) return false;
  const el = $('comp-' + c.id);
  const pinEl = el && el.querySelector('.term-pin');
  if (!pinEl) return false;
  const r = pinEl.getBoundingClientRect();
  const pt = stagePoint(r.left + r.width / 2, r.top + r.height / 2);
  const hit = nearestGridHole(pt.x, pt.y, 22);
  if (!hit) return false;
  const pins = COMP_SPECS[c.type].pins;
  const strides = (c.type === 'res' || c.type === 'bat') ? [4, 1] : [1];
  for (const stride of strides) {
    const span = (pins.length - 1) * stride;
    for (let start = hit.col; start + span <= BB.cols; start++) {
      const holes = pins.map((_, i) => (start + i * stride) + hit.row);
      if (holes.some(h => holeTaken(h, c.id))) continue;
      c.seat = {};
      pins.forEach((p, i) => { c.seat[p] = holes[i]; });
      return true;
    }
  }
  return false;
}

let bbDrag = null;
function startBbDrag(e) {
  if (drawing || dragItem) return;
  if (e.target.closest('.bb-hole, .bb-close')) return;
  if (e.button !== undefined && e.button !== 0) return;
  const el = $('breadboard');
  const pt = e.touches ? e.touches[0] : e;
  const rect = el.getBoundingClientRect();
  bbDrag = { dx: (pt.clientX - rect.left) / view.z, dy: (pt.clientY - rect.top) / view.z };
  el.classList.add('dragging');
  document.addEventListener('mousemove', moveBbDrag);
  document.addEventListener('mouseup', endBbDrag);
  document.addEventListener('touchmove', moveBbDrag, { passive: false });
  document.addEventListener('touchend', endBbDrag);
}
function moveBbDrag(e) {
  if (!bbDrag) return;
  if (e.cancelable) e.preventDefault();
  const pt = e.touches ? e.touches[0] : e;
  const p = stagePoint(pt.clientX, pt.clientY);
  const el = $('breadboard');
  bbPos.x = Math.max(-2500, Math.min(6500, p.x - bbDrag.dx));
  bbPos.y = Math.max(-2500, Math.min(6500, p.y - bbDrag.dy));
  applyBbPos();
  applySeatedPositions();
  renderWires();
}
function endBbDrag() {
  bbDrag = null;
  const el = $('breadboard');
  if (el) el.classList.remove('dragging');
  document.removeEventListener('mousemove', moveBbDrag);
  document.removeEventListener('mouseup', endBbDrag);
  document.removeEventListener('touchmove', moveBbDrag);
  document.removeEventListener('touchend', endBbDrag);
  histRemember();
}
renderBreadboard();
$('breadboard').addEventListener('mousedown', startBbDrag);
$('breadboard').addEventListener('touchstart', startBbDrag, { passive: true });


/* Loaded in order by js/sim/boot.js. Do not load this file on its own. */
/* ===== Arduino C++ -> JS transpiler (v6) ===== */
const __TYPE_CLASS = {
  'int':'int','short':'int','int16_t':'int',
  'unsigned int':'uint','uint16_t':'uint','word':'uint',
  'long':'long','int32_t':'long',
  'unsigned long':'ulong','uint32_t':'ulong',
  'byte':'byte','uint8_t':'byte','unsigned char':'byte',
  'bool':'bool','boolean':'bool',
  'float':'float','double':'float',
  'char':'other','String':'other','size_t':'other','int8_t':'other'
};
const __T = 'unsigned\\s+long|unsigned\\s+int|unsigned\\s+char|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|boolean|double|String|short|float|word|byte|bool|char|long|int';
// C-style integer behaviour (truncation + overflow wrap-around) for typed variables
const __c = {
  int:   v => ((Math.trunc(Number(v)) + 32768) & 65535) - 32768,
  uint:  v => Math.trunc(Number(v)) & 65535,
  long:  v => Math.trunc(Number(v)) | 0,
  ulong: v => Math.trunc(Number(v)) >>> 0,
  byte:  v => Math.trunc(Number(v)) & 255,
  bool:  v => (v ? 1 : 0)
};
const __arr = (n, a) => { const r = a.slice(); while (r.length < n) r.push(0); return r; };
let lastSketchMap = [];

function transpileArduinoCode(cppCode) {
  const lits = [];
  const ESC = { n:'\n', t:'\t', r:'\r', '0':'\0', "'":"'", '"':'"', '\\':'\\' };
  // 1) strip comments (newlines kept), hide string / char literals
  let js = cppCode.replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, m => {
    if (m[0] === '/') return m.replace(/[^\n]/g, '');
    if (m[0] === "'") {
      const b = m.slice(1, -1);
      const ch = b[0] === '\\' ? (ESC[b[1]] ?? b[1]) : b[0];
      lits.push({ c: (ch || '\0').charCodeAt(0), s: ch || '' });
    } else lits.push({ v: m });
    return `__S${lits.length - 1}__`;
  });
  js = js.split('\n').map((line, i) => line + ' /*__L' + (i + 1) + '__*/').join('\n');

  // 2) preprocessor, F() macro, qualifiers, pointer stars
  js = js.replace(/^[ \t]*#include[^\n]*/gm, '');
  js = js.replace(/^[ \t]*#define[ \t]+(\w+)[ \t]+([^\n]+)/gm, 'var $1 = $2;');
  js = js.replace(/^[ \t]*#define[ \t]+(\w+)[ \t]*$/gm, 'var $1 = 1;');
  js = js.replace(/^[ \t]*#[^\n]*/gm, '');
  js = js.replace(/\bF\s*\(\s*(__S\d+__)\s*\)/g, '$1');
  js = js.replace(/\b(?:static|volatile|extern|constexpr|const|PROGMEM)\b\s*/g, '');
  js = js.replace(new RegExp(`\\b(${__T})\\s*\\*\\s*(?=\\w)`, 'g'), '$1 ');

  // 3) library objects
  js = js.replace(/Servo\s+(\w+)\s*;/g, 'var $1 = new __Servo();');
  js = js.replace(/LiquidCrystal(?:_I2C)?\s+(\w+)(?:\s*\([^)]*\))?\s*;/g, 'var $1 = new __LiquidCrystal();');
  js = js.replace(/Adafruit_SSD1306\s+(\w+)(?:\s*\([^)]*\))?\s*;/g, 'var $1 = new __OLED();');
  js = js.replace(/DHT\s+(\w+)\s*(?:\(([^)]*)\))?\s*;/g, (m, n, a) => `var ${n} = new __DHT(${a || ''});`);

  // 4) function prototypes are not needed in JS
  js = js.replace(new RegExp(`^[ \\t]*(?:void|${__T})[ \\t]+\\w+[ \\t]*\\(([^)]*)\\)[ \\t]*;`, 'gm'),
    (m, p) => (!p.trim() || new RegExp(`\\b(?:${__T})\\b`).test(p)) ? '' : m);

  // 5) C casts
  js = js.replace(/\(\s*(?:float|double)\s*\)\s*/g, '');
  const CT = 'unsigned\\s+long|unsigned\\s+int|unsigned\\s+char|uint8_t|uint16_t|uint32_t|long|int|byte|short|char|bool';
  const castTo = t => { const k = __TYPE_CLASS[t.replace(/\s+/g, ' ')]; return __c[k] ? `__c.${k}` : ''; };
  js = js.replace(new RegExp(`\\(\\s*(${CT})\\s*\\)\\s*(?=\\()`, 'g'), (m, t) => castTo(t));
  js = js.replace(new RegExp(`\\(\\s*(${CT})\\s*\\)\\s*(-?[\\w.]+)`, 'g'), (m, t, x) => { const f = castTo(t); return f ? `${f}(${x})` : x; });

  // 6) arrays:  int a[] = {..};   int a[5];   int a[5] = {1,2};
  js = js.replace(new RegExp(`\\b(?:const\\s+)?(?:${__T})\\s+(\\w+)\\s*\\[\\s*\\w*\\s*\\]\\s*\\[\\s*\\w*\\s*\\]\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*;`, 'g'),
    (m, n, init) => `var ${n} = ${init.replace(/\{/g, '[').replace(/\}/g, ']')};`);
  js = js.replace(new RegExp(`\\b(?:const\\s+)?(?:${__T})\\s+(\\w+)\\s*\\[\\s*(\\w*)\\s*\\]\\s*(?:=\\s*\\{([^}]*)\\})?\\s*;`, 'g'),
    (m, n, size, init) => `var ${n} = __arr(${size || 0}, [${init || ''}]);`);

  // 7) remember declared type of every variable
  const varType = {};
  js.replace(new RegExp(`\\b(${__T})\\s+(\\w+)\\s*(?=[=;,)\\[])`, 'g'), (m, t, n) => {
    const k = __TYPE_CLASS[t.replace(/\s+/g, ' ')];
    varType[n] = (varType[n] === undefined || varType[n] === k) ? k : 'other';
    return m;
  });

  // 8) function definitions -> async functions (remember names)
  const userFns = [];
  js = js.replace(new RegExp(`\\b(?:void|${__T})\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`, 'g'), (m, name, params) => {
    userFns.push(name);
    const clean = params.split(',').map(p => p.trim()
        .replace(new RegExp(`^(?:const\\s+)?(?:${__T})\\s*[&*]?\\s*`), '').replace(/\[\s*\]$/, ''))
      .filter(p => p && p !== 'void').join(', ');
    return `async function ${name}(${clean}) {`;
  });

  // 9) typed assignments / declarations -> C integer semantics (x = 7/2 gives 3, byte wraps at 255, ...)
  const hasComma = e => { let d = 0; for (const ch of e) { if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) d--; else if (ch === ',' && d === 0) return true; } return false; };
  const balanced = e => { let d = 0; for (const ch of e) { if (ch === '{' || ch === '}') return false; if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') { if (--d < 0) return false; } } return d === 0; };
  js = js.replace(new RegExp(`(?:\\b(${__T})\\s+)?(?<![\\w.\\]])(\\w+)\\s*(\\+|-|\\*|\\/|%|&|\\||\\^|<<|>>)?=(?!=)\\s*([^;]+?)\\s*;`, 'g'),
    (m, t, name, op, expr) => {
      const k = t ? __TYPE_CLASS[t.replace(/\s+/g, ' ')] : varType[name];
      if (!__c[k] || hasComma(expr) || !balanced(expr)) return m;
      const rhs = op ? `${name} ${op} (${expr})` : expr;
      return `${t ? 'var ' : ''}${name} = __c.${k}(${rhs});`;
    });

  // 9b) int a = 1, b = 2;  (step 9 leaves comma lists alone)
  const splitDeclList = list => {
    const parts = [];
    let depth = 0, cur = '';
    for (const ch of list) {
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  };
  js = js.replace(new RegExp(`(^|[;{}\\n])([ \\t]*)(${__T})[ \\t]+([^;{}\\n]+);`, 'gm'), (m, lead, sp, t, list) => {
    if (!list.includes(',')) return m;
    const k = __TYPE_CLASS[t.replace(/\s+/g, ' ')];
    const parts = splitDeclList(list);
    if (parts.length < 2) return m;
    const rendered = [];
    for (const part of parts) {
      const eq = part.indexOf('=');
      const left = (eq < 0 ? part : part.slice(0, eq)).trim();
      const expr = eq < 0 ? '0' : part.slice(eq + 1).trim();
      if (!/^[A-Za-z_]\w*$/.test(left)) return m;
      varType[left] = k;
      rendered.push(__c[k] ? `var ${left} = __c.${k}(${expr})` : `var ${left} = (${expr})`);
    }
    return lead + sp + rendered.join('; ') + ';';
  });

  // 10) remaining C types -> var
  js = js.replace(new RegExp(`(?<![\\w.$])(?:const\\s+)?(?:${__T})(?![\\w$])`, 'g'), 'var');

  // 11) calls to user functions must be awaited (they are async)
  for (const fn of new Set(userFns)) {
    js = js.replace(new RegExp(`(?<![\\w.$])${fn}\\s*\\(`, 'g'),
      (m, off, str) => /(?:function|await)\s*$/.test(str.slice(Math.max(0, off - 12), off)) ? m : 'await ' + m);
  }

  // 12) Arduino core API -> async/await runtime
  js = js.replace(/\bpinMode\s*\(/g, 'await __pinMode(');
  js = js.replace(/\bdigitalWrite\s*\(/g, 'await __digitalWrite(');
  js = js.replace(/\bdigitalRead\s*\(/g, 'await __digitalRead(');
  js = js.replace(/\banalogWrite\s*\(/g, 'await __analogWrite(');
  js = js.replace(/\banalogRead\s*\(/g, 'await __analogRead(');
  js = js.replace(/\btone\s*\(/g, 'await __tone(');
  js = js.replace(/\bnoTone\s*\(/g, 'await __noTone(');
  js = js.replace(/\bdelayMicroseconds\s*\(/g, 'await __delayMicro(');
  js = js.replace(/\bdelay\s*\(/g, 'await __delay(');
  js = js.replace(/\bpulseIn\s*\(/g, 'await __pulseIn(');
  js = js.replace(/Serial\.begin\s*\(/g, '__serialBegin(');
  js = js.replace(/Serial\.println\s*\(/g, '__serialPrintln(');
  js = js.replace(/Serial\.print\s*\(/g, '__serialPrint(');
  js = js.replace(/Serial\.available\s*\(/g, '__serialAvailable(');
  js = js.replace(/Serial\.read\s*\(/g, '__serialRead(');

  // 13) put literals back ('A' is a number, except when printed directly)
  js = js.replace(/(__serialPrint(?:ln)?\(\s*)?__S(\d+)__/g, (m, pre, i) => {
    const L = lits[+i];
    if (L.c !== undefined) return pre ? pre + JSON.stringify(L.s) : String(L.c);
    return (pre || '') + L.v;
  });
  const map = [];
  let last = 1;
  js = js.split('\n').map(line => {
    const mark = line.match(/\/\*__L(\d+)__\*\//);
    if (mark) last = Number(mark[1]);
    map.push(last);
    return line.replace(/\s*\/\*__L\d+__\*\//g, '');
  }).join('\n');
  lastSketchMap = map;
  return js;
}

function braceDelta(line) {
  let depth = 0, quote = '', esc = false;
  for (const ch of line) {
    if (quote) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  return depth;
}

function generatedErrorLine(js) {
  const lines = String(js).split('\n');
  let depth = 0, buf = '', lastOk = -1;
  for (let i = 0; i < lines.length; i++) {
    buf += lines[i] + '\n';
    depth += braceDelta(lines[i]);
    if (depth !== 0) continue;
    try {
      new Function('return (async () => {\n' + buf + '\n})();');
      lastOk = i;
    } catch (err) {
      let hit = i;
      for (let j = lastOk + 1; j <= i; j++) {
        if (/const\s+var|\bvar\s+var\b|async function var/.test(lines[j])) { hit = j; break; }
      }
      return { index: hit, message: err.message || String(err) };
    }
  }
  return null;
}

function arduinoHint(msg, lineText) {
  const text = lineText || '';
  if (/class\s+\w+/.test(text) || /\bpublic:|\bprivate:/.test(text)) return 'The lab does not run C++ classes. Use setup, loop, and plain functions.';
  if (/::/.test(text)) return 'The lab does not run the :: operator. Call the function by its plain name.';
  if (/Unexpected token 'var'|const\s+var/.test(msg)) return 'This declaration could not be read. Use const int name = value; or int a = 1, b = 2;';
  if (/already been declared|Identifier '.+' has already been declared/i.test(msg)) return 'This name is declared twice. Keep one declaration.';
  if (/is not defined/.test(msg)) {
    const name = /([A-Za-z_]\w*) is not defined/.exec(msg);
    return (name ? name[1] + ' is not declared in this sketch. ' : '') + 'Declare it above setup, or check the spelling.';
  }
  if (/Unexpected token|Unexpected identifier|Invalid or unexpected/.test(msg)) return 'This line uses syntax the lab does not support yet. Check the declaration, the braces, and the semicolon.';
  return 'The sketch stopped here. ' + msg;
}

function explainSketchError(src, js, err) {
  const srcLines = String(src).split('\n');
  let index = -1;
  const stack = String((err && err.stack) || '');
  const fromStack = /<anonymous>:(\d+):/.exec(stack);
  if (fromStack) {
    const gen = Number(fromStack[1]) - 2;
    if (gen > 0 && lastSketchMap[gen - 1]) index = lastSketchMap[gen - 1] - 1;
  }
  if (index < 0) {
    const found = generatedErrorLine(js);
    if (found && lastSketchMap[found.index]) index = lastSketchMap[found.index] - 1;
  }
  const lineNo = index >= 0 ? index + 1 : 0;
  const text = lineNo ? String(srcLines[index] || '').trim() : '';
  const hint = arduinoHint(String((err && err.message) || err), text);
  const where = lineNo ? 'Line ' + lineNo + (text ? ': ' + text : '') : 'The sketch';
  return '[Code error] ' + where + '\n' + hint;
}
/* ===== end transpiler ===== */

function focusSketchLine(line) {
  const box = $('code-input');
  if (!box || !line) return;
  const lines = box.value.split('\n');
  let start = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) start += lines[i].length + 1;
  const end = start + (lines[line - 1] ? lines[line - 1].length : 0);
  box.focus();
  box.setSelectionRange(start, end);
}

function sketchPinValues(code) {
  const clean = String(code).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
  const values = { A0: 'A0', A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4', A5: 'A5', LED_BUILTIN: boardId === 'esp32' ? '2' : '13' };
  const pending = [];
  const decl = /(?:static\s+)?(?:const\s+)?(?:int|byte|char)\s+(\w+)\s*=\s*([A-Za-z_]\w*|\d+)\s*;/g;
  let match;
  while ((match = decl.exec(clean))) pending.push([match[1], match[2]]);
  for (let pass = 0; pass < 4; pass++) {
    pending.forEach(([name, raw]) => {
      if (/^\d+$/.test(raw)) values[name] = raw;
      else if (values[raw]) values[name] = values[raw];
    });
  }
  return values;
}

function resolveSketchPin(token, values) {
  if (/^\d+$/.test(token)) return token;
  return values[token] || '';
}

function signalAdj() {
  const adj = new Map();
  const link = (a, b) => {
    if (!a || !b || a === b) return;
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
    adj.get(b).push(a);
  };
  for (const w of wires) link(endpointNode(w.from), endpointNode(w.to));
  link('a:GND', 'a:GND2');
  link('a:GND', 'a:GND3');
  return adj;
}

function walkSignal(start, adj) {
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const node = queue.pop();
    if (!node || seen.has(node)) continue;
    seen.add(node);
    const next = adj.get(node);
    if (next) next.forEach(item => queue.push(item));
  }
  return seen;
}

function circuitWarnings(code) {
  const warnings = [];
  const values = sketchPinValues(code);
  const clean = String(code).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
  const onboard = boardId === 'esp32' ? '2' : '13';
  const inputOnly = new Set(['34', '35', '36', '39']);
  const seenPins = new Set();
  const modeRe = /pinMode\s*\(\s*([A-Za-z_]\w*|\d+)\s*,\s*(OUTPUT|INPUT|INPUT_PULLUP)\s*\)/g;
  let match;
  while ((match = modeRe.exec(clean))) {
    const pin = resolveSketchPin(match[1], values);
    if (!pin || seenPins.has(pin)) continue;
    seenPins.add(pin);
    if (pin === onboard) continue;
    const touched = walkSignal('a:' + pin, signalAdj());
    if (touched.size < 2) warnings.push('Pin ' + pin + ' is ' + match[2] + ' in the sketch, and nothing is wired to it.');
  }
  if (boardId === 'esp32') {
    const driveRe = /(?:pinMode\s*\(\s*([A-Za-z_]\w*|\d+)\s*,\s*OUTPUT\s*\)|(?:digitalWrite|analogWrite)\s*\(\s*([A-Za-z_]\w*|\d+)\s*,)/g;
    const flagged = new Set();
    while ((match = driveRe.exec(clean))) {
      const pin = resolveSketchPin(match[1] || match[2], values);
      if (!pin || !inputOnly.has(pin) || flagged.has(pin)) continue;
      flagged.add(pin);
      warnings.push('GPIO' + pin + ' on the ESP32 can only be an input. Do not use it as an output.');
    }
  }
  const adj = signalAdj();
  const resistorNodes = new Set();
  components.forEach(part => {
    if (part.type !== 'res') return;
    resistorNodes.add(endpointNode({ type: 'comp', pinId: part.id + '-A' }));
    resistorNodes.add(endpointNode({ type: 'comp', pinId: part.id + '-B' }));
  });
  const supply = id => id === 'a:5V' || id === 'a:3V3' || id === 'a:VIN' || id === 'a:IOREF';
  const signalPin = id => /^a:(?:\d+|A[0-5])$/.test(id);
  components.forEach(part => {
    if (!/^led_/.test(part.type)) return;
    const anode = endpointNode({ type: 'comp', pinId: part.id + '-ANODE' });
    const seen = walkSignal(anode, adj);
    let throughResistor = false;
    let powered = false;
    seen.forEach(id => {
      if (resistorNodes.has(id)) throughResistor = true;
      if (supply(id) || signalPin(id)) powered = true;
    });
    if (powered && !throughResistor) warnings.push('An LED is tied to power or a pin with no resistor in the path.');
  });
  const vccParts = { servo: 'VCC', ultrasonic: 'VCC', dht: 'VCC', pir: 'VCC', relay: 'VCC', ldr: 'VCC', soil: 'VCC', pot: 'VCC', lcd: 'VCC', oled: 'VCC' };
  const wants5 = new Set(['servo', 'ultrasonic']);
  components.forEach(part => {
    const pin = vccParts[part.type];
    if (!pin) return;
    const seen = walkSignal(endpointNode({ type: 'comp', pinId: part.id + '-' + pin }), adj);
    const name = (PART_NAMES[part.type] || part.type);
    let onGnd = false, on5 = false, on33 = false;
    seen.forEach(id => {
      if (id === 'a:GND' || id === 'a:GND2' || id === 'a:GND3') onGnd = true;
      if (id === 'a:5V' || id === 'a:VIN' || id === 'a:IOREF') on5 = true;
      if (id === 'a:3V3') on33 = true;
    });
    if (onGnd && !on5 && !on33) warnings.push(name + ' power is tied to GND.');
    else if (boardId === 'esp32' && on5) warnings.push('ESP32 pins are 3.3 V. ' + name + ' power is tied to 5V or VIN.');
    else if (boardId !== 'esp32' && wants5.has(part.type) && on33 && !on5) warnings.push(name + ' is powered from 3.3V. On the Uno it expects 5V.');
  });
  return warnings.slice(0, 6);
}

async function startExecution() {
  isRunning = true;
  labRunOk = false;
  labActivity = false;
  serialPaused = false;
  serialBuffer = '';
  const pauseBtn = $('serial-pause');
  if (pauseBtn) pauseBtn.textContent = 'Pause';
  serialInputQueue = [];
  executionStartTime = Date.now();
  vtime = 0; __wake = null; __lastYield = performance.now(); __runId++;
  pinStates = {}; document.querySelectorAll('.pin-node.active-high').forEach(p => p.classList.remove('active-high'));
  if (typeof setBaudLabel === 'function') setBaudLabel(0);

  const rawCode = $('code-input').value;
  const warnings = circuitWarnings(rawCode);
  const jsCode = transpileArduinoCode(rawCode);
  $('serial-out').innerText = '-- Sketch started --\n' + (warnings.length ? warnings.map(w => '[Circuit] ' + w).join('\n') + '\n' : '');

  try {
    const wrappedCode = `
      ${jsCode}
      if (typeof setup === 'function') await setup();
      while (__simRun.on) {
        if (typeof loop === 'function') await loop();
        await __delay(10);
      }
    `;

    const env = {
      __pinMode, __digitalWrite, __digitalRead, __analogWrite, __analogRead,
      __tone, __noTone, __delay, __delayMicro, __pulseIn, __serialBegin, __serialPrint, __serialPrintln,
      __serialAvailable, __serialRead, __Servo, __LiquidCrystal, __OLED, __DHT, __c, __arr,
      map: __map, millis: __millis, micros: __micros, random: __random, constrain: __constrain,
      HIGH: 1, LOW: 0, OUTPUT: 'OUTPUT', INPUT: 'INPUT', INPUT_PULLUP: 'INPUT_PULLUP', DHT11: 11, LED_BUILTIN: boardId === 'esp32' ? 2 : 13,
      A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, A6: 20, A7: 21, DHT22: 22, DHT21: 21, isnan: Number.isNaN,
      DEC: 10, HEX: 16, BIN: 2, OCT: 8,
      abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow, sqrt: Math.sqrt, PI: Math.PI,
      sin: Math.sin, cos: Math.cos, tan: Math.tan, floor: Math.floor, ceil: Math.ceil, round: Math.round,
      log: Math.log, exp: Math.exp, sq: x => x * x, radians: d => d * Math.PI / 180, degrees: r => r * 180 / Math.PI,
      randomSeed: () => {}, bit: b => 1 << b, bitRead: (v, b) => (v >> b) & 1,
      lowByte: v => v & 255, highByte: v => (v >> 8) & 255
    };
    const names = Object.keys(env);
    const runFunc = new Function(...names, `return (async () => { ${wrappedCode} })();`);
    labRunOk = true;
    startScopeAnimation();
    await runFunc(...names.map(k => env[k]));
  } catch (err) {
    if (isRunning && err.message !== "Execution Stopped") {
      labRunOk = false;
      const explained = explainSketchError(rawCode, jsCode, err);
      $('serial-out').innerText += '\n' + explained + '\n';
      const lineNo = Number((/^\[Code error\] Line (\d+)/m.exec(explained) || [])[1] || 0);
      focusSketchLine(lineNo);
      const info = $('code-info');
      if (info) info.innerText = lineNo ? 'Error on line ' + lineNo : 'See the serial monitor';
      stopExecution();
    }
  }
}

function stopExecution() {
  if (labRunOk && typeof publishLabResult === 'function') publishLabResult(true);
  labRunOk = false;
  isRunning = false;
  if (__wake) __wake();
  stopAllTones();
  if (scopeAnimId) cancelAnimationFrame(scopeAnimId);
  pinStates = {};
  Object.keys(toneState).forEach(k => delete toneState[k]);
  document.querySelectorAll('.pin-node.active-high').forEach(p => p.classList.remove('active-high'));
  ['led-l', 'led-tx', 'led-rx'].forEach(id => { const el = $(id); if (el) el.classList.remove('on-l', 'on-tx', 'on-rx'); });
  if (typeof updateVisualOutputs === 'function') updateVisualOutputs();
  const vEl = $('scope-voltage');
  if (vEl) vEl.innerText = '0.0 V';
  const btn = $('run-btn');
  if (btn) {
    btn.classList.remove('is-stop', 'btn-danger');
    btn.classList.add('btn-primary');
    btn.title = 'Run';
    btn.setAttribute('aria-label', 'Run');
    const word = btn.querySelector('.run-word');
    if (word) word.textContent = 'Run';
  }
}

function toggleExecution() {
  if (isRunning) {
    stopExecution();
  } else {
    const btn = $('run-btn');
    if (btn) {
      btn.classList.add('is-stop', 'btn-danger');
      btn.classList.remove('btn-primary');
      btn.title = 'Stop';
      btn.setAttribute('aria-label', 'Stop');
      const word = btn.querySelector('.run-word');
      if (word) word.textContent = 'Stop';
    }
    startExecution();
  }
}

function resetArduino() {
  stopExecution();
  pinStates = {};
  document.querySelectorAll('.pin-node').forEach(p => p.classList.remove('active-high'));
  const ledL = $('led-l');
  if (ledL) ledL.classList.remove('on-l');
  $('serial-out').innerText = '-- Arduino Reset --\n';
}

function playSynthSound(pin, freq) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (activeOscillators[pin]) { activeOscillators[pin].osc.frequency.setValueAtTime(freq, audioCtx.currentTime); return; }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    activeOscillators[pin] = { osc, gain };
  } catch(e){}
}

function stopSynthSound(pin) {
  if (activeOscillators[pin]) {
    try { activeOscillators[pin].osc.stop(); } catch(e){}
    delete activeOscillators[pin];
  }
}

function stopAllTones() {
  Object.keys(activeOscillators).forEach(p => stopSynthSound(p));
}


/* Loaded in order by js/sim/boot.js. Do not load this file on its own. */
/* ===== Virtual clock (v6): delay() advances simulated time; millis()/micros() read it ===== */
let vtime = 0, __wake = null, __lastYield = 0, __runId = 0;

async function __delay(ms) {
  const rid = __runId;
  if (!isRunning) throw new Error("Execution Stopped");
  ms = Math.max(0, Number(ms) || 0);
  const speed = parseFloat($('speed-slider')?.value || 1) || 1;
  const real = ms / speed;
  if (real < 1) {                      // tiny waits: advance the virtual clock, yield to the UI only now and then
    vtime += ms;
    if (performance.now() - __lastYield < 8) return;
    __lastYield = performance.now();
    await new Promise(r => setTimeout(r, 0));
    if (!isRunning || rid !== __runId) throw new Error("Execution Stopped");
    return;
  }
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => { __wake = null; vtime += ms; resolve(); }, real);
    __wake = () => { clearTimeout(t); __wake = null; reject(new Error("Execution Stopped")); };
  });
}

async function __delayMicro(us) {
  return __delay(us / 1000);
}

// every call costs ~10us of virtual time, so busy-wait loops like while(millis()-t<1000){} still finish
function __millis() { vtime += 0.01; return Math.floor(vtime); }

function __micros() { vtime += 0.01; return Math.floor(vtime * 1000); }

function __random(min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return Math.floor(Math.random() * (max - min)) + min;
}

function __constrain(x, a, b) {
  return Math.min(Math.max(x, a), b);
}

async function __pinMode(pin, mode) {
  pinStates[pin] = { ...pinStates[pin], mode };
}

async function __digitalWrite(pin, val) {
  const pStr = String(pin);
  const v = val ? 1 : 0;
  pinStates[pStr] = { ...pinStates[pStr], value: v };

  const pinNode = document.querySelector(`.pin-node[data-pin="${pStr}"]`);
  if (pinNode) {
    if (v) pinNode.classList.add('active-high');
    else pinNode.classList.remove('active-high');
  }

  if (pStr === '13') {
    const l = $('led-l');
    if (l) {
      if (v) l.classList.add('on-l');
      else l.classList.remove('on-l');
    }
  }

  updateVisualOutputs();
}

async function __digitalRead(pin) {
  const pStr = String(pin);
  for (let w of wires) {
    let otherPin = null;
    if (w.from.type === 'ard' && w.from.pinId === pStr && w.to.type === 'comp') otherPin = w.to.pinId;
    else if (w.to.type === 'ard' && w.to.pinId === pStr && w.from.type === 'comp') otherPin = w.from.pinId;

    if (otherPin) {
      const [compId] = otherPin.split('-');
      const comp = components.find(c => c.id === compId);
      if (comp) {
        if (comp.type === 'btn') return comp.state.pressed ? 1 : 0;
        if (comp.type === 'pir') return comp.state.motion ? 1 : 0;
      }
    }
  }
  return pinStates[pStr]?.value || 0;
}

async function __analogRead(pin) {
  const pStr = String(pin).replace('A', '');
  const fullPin = 'A' + pStr;

  for (let w of wires) {
    let otherPin = null;
    if (w.from.type === 'ard' && w.from.pinId === fullPin && w.to.type === 'comp') otherPin = w.to.pinId;
    else if (w.to.type === 'ard' && w.to.pinId === fullPin && w.from.type === 'comp') otherPin = w.from.pinId;

    if (otherPin) {
      const [compId] = otherPin.split('-');
      const comp = components.find(c => c.id === compId);
      if (comp && (comp.type === 'pot' || comp.type === 'ldr' || comp.type === 'soil')) {
        return parseInt(comp.state.value, 10);
      }
    }
  }
  return 0;
}

async function __analogWrite(pin, val) {
  await __digitalWrite(pin, val > 127 ? 1 : 0);
  if (pinStates[String(pin)]) pinStates[String(pin)].pwm = val;
  updateVisualOutputs();
}

async function __tone(pin, freq, duration) {
  playSynthSound(pin, freq);
  if (duration) {
    await __delay(duration);
    stopSynthSound(pin);
  }
}

async function __noTone(pin) {
  stopSynthSound(pin);
}

async function __pulseIn(pin, val) {
  for (let w of wires) {
    let otherPin = (w.from.type === 'ard' && w.from.pinId === String(pin)) ? w.to.pinId : (w.to.type === 'ard' && w.to.pinId === String(pin)) ? w.from.pinId : null;
    if (otherPin) {
      const [compId] = otherPin.split('-');
      const comp = components.find(c => c.id === compId);
      if (comp && comp.type === 'ultrasonic') {
        const dist = parseFloat(comp.state.distance);
        return Math.round((dist * 2) / 0.034);
      }
    }
  }
  return 588;
}

function __map(x, in_min, in_max, out_min, out_max) {
  return Math.round((x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);
}

function setBaudLabel(baud) {
  serialBaud = Number(baud) || 0;
  const el = $('serial-baud');
  if (el) el.textContent = serialBaud ? serialBaud + ' baud' : 'baud not set';
}

function __serialBegin(baud) {
  setBaudLabel(baud);
  const tx = $('led-tx');
  if (tx) {
    tx.classList.add('on-tx');
    setTimeout(() => tx.classList.remove('on-tx'), 200);
  }
}

function stampSerial(text) {
  if (!serialShowTime) return text;
  const out = $('serial-out');
  const atBreak = !out || !out.innerText || out.innerText.endsWith('\n');
  const time = new Date().toLocaleTimeString();
  const prefix = atBreak ? '[' + time + '] ' : '';
  return prefix + String(text).replace(/\n(?!$)/g, '\n[' + time + '] ');
}

function __serialPrint(msg, base) {
  const text = stampSerial(String(__fmt(msg, base)));
  if (text) labActivity = true;
  if (serialPaused) { serialBuffer += text; return; }
  const out = $('serial-out');
  if (!out) return;
  out.innerText += text;
  if ($('serial-scroll') && $('serial-scroll').checked) out.scrollTop = out.scrollHeight;
}

function __fmt(msg, base) {
  if (typeof msg === 'number' && base !== undefined) {
    if (Number.isInteger(msg) && [2, 8, 10, 16].includes(base)) {
      const u = msg < 0 ? (msg >= -32768 ? msg & 0xFFFF : msg >>> 0) : msg;
      return u.toString(base).toUpperCase();
    }
    return msg.toFixed(base);
  }
  return msg;
}

function __serialPrintln(msg, base) {
  __serialPrint((msg !== undefined ? __fmt(msg, base) : '') + '\n');
}

function __serialAvailable() {
  return serialInputQueue.length;
}

function __serialRead() {
  return serialInputQueue.length ? serialInputQueue.shift().charCodeAt(0) : -1;
}

function sendSerialInput() {
  const inp = $('serial-in');
  if (!inp) return;
  const txt = inp.value;
  if (!txt) return;
  for (let char of txt) serialInputQueue.push(char);
  inp.value = '';
}

function clearSerial() {
  const out = $('serial-out');
  if (out) out.innerText = '';
}

class __Servo {
  attach(pin) { this.pin = pin; }
  detach() {}
  write(angle) {
    angle = Math.max(0, Math.min(180, Number(angle) || 0));
    this.angle = angle;
    wiredComps(__pinKey(this.pin)).forEach(({ comp }) => {
      if (comp.type !== 'servo') return;
      comp.state.angle = Math.round(angle);
      const horn = $('servo-horn-' + comp.id); if (horn) horn.style.transform = `rotate(${angle}deg)`;
      const l = $('servo-lbl-' + comp.id); if (l) l.textContent = Math.round(angle) + '°';
    });
  }
  writeMicroseconds(us) { this.write((us - 544) * 180 / (2400 - 544)); }
  read() { return Math.round(this.angle || 0); }
}

// 16x2 character LCD with a real cursor
class __LiquidCrystal {
  constructor() { this.r = 0; this.c = 0; }
  _lcds() { return components.filter(c => c.type === 'lcd'); }
  _draw(l) { l.state.text = l.state.lines.join('\n'); const el = $('lcd-screen-' + l.id); if (el) el.textContent = l.state.text; }
  begin() { this.clear(); }
  init() { this.clear(); }
  backlight() {} noBacklight() {} display() {} noDisplay() {} cursor() {} noCursor() {}
  clear() { this.r = 0; this.c = 0; this._lcds().forEach(l => { l.state.lines = ['', '']; this._draw(l); }); }
  home() { this.r = 0; this.c = 0; }
  setCursor(c, r) { this.c = Number(c) || 0; this.r = Math.min(1, Number(r) || 0); }
  print(msg) {
    const s = String(msg);
    this._lcds().forEach(l => {
      l.state.lines = l.state.lines || ['', ''];
      const line = (l.state.lines[this.r] || '').padEnd(16, ' ').split('');
      for (let i = 0; i < s.length; i++) if (this.c + i < 16) line[this.c + i] = s[i];
      l.state.lines[this.r] = line.join('').replace(/\s+$/, '');
      this._draw(l);
    });
    this.c += s.length;
  }
  write(ch) { this.print(typeof ch === 'number' ? String.fromCharCode(ch) : ch); }
}

// 128x64 I2C OLED. Text is buffered until display().
class __OLED {
  constructor() { this.r = 0; this.c = 0; this.size = 1; this.buf = ['', '', '', '']; }
  _oleds() { return components.filter(c => c.type === 'oled'); }
  begin() { this.clearDisplay(); }
  clearDisplay() { this.r = 0; this.c = 0; this.buf = ['', '', '', '']; }
  display() {
    const text = this.buf.join('\n');
    this._oleds().forEach(o => {
      o.state.text = text;
      o.state.lines = this.buf.slice();
      const el = $('oled-screen-' + o.id);
      if (el) el.textContent = text;
    });
  }
  setTextSize(n) { this.size = Math.max(1, Number(n) || 1); }
  setTextColor() {}
  setRotation() {}
  invertDisplay() {}
  setCursor(x, y) {
    const xx = Number(x) || 0;
    const yy = Number(y) || 0;
    this.c = xx <= 20 ? xx : Math.min(20, Math.floor(xx / (6 * this.size)));
    this.r = yy <= 3 ? yy : Math.min(3, Math.floor(yy / (16 * this.size)));
  }
  print(msg) {
    const s = String(msg);
    let row = (this.buf[this.r] || '').padEnd(21, ' ').split('');
    for (let i = 0; i < s.length; i++) {
      if (this.c >= 21) {
        this.buf[this.r] = row.join('').replace(/\s+$/, '');
        this.r = Math.min(3, this.r + 1);
        this.c = 0;
        row = (this.buf[this.r] || '').padEnd(21, ' ').split('');
      }
      if (this.c < 21) row[this.c] = s[i];
      this.c++;
    }
    this.buf[this.r] = row.join('').replace(/\s+$/, '');
  }
  println(msg) {
    if (arguments.length) this.print(msg);
    this.r = Math.min(3, this.r + 1);
    this.c = 0;
  }
  write(ch) { this.print(typeof ch === 'number' ? String.fromCharCode(ch) : ch); }
}

class __DHT {
  constructor(pin) { this.pin = pin; }
  begin() {}
  _comp() {
    const w = this.pin !== undefined && wiredComps(__pinKey(this.pin)).find(x => x.comp.type === 'dht');
    return (w && w.comp) || components.find(c => c.type === 'dht');
  }
  readTemperature(f) { const c = this._comp(); if (!c) return NaN; const t = parseFloat(c.state.temp); return f ? t * 9 / 5 + 32 : t; }
  readHumidity() { const c = this._comp(); return c ? parseFloat(c.state.hum) : NaN; }
}


/* Loaded in order by js/sim/boot.js. Do not load this file on its own. */
/* ===== v7: wire-based signal levels (digital, PWM, 5V/GND, relay contacts) ===== */
const toneState = {};
function __pinKey(pin) {
  if (typeof pin === 'string') return pin;
  const n = Number(pin);
  if (boardId !== 'esp32' && n >= 14 && n <= 21) return 'A' + (n - 14);
  return String(n);
}
function pinLevel(k) {
  const s = pinStates[k]; if (!s) return 0;
  return s.pwm !== undefined ? s.pwm / 255 : (s.value ? 1 : 0);
}
let _adj = null;
function touchAdj() { _adj = null; }
function endpointNode(ref) {
  if (!ref) return null;
  if (ref.type === 'ard') return 'a:' + ref.pinId;
  if (ref.type === 'bb') {
    const n = holeNet(ref.pinId);
    return n ? 'n:' + n : null;
  }
  if (ref.type === 'comp') {
    const i = ref.pinId.indexOf('-');
    if (i < 0) return 'p:' + ref.pinId;
    const id = ref.pinId.slice(0, i);
    const pin = ref.pinId.slice(i + 1);
    const c = components.find(x => x.id === id);
    if (c && c.seat && c.seat[pin]) {
      const n = holeNet(c.seat[pin]);
      if (n) return 'n:' + n;
    }
    return 'p:' + ref.pinId;
  }
  return null;
}
function netAdj() {
  if (_adj) return _adj;
  const adj = new Map();
  const link = (a, b) => {
    if (!a || !b || a === b) return;
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
    adj.get(b).push(a);
  };
  for (const w of wires) link(endpointNode(w.from), endpointNode(w.to));
  link('a:GND', 'a:GND2');
  link('a:GND', 'a:GND3');
  link('a:A4', 'a:SDA');
  link('a:A5', 'a:SCL');
  link('a:5V', 'a:IOREF');
  for (const c of components) {
    if (c.type !== 'res') continue;
    link(endpointNode({ type: 'comp', pinId: c.id + '-A' }), endpointNode({ type: 'comp', pinId: c.id + '-B' }));
  }
  _adj = adj;
  return adj;
}
function connectedSet(start) {
  const adj = netAdj();
  const seen = new Set();
  const q = [start];
  while (q.length) {
    const n = q.pop();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    const nxt = adj.get(n);
    if (nxt) for (const x of nxt) q.push(x);
  }
  return seen;
}
function levelAt(node) {
  if (!node) return 0;
  const seen = connectedSet(node);
  let best = 0;
  for (const id of seen) {
    if (!id.startsWith('a:')) continue;
    const pin = id.slice(2);
    const high = pin === '5V' || pin === '3V3' || pin === 'VIN' || pin === 'IOREF';
    const gnd = pin === 'GND' || pin === 'GND2' || pin === 'GND3';
    const lv = high ? 1 : (gnd ? 0 : pinLevel(pin === 'SDA' ? 'A4' : pin === 'SCL' ? 'A5' : pin));
    if (lv > best) best = lv;
  }
  for (const c of components) {
    if (c.type === 'bat') {
      const n = endpointNode({ type: 'comp', pinId: c.id + '-POS' });
      if (n && seen.has(n)) best = Math.max(best, Math.min(1, (Number(c.state.volts) || 9) / 5));
    }
    if (c.type === 'relay' && c.state.relayOn) {
      const n = endpointNode({ type: 'comp', pinId: c.id + '-NO' });
      if (n && seen.has(n)) best = 1;
    }
  }
  return best;
}
function wiredComps(k) {
  const seen = connectedSet('a:' + k);
  const out = [];
  for (const c of components) {
    const spec = COMP_SPECS[c.type];
    if (!spec) continue;
    for (const pin of spec.pins) {
      const node = endpointNode({ type: 'comp', pinId: c.id + '-' + pin });
      if (node && seen.has(node)) out.push({ comp: c, pin });
    }
  }
  return out;
}
function ardPinOf(compId, pin) {
  const seen = connectedSet(endpointNode({ type: 'comp', pinId: compId + '-' + pin }));
  for (const id of seen) {
    if (!id.startsWith('a:')) continue;
    const p = id.slice(2);
    if (p === 'SDA') return 'A4';
    if (p === 'SCL') return 'A5';
    if (p !== '5V' && p !== '3V3' && p !== 'GND' && p !== 'GND2' && p !== 'GND3' && p !== 'VIN' && p !== 'IOREF' && p !== 'RESET' && p !== 'EN' && p !== 'AREF') return p;
  }
  return null;
}
function netLevel(compId, pin) {
  return levelAt(endpointNode({ type: 'comp', pinId: compId + '-' + pin }));
}
function netSunk(node) {
  const seen = connectedSet(node);
  for (const id of seen) {
    if (!id.startsWith('a:')) continue;
    const pin = id.slice(2);
    if (pin === 'GND' || pin === 'GND2' || pin === 'GND3') return true;
    if (pin === '5V' || pin === '3V3' || pin === 'VIN' || pin === 'IOREF' || pin === 'RESET' || pin === 'EN' || pin === 'AREF') continue;
    const k = pin === 'SDA' ? 'A4' : pin === 'SCL' ? 'A5' : pin;
    const s = pinStates[k];
    const mode = s && String(s.mode).toUpperCase();
    if (s && (mode === 'OUTPUT' || mode === '1') && pinLevel(k) < 0.05) return true;
  }
  for (const c of components) {
    if (c.type !== 'bat') continue;
    const neg = endpointNode({ type: 'comp', pinId: c.id + '-NEG' });
    if (neg && seen.has(neg)) return true;
  }
  return false;
}

let resetLatched = false;
function resetNodeHeld(node) {
  const seen = connectedSet(node);
  if (!seen || seen.size < 2) return false;
  let grounded = false;
  let drivenHigh = false;
  for (const id of seen) {
    if (!id.startsWith('a:')) continue;
    const pin = id.slice(2);
    if (pin === 'GND' || pin === 'GND2' || pin === 'GND3') grounded = true;
    else if (pin === '5V' || pin === '3V3' || pin === 'VIN' || pin === 'IOREF') drivenHigh = true;
    else if (pin !== 'RESET' && pin !== 'EN' && pin !== 'AREF' && pinLevel(pin === 'SDA' ? 'A4' : pin === 'SCL' ? 'A5' : pin) > 0.5) drivenHigh = true;
  }
  return grounded && !drivenHigh;
}
function pollResetPin() {
  const held = resetNodeHeld('a:RESET') || resetNodeHeld('a:EN');
  if (held && !resetLatched) {
    resetLatched = true;
    resetArduino();
  } else if (!held) resetLatched = false;
}

function updateVisualOutputs() {
  pollResetPin();
  components.filter(c => c.type === 'relay').forEach(c => {   // relays first: other parts can be powered through NO
    c.state.relayOn = netLevel(c.id, 'IN') > 0.5;
    const el = document.querySelector(`#comp-${c.id} .relay-switch`);
    if (el) el.classList.toggle('active', c.state.relayOn);
  });
  components.forEach(c => {
    const t = c.type;
    if (t === 'led_r' || t === 'led_y' || t === 'led_g' || t === 'led_b') {
      const lv = netLevel(c.id, 'ANODE'), node = $('led-node-' + c.id);
      if (node) {
        const on = lv > 0.02 && netSunk(endpointNode({ type: 'comp', pinId: c.id + '-CATHODE' }));
        node.classList.toggle('lit', on);
        node.style.setProperty('--glow', on ? String(Math.round(8 + 16 * lv)) : '0');
      }
    } else if (t === 'rgb') {
      const ch = p => Math.round(255 * netLevel(c.id, p));
      c.state.r = ch('R'); c.state.g = ch('G'); c.state.b = ch('B');
      const node = $('rgb-node-' + c.id), col = `rgb(${c.state.r},${c.state.g},${c.state.b})`;
      const lit = c.state.r || c.state.g || c.state.b;
      if (node) {
        node.classList.toggle('lit', !!lit);
        node.style.background = '';
        node.style.setProperty('--led', lit ? col : '#4b5563');
        node.style.setProperty('--glow', lit ? '34' : '0');
        node.style.boxShadow = '';
      }
    } else if (t === 'lamp') {
      const lv = netLevel(c.id, 'POS'), el = $('lamp-' + c.id);
      const lampOn = lv > 0.02 && netSunk(endpointNode({ type: 'comp', pinId: c.id + '-GND' }));
      if (el) el.style.filter = lampOn ? `brightness(${(0.8 + 0.4 * lv).toFixed(2)}) drop-shadow(0 0 ${4 + 14 * lv}px #facc15)` : 'grayscale(1) brightness(.55)';
    } else if (t === 'fan' || t === 'pump') {
      const lv = netLevel(c.id, 'POS'), el = $((t === 'pump' ? 'pump-' : 'fan-') + c.id);
      const motorOn = lv > 0.02 && netSunk(endpointNode({ type: 'comp', pinId: c.id + '-GND' }));
      if (el) {
        const rotor = el.querySelector(t === 'pump' ? '.pump-rotor' : '.fan-rotor') || el;
        rotor.style.animation = motorOn ? `spin ${(1.2 - 1.05 * lv).toFixed(2)}s linear infinite` : 'none';
      }
    } else if (t === 'buz') {
      const k = ardPinOf(c.id, 'POS'), f = k && toneState[k], on = !!f || netLevel(c.id, 'POS') > 0.5;
      const el = $('buz-' + c.id), lb = $('buz-lbl-' + c.id);
      if (el) { el.classList.toggle('on', on); el.style.animation = on ? 'buzz .12s infinite' : 'none'; }
      if (lb) lb.textContent = on ? (f ? Math.round(f) + ' Hz' : 'On') : 'Off';
    } else if (t === 'seg7') {
      const act = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].filter(s => netLevel(c.id, s) > 0.5).join(',');
      const patterns = { 'A,B,C,D,E,F': 0, 'B,C': 1, 'A,B,D,E,G': 2, 'A,B,C,D,G': 3, 'B,C,F,G': 4, 'A,C,D,F,G': 5, 'A,C,D,E,F,G': 6, 'A,B,C': 7, 'A,B,C,D,E,F,G': 8, 'A,B,C,D,F,G': 9 };
      const digit = act in patterns ? patterns[act] : '-';
      c.state.segNum = digit;
      const el = $('seg-' + c.id); if (el) el.innerText = digit;
    }
  });
}

function startScopeAnimation() {
  const canvas = $('scope-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function draw() {
    if (!isRunning) return;
    const v = (pinStates[boardId === 'esp32' ? '2' : '13']?.value === 1) ? (boardId === 'esp32' ? 3.3 : 5) : 0;
    scopeData.push(v);
    scopeData.shift();

    const vEl = $('scope-voltage');
    if (vEl) vEl.innerText = `${v.toFixed(1)} V`;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = canvas.width / (scopeData.length - 1);
    scopeData.forEach((val, i) => {
      const x = i * step;
      const y = canvas.height - 10 - (val / 5) * (canvas.height - 20);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    scopeAnimId = requestAnimationFrame(draw);
  }
  draw();
}

function clearWorkspace() {
  components = [];
  wires = [];
  nextCompId = 1;
  renderComponents();
  renderWires();
}

const shotImageCache = new Map();
function exportTargets() {
  const boardEl = $('arduino-uno');
  const boardOpen = !!(boardEl && !boardEl.classList.contains('is-closed'));
  const hasSel = selectedIds.size > 0;
  const compIds = new Set(hasSel ? [...selectedIds].filter(id => id !== 'arduino') : components.map(c => c.id));
  const board = boardOpen && (!hasSel || selectedIds.has('arduino'));
  const seated = [...compIds].some(id => {
    const part = components.find(c => c.id === id);
    return !!(part && part.seat);
  });
  const bread = bbOn && (!hasSel || seated);
  const endOn = ref => {
    if (!ref) return false;
    if (ref.type === 'comp') return compIds.has(String(ref.pinId).split('-')[0]);
    if (ref.type === 'ard') return board;
    if (ref.type === 'bb') return bread;
    return false;
  };
  const wireIds = wires.filter(w => endOn(w.from) && endOn(w.to)).map(w => w.id);
  return { compIds, board, bread, wireIds };
}
function stageBox(el) {
  if (!el || el.classList.contains('is-closed') || el.classList.contains('off')) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const origin = $('stage').getBoundingClientRect();
  const z = view.z || 1;
  return {
    x: (r.left - origin.left) / z,
    y: (r.top - origin.top) / z,
    r: (r.right - origin.left) / z,
    b: (r.bottom - origin.top) / z
  };
}
function uniteBox(box, next) {
  if (!next) return box;
  if (!box) return next;
  return {
    x: Math.min(box.x, next.x),
    y: Math.min(box.y, next.y),
    r: Math.max(box.r, next.r),
    b: Math.max(box.b, next.b)
  };
}
function pageCssText() {
  let text = '';
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; }
    for (const rule of rules) text += rule.cssText + '\n';
  }
  return text;
}
async function inlineShotImages(root) {
  await Promise.all([...root.querySelectorAll('img')].map(async img => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;
    try {
      let data = shotImageCache.get(src);
      if (!data) {
        const res = await fetch(src);
        if (!res.ok) return;
        const blob = await res.blob();
        data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        shotImageCache.set(src, data);
      }
      img.setAttribute('src', data);
    } catch (e) {}
  }));
}
function showImageMenu(x, y) {
  const menu = $('img-menu');
  const sel = selectedIds.size > 0;
  $('img-with').textContent = sel ? 'Save selection with background' : 'Save image with background';
  $('img-plain').textContent = sel ? 'Save selection without background' : 'Save image without background';
  menu.hidden = false;
  menu.style.left = '0px';
  menu.style.top = '0px';
  const left = Math.min(x, window.innerWidth - menu.offsetWidth - 8);
  const top = Math.min(y, window.innerHeight - menu.offsetHeight - 8);
  menu.style.left = Math.max(8, left) + 'px';
  menu.style.top = Math.max(8, top) + 'px';
}
function hideImageMenu() {
  const menu = $('img-menu');
  if (menu) menu.hidden = true;
}
function onCanvasContext(e) {
  if (e.target.closest('.view-hud, .parts-plus, .parts-pop, .prop-pop, .edge-drag, .canvas-run, #board-show')) return;
  e.preventDefault();
  const comp = e.target.closest('.comp-box');
  if (comp) {
    const id = comp.id.slice(5);
    if (!selectedIds.has(id)) setSelected([id]);
  } else if (e.target.closest('#arduino-uno') && !$('arduino-uno').classList.contains('is-closed') && !selectedIds.has('arduino')) {
    setSelected(['arduino']);
  }
  showImageMenu(e.clientX, e.clientY);
}
async function renderCircuitImage(withBackground) {
  const pick = exportTargets();
  let box = null;
  if (pick.board) box = uniteBox(box, stageBox($('arduino-uno')));
  if (pick.bread) box = uniteBox(box, stageBox($('breadboard')));
  pick.compIds.forEach(id => { box = uniteBox(box, stageBox($('comp-' + id))); });
  pick.wireIds.forEach(id => {
    const path = document.getElementById(id);
    const shape = path && path.querySelector('path');
    if (!shape) return;
    const b = shape.getBBox();
    box = uniteBox(box, { x: b.x - 8, y: b.y - 8, r: b.x + b.width + 8, b: b.y + b.height + 8 });
  });
  if (!box || box.r - box.x < 2 || box.b - box.y < 2) return null;
  const pad = 36;
  const minX = box.x - pad;
  const minY = box.y - pad;
  const width = Math.ceil(box.r - box.x + pad * 2);
  const height = Math.ceil(box.b - box.y + pad * 2);
  const shot = document.createElement('div');
  shot.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  shot.style.cssText = 'position:relative;overflow:hidden;background:transparent;width:' + width + 'px;height:' + height + 'px;';
  const mode = CANVAS_BG[canvasBgIndex] || CANVAS_BG[0];
  if (withBackground) {
    shot.style.backgroundColor = mode.color;
    if (gridVisible) {
      const bars = mode.grid + ' 0,' + mode.grid + ' 1px,transparent 1px,transparent 16px';
      shot.style.backgroundImage = 'repeating-linear-gradient(to bottom,' + bars + '),repeating-linear-gradient(to right,' + bars + ')';
      shot.style.backgroundPosition = (pad - box.x) + 'px ' + (pad - box.y) + 'px';
    }
  }
  const theme = getComputedStyle(document.documentElement);
  ['--bg','--card','--card-border','--tx','--tx-muted','--ac','--ac-hover','--ac-txt','--board','--pin','--code-bg','--err','--wire-col','--canvas'].forEach(name => {
    shot.style.setProperty(name, theme.getPropertyValue(name));
  });
  shot.style.fontFamily = getComputedStyle(document.body).fontFamily;
  const style = document.createElement('style');
  style.textContent = pageCssText();
  shot.appendChild(style);
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;left:' + (-minX) + 'px;top:' + (-minY) + 'px;';
  if (pick.wireIds.length) {
    const svg = $('wires-svg').cloneNode(true);
    [...svg.children].forEach(child => {
      if (!child.classList || !child.classList.contains('jumper') || !pick.wireIds.includes(child.id)) child.remove();
    });
    layer.appendChild(svg);
  }
  if (pick.board) {
    const board = $('arduino-uno').cloneNode(true);
    board.classList.remove('selected', 'dragging');
    board.querySelectorAll('.board-close, .board-rotate').forEach(node => node.remove());
    layer.appendChild(board);
  }
  if (pick.bread) {
    const bread = $('breadboard').cloneNode(true);
    bread.classList.remove('dragging');
    bread.querySelectorAll('.bb-close').forEach(node => node.remove());
    layer.appendChild(bread);
  }
  pick.compIds.forEach(id => {
    const el = $('comp-' + id);
    if (!el) return;
    const copy = el.cloneNode(true);
    copy.classList.remove('selected');
    layer.appendChild(copy);
  });
  shot.appendChild(layer);
  await inlineShotImages(shot);
  const xhtml = new XMLSerializer().serializeToString(shot);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><foreignObject x="0" y="0" width="100%" height="100%">' + xhtml + '</foreignObject></svg>';
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not draw the circuit'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}
async function saveCircuitImage(withBackground) {
  hideImageMenu();
  const menu = document.querySelector('details.menu');
  if (menu) menu.open = false;
  const status = $('sb-save');
  try {
    const canvas = await renderCircuitImage(!!withBackground);
    if (!canvas) {
      if (status) status.innerText = 'Nothing to save';
      return;
    }
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('empty image');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = withBackground ? 'arduino-circuit.png' : 'arduino-circuit-no-bg.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    if (status) status.innerText = 'Image saved';
  } catch (e) {
    if (status) status.innerText = 'Image save failed';
  }
}
$('workspace').addEventListener('contextmenu', onCanvasContext);

function saveProject() {
  const data = {
    code: $('code-input').value,
    components,
    wires,
    arduino: arduinoPos,
    vertical: boardVertical,
    board: boardId,
    breadboard: bbOn ? { x: bbPos.x, y: bbPos.y, on: true } : null,
    view
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'arduino_circuit_project.json';
  a.click();
}

function loadProject(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      histBatch(() => {
        if (data.code !== undefined) $('code-input').value = data.code;
        if (data.components) components = data.components;
        if (data.wires) wires = data.wires;
        if (data.board) setBoard(data.board);
        if (data.arduino && typeof data.arduino.x === 'number') arduinoPos = { x: data.arduino.x, y: data.arduino.y };
        boardVertical = !!data.vertical;
        applyBoardOrient();
        if (data.breadboard && data.breadboard.on && typeof data.breadboard.x === 'number') {
          bbOn = true;
          bbPos = { x: data.breadboard.x, y: data.breadboard.y };
        } else bbOn = false;
        if (data.view) restoreView(data.view);
        applyArduinoPos();
        applyBbPos();
        renderComponents();
        renderWires();
      });
    } catch(err) {
      alert('Invalid project file!');
    }
  };
  reader.readAsText(file);
}

function downloadInoCode() {
  const code = $('code-input').value;
  const blob = new Blob([code], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sketch.ino';
  a.click();
}

function autoConnectWires() {
  wires = [];
  let nextDigital = 13;
  let nextAnalog = 0;
  const plan = [];

  function targetFor(c, pin) {
    let ard = null;
    let color = '#dc2626';
    if (c.type === 'res' || c.type === 'bat') return { ard: null, color, kind: 'none' };
    if (c.type === 'rgb') {
      if (pin === 'R') { ard = '11'; color = '#ef4444'; }
      else if (pin === 'G') { ard = '10'; color = '#22c55e'; }
      else if (pin === 'B') { ard = '9'; color = '#3b82f6'; }
      else if (pin === 'GND') { ard = 'GND'; color = '#171717'; }
    } else if (c.type === 'seg7') {
      const segPinMap = { A: '2', B: '3', C: '4', D: '5', E: '6', F: '7', G: '8', COM: 'GND' };
      ard = segPinMap[pin] || null;
      color = pin === 'COM' ? '#171717' : '#22c55e';
    } else if ((c.type === 'lamp' || c.type === 'fan' || c.type === 'pump') && pin === 'POS') {
      ard = String(nextDigital--);
      color = '#22c55e';
    } else if (c.type === 'relay' && pin === 'COM') {
      ard = '5V';
    } else if (c.type === 'relay' && pin === 'NO') {
      ard = null;
    } else if (pin === 'VCC' || pin === 'POS' || pin === 'PIN2') {
      ard = '5V';
    } else if (pin === 'GND' || pin === 'CATHODE' || pin === 'COM') {
      ard = 'GND';
      color = '#171717';
    } else if (pin === 'ANODE') {
      ard = String(nextDigital--);
      color = c.type === 'led_b' ? '#2563eb' : c.type === 'led_g' ? '#16a34a' : c.type === 'led_y' ? '#eab308' : '#dc2626';
    } else if (pin === 'PIN1') {
      ard = '2';
      color = '#2563eb';
    } else if (pin === 'OUT' || pin === 'DATA') {
      ard = c.type === 'dht' ? '2' : 'A' + (nextAnalog++);
      color = '#f59e0b';
    } else if (pin === 'TRIG') {
      ard = '9'; color = '#f59e0b';
    } else if (pin === 'ECHO') {
      ard = '8'; color = '#3b82f6';
    } else if (pin === 'PWM' || pin === 'IN') {
      ard = '9'; color = '#f59e0b';
    } else if (pin === 'SDA') {
      ard = 'A4'; color = '#3b82f6';
    } else if (pin === 'SCL') {
      ard = 'A5'; color = '#f59e0b';
    }
    if (ard === 'GND') color = '#171717';
    if (ard === '5V' || ard === '3V3' || ard === 'VIN') color = '#dc2626';
    const kind = !ard ? 'none' : (ard === 'GND' ? 'gnd' : 'signal');
    return { ard, color, kind };
  }

  if (!bbOn) {
    components.forEach(c => {
      c.seat = null;
      const spec = COMP_SPECS[c.type];
      if (!spec) return;
      spec.pins.forEach(pin => {
        const t = targetFor(c, pin);
        if (!t.ard) return;
        wires.push({
          id: 'w' + wires.length + Math.random().toString(36).slice(2, 6),
          from: { type: 'ard', pinId: t.ard },
          to: { type: 'comp', pinId: c.id + '-' + pin },
          color: t.color
        });
      });
    });
    renderComponents();
    renderWires();
    return;
  }

  const leds = components.filter(c => c.type === 'led_r' || c.type === 'led_y' || c.type === 'led_g' || c.type === 'led_b');
  const ress = components.filter(c => c.type === 'res');
  const resToLed = new Map();
  const ledToRes = new Map();
  ress.forEach((r, i) => {
    if (!leds[i]) return;
    resToLed.set(r.id, leds[i].id);
    ledToRes.set(leds[i].id, r.id);
  });

  components.forEach(c => {
    const spec = COMP_SPECS[c.type];
    if (!spec) return;
    if (c.type === 'res' && resToLed.has(c.id)) {
      plan.push({ c, pin: 'A', ard: String(nextDigital--), color: '#15803d', kind: 'signal' });
      plan.push({ c, pin: 'B', ard: null, color: '#f97316', kind: 'none' });
      return;
    }
    if ((c.type === 'led_r' || c.type === 'led_y' || c.type === 'led_g' || c.type === 'led_b') && ledToRes.has(c.id)) {
      plan.push({ c, pin: 'ANODE', ard: null, color: '#15803d', kind: 'none' });
      plan.push({ c, pin: 'CATHODE', ard: 'GND', color: '#171717', kind: 'gnd' });
      return;
    }
    spec.pins.forEach(pin => plan.push({ c, pin, ...targetFor(c, pin) }));
  });

  const placed = new Set();
  const jumpers = [];
  let col = 1;
  components.forEach(c => { c.seat = null; });
  const byId = id => components.find(x => x.id === id);
  function placePair(res, led) {
    if (!res || !led || placed.has(res.id) || col + 7 > BB.cols) return false;
    res.seat = { A: col + 'c', B: (col + 4) + 'c' };
    led.seat = { ANODE: (col + 6) + 'c', CATHODE: (col + 7) + 'c' };
    jumpers.push([(col + 4) + 'e', (col + 6) + 'e']);
    placed.add(res.id);
    placed.add(led.id);
    col += 9;
    return true;
  }
  components.forEach(c => {
    if (placed.has(c.id)) return;
    const spec = COMP_SPECS[c.type];
    if (!spec) return;
    if (c.type === 'res' && resToLed.has(c.id) && placePair(c, byId(resToLed.get(c.id)))) return;
    if ((c.type === 'led_r' || c.type === 'led_y' || c.type === 'led_g' || c.type === 'led_b') && ledToRes.has(c.id) && placePair(byId(ledToRes.get(c.id)), c)) return;
    const n = spec.pins.length;
    const stride = (c.type === 'res' || c.type === 'bat') ? 4 : 1;
    const span = (n - 1) * stride;
    if (col + span > BB.cols) return;
    c.seat = {};
    spec.pins.forEach((p, i) => { c.seat[p] = (col + i * stride) + 'c'; });
    placed.add(c.id);
    col += span + 2;
  });

  plan.forEach(item => {
    if (item.c.seat) return;
    if (item.kind === 'none' && item.pin === 'ANODE') {
      item.ard = String(nextDigital--);
      item.kind = 'signal';
      item.color = '#15803d';
    }
  });

  const add = (from, to, color) => {
    wires.push({
      id: 'w' + wires.length + Math.random().toString(36).slice(2, 6),
      from, to, color
    });
  };
  let need5 = false;
  let needG = false;
  plan.forEach(item => {
    if (!item.ard || item.kind === 'none') return;
    const hole = item.c.seat && item.c.seat[item.pin];
    if (!hole) {
      add({ type: 'ard', pinId: item.ard }, { type: 'comp', pinId: item.c.id + '-' + item.pin }, item.color);
      return;
    }
    const parsed = parseHole(hole);
    const landRow = parsed.row && 'fghij'.includes(parsed.row) ? 'j' : 'e';
    const land = parsed.col + landRow;
    if (item.kind === 'gnd') {
      needG = true;
      add({ type: 'bb', pinId: 't-' + parsed.col }, { type: 'bb', pinId: land }, '#171717');
    } else if (item.ard === '5V') {
      need5 = true;
      add({ type: 'bb', pinId: 't+' + parsed.col }, { type: 'bb', pinId: land }, '#dc2626');
    } else {
      add({ type: 'ard', pinId: item.ard }, { type: 'bb', pinId: land }, item.color);
    }
  });
  jumpers.forEach(([a, b]) => add({ type: 'bb', pinId: a }, { type: 'bb', pinId: b }, '#f97316'));
  if (need5) add({ type: 'ard', pinId: '5V' }, { type: 'bb', pinId: 't+1' }, '#dc2626');
  if (needG) add({ type: 'ard', pinId: 'GND' }, { type: 'bb', pinId: 't-1' }, '#171717');

  renderComponents();
  renderWires();
  histRemember();
}

const EXAMPLES = {
  blink: {
    code: `// Example 1: LED blink (with a 220Ω resistor)
int ledPin = 13;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH);
  delay(500);
  digitalWrite(ledPin, LOW);
  delay(500);
}`,
    setup() {
      clearWorkspace();
      const resId = addComponent('res', 400, 90);
      const ledId = addComponent('led_r', 510, 80);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '13' }, to: { type: 'comp', pinId: `${resId}-A` }, color: '#15803d' },
        { id: 'w2', from: { type: 'comp', pinId: `${resId}-B` }, to: { type: 'comp', pinId: `${ledId}-ANODE` }, color: '#f97316' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ledId}-CATHODE` }, color: '#171717' }
      );
      renderWires();
    }
  },

  esp32_blink: {
    code: `// ESP32 onboard LED blink (GPIO2)
int ledPin = 2;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH);
  delay(500);
  digitalWrite(ledPin, LOW);
  delay(500);
}`,
    setup() {
      clearWorkspace();
      const resId = addComponent('res', 760, 70);
      const ledId = addComponent('led_b', 880, 60);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '2' }, to: { type: 'comp', pinId: `${resId}-A` }, color: '#2563eb' },
        { id: 'w2', from: { type: 'comp', pinId: `${resId}-B` }, to: { type: 'comp', pinId: `${ledId}-ANODE` }, color: '#2563eb' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ledId}-CATHODE` }, color: '#171717' }
      );
      renderWires();
    }
  },

  button: {
    code: `// Example 4: Push button turns the LED on/off
int buttonPin = 2;
int ledPin = 13;

void setup() {
  pinMode(buttonPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int buttonState = digitalRead(buttonPin);
  if (buttonState == HIGH) {
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(ledPin, LOW);
  }
}`,
    setup() {
      clearWorkspace();
      const btnId = addComponent('btn', 380, 60);
      const ledId = addComponent('led_g', 420, 220);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '2' }, to: { type: 'comp', pinId: `${btnId}-PIN1` }, color: '#3b82f6' },
        { id: 'w2', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${btnId}-PIN2` }, color: '#ef4444' },
        { id: 'w3', from: { type: 'ard', pinId: '13' }, to: { type: 'comp', pinId: `${ledId}-ANODE` }, color: '#22c55e' },
        { id: 'w4', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ledId}-CATHODE` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  pot: {
    code: `// Example 8: Control LED brightness with a potentiometer (PWM)
int potPin = A0;
int ledPin = 11;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int val = analogRead(potPin);
  int brightness = map(val, 0, 1023, 0, 255);
  analogWrite(ledPin, brightness);
  Serial.println(val);
  delay(100);
}`,
    setup() {
      clearWorkspace();
      const potId = addComponent('pot', 380, 60);
      const ledId = addComponent('led_r', 420, 220);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${potId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: 'A0' }, to: { type: 'comp', pinId: `${potId}-OUT` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${potId}-GND` }, color: '#64748b' },
        { id: 'w4', from: { type: 'ard', pinId: '11' }, to: { type: 'comp', pinId: `${ledId}-ANODE` }, color: '#22c55e' },
        { id: 'w5', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ledId}-CATHODE` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  ultrasonic: {
    code: `// Example 12: HC-SR04 ultrasonic sensor
int trigPin = 9;
int echoPin = 8;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int distance = duration * 0.034 / 2;

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  delay(300);
}`,
    setup() {
      clearWorkspace();
      const usId = addComponent('ultrasonic', 380, 60);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${usId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: '9' }, to: { type: 'comp', pinId: `${usId}-TRIG` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: '8' }, to: { type: 'comp', pinId: `${usId}-ECHO` }, color: '#3b82f6' },
        { id: 'w4', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${usId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  us_led: {
    code: `// Example 13: Ultrasonic + LED — the light turns on below 20 cm
int trigPin = 9;
int echoPin = 8;
int ledPin = 13;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int distance = duration * 0.034 / 2;

  if (distance < 20) {
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(ledPin, LOW);
  }

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  delay(200);
}`,
    setup() {
      clearWorkspace();
      const usId = addComponent('ultrasonic', 400, 40);
      const resId = addComponent('res', 400, 200);
      const ledId = addComponent('led_r', 520, 190);
      const us = components.find(c => c.id === usId);
      if (us) us.state.distance = 40;
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${usId}-VCC` }, color: '#dc2626' },
        { id: 'w2', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${usId}-GND` }, color: '#171717' },
        { id: 'w3', from: { type: 'ard', pinId: '9' }, to: { type: 'comp', pinId: `${usId}-TRIG` }, color: '#f59e0b' },
        { id: 'w4', from: { type: 'ard', pinId: '8' }, to: { type: 'comp', pinId: `${usId}-ECHO` }, color: '#2563eb' },
        { id: 'w5', from: { type: 'ard', pinId: '13' }, to: { type: 'comp', pinId: `${resId}-A` }, color: '#15803d' },
        { id: 'w6', from: { type: 'comp', pinId: `${resId}-B` }, to: { type: 'comp', pinId: `${ledId}-ANODE` }, color: '#f97316' },
        { id: 'w7', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ledId}-CATHODE` }, color: '#171717' }
      );
      renderComponents();
      renderWires();
    }
  },

  servo: {
    code: `// Example 5: Rotate a servo motor
#include <Servo.h>

Servo myServo;

void setup() {
  myServo.attach(9);
}

void loop() {
  for (int pos = 0; pos <= 180; pos += 30) {
    myServo.write(pos);
    delay(300);
  }
}`,
    setup() {
      clearWorkspace();
      const srvId = addComponent('servo', 380, 60);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '9' }, to: { type: 'comp', pinId: `${srvId}-PWM` }, color: '#f59e0b' },
        { id: 'w2', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${srvId}-VCC` }, color: '#ef4444' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${srvId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  tone: {
    code: `// Example 6: Buzzer melody (Audio Tone)
int buzzerPin = 8;

int notes[] = {262, 294, 330, 349, 392, 440, 494, 523};

void setup() {
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  for (int i = 0; i < 8; i++) {
    tone(buzzerPin, notes[i], 250);
    delay(300);
  }
  noTone(buzzerPin);
  delay(1000);
}`,
    setup() {
      clearWorkspace();
      const buzId = addComponent('buz', 380, 60);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '8' }, to: { type: 'comp', pinId: `${buzId}-POS` }, color: '#f59e0b' },
        { id: 'w2', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${buzId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  rgb: {
    code: `// Example 7: RGB LED color mixing
int redPin = 11;
int greenPin = 10;
int bluePin = 9;

void setup() {
  pinMode(redPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(bluePin, OUTPUT);
}

void loop() {
  digitalWrite(redPin, HIGH);
  digitalWrite(greenPin, LOW);
  digitalWrite(bluePin, LOW);
  delay(500);

  digitalWrite(redPin, LOW);
  digitalWrite(greenPin, HIGH);
  digitalWrite(bluePin, LOW);
  delay(500);

  digitalWrite(redPin, LOW);
  digitalWrite(greenPin, LOW);
  digitalWrite(bluePin, HIGH);
  delay(500);
}`,
    setup() {
      clearWorkspace();
      const rgbId = addComponent('rgb', 380, 60);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '11' }, to: { type: 'comp', pinId: `${rgbId}-R` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: '10' }, to: { type: 'comp', pinId: `${rgbId}-G` }, color: '#22c55e' },
        { id: 'w3', from: { type: 'ard', pinId: '9' }, to: { type: 'comp', pinId: `${rgbId}-B` }, color: '#3b82f6' },
        { id: 'w4', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${rgbId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  pir: {
    code: `// Example 17: PIR motion detector alarm
int pirPin = 2;
int buzzerPin = 8;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  int motion = digitalRead(pirPin);
  if (motion == HIGH) {
    Serial.println("Motion Detected!");
    tone(buzzerPin, 1000, 200);
  } else {
    noTone(buzzerPin);
  }
  delay(200);
}`,
    setup() {
      clearWorkspace();
      const pirId = addComponent('pir', 380, 50);
      const buzId = addComponent('buz', 400, 220);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '2' }, to: { type: 'comp', pinId: `${pirId}-OUT` }, color: '#3b82f6' },
        { id: 'w2', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${pirId}-VCC` }, color: '#ef4444' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${pirId}-GND` }, color: '#64748b' },
        { id: 'w4', from: { type: 'ard', pinId: '8' }, to: { type: 'comp', pinId: `${buzId}-POS` }, color: '#f59e0b' },
        { id: 'w5', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${buzId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  ldr: {
    code: `// Example 15: LDR night light sensor
int ldrPin = A0;
int ledPin = 13;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int ldrValue = analogRead(ldrPin);
  Serial.print("LDR Value: ");
  Serial.println(ldrValue);

  if (ldrValue < 400) {
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(ledPin, LOW);
  }
  delay(200);
}`,
    setup() {
      clearWorkspace();
      const ldrId = addComponent('ldr', 380, 60);
      const ledId = addComponent('led_r', 420, 220);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${ldrId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: 'A0' }, to: { type: 'comp', pinId: `${ldrId}-OUT` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ldrId}-GND` }, color: '#64748b' },
        { id: 'w4', from: { type: 'ard', pinId: '13' }, to: { type: 'comp', pinId: `${ledId}-ANODE` }, color: '#22c55e' },
        { id: 'w5', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ledId}-CATHODE` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  serial: {
    code: `// Example 19: Serial command turns the LED on/off (1 = ON, 0 = OFF)
int ledPin = 13;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
  Serial.println("Send '1' for ON, '0' for OFF");
}

void loop() {
  if (Serial.available() > 0) {
    char ch = Serial.read();
    if (ch == '1') {
      digitalWrite(ledPin, HIGH);
      Serial.println("LED turned ON");
    } else if (ch == '0') {
      digitalWrite(ledPin, LOW);
      Serial.println("LED turned OFF");
    }
  }
}`,
    setup() {
      clearWorkspace();
      const ledId = addComponent('led_g', 400, 80);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '13' }, to: { type: 'comp', pinId: `${ledId}-ANODE` }, color: '#22c55e' },
        { id: 'w2', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ledId}-CATHODE` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  lcd: {
    code: `// Example 11: LCD 16x2 display message
#include <LiquidCrystal.h>

LiquidCrystal lcd;

void setup() {
  lcd.begin(16, 2);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Arduino Uno R3");
  lcd.setCursor(0, 1);
  lcd.print("Simulator V3.2");
}

void loop() {
  // Empty loop
}`,
    setup() {
      clearWorkspace();
      const lcdId = addComponent('lcd', 380, 80);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${lcdId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${lcdId}-GND` }, color: '#64748b' },
        { id: 'w3', from: { type: 'ard', pinId: 'A4' }, to: { type: 'comp', pinId: `${lcdId}-SDA` }, color: '#3b82f6' },
        { id: 'w4', from: { type: 'ard', pinId: 'A5' }, to: { type: 'comp', pinId: `${lcdId}-SCL` }, color: '#f59e0b' }
      );
      renderWires();
    }
  },

  dht: {
    code: `// Example 20: DHT11 temperature and humidity reading
#include <DHT.h>

DHT dht(2, DHT11);

void setup() {
  Serial.begin(9600);
  dht.begin();
  Serial.println("DHT11 Sensor Reading Started...");
}

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  Serial.print("Temperature: ");
  Serial.print(temp);
  Serial.print(" °C | Humidity: ");
  Serial.print(hum);
  Serial.println(" %");

  delay(1000);
}`,
    setup() {
      clearWorkspace();
      const dhtId = addComponent('dht', 380, 80);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${dhtId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: '2' }, to: { type: 'comp', pinId: `${dhtId}-DATA` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${dhtId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  relay: {
    code: `// Example 23: Push button drives a relay module and load
int buttonPin = 2;
int relayPin = 7;

void setup() {
  pinMode(buttonPin, INPUT);
  pinMode(relayPin, OUTPUT);
}

void loop() {
  int btnState = digitalRead(buttonPin);
  if (btnState == HIGH) {
    digitalWrite(relayPin, HIGH);
  } else {
    digitalWrite(relayPin, LOW);
  }
}`,
    setup() {
      clearWorkspace();
      const btnId = addComponent('btn', 380, 60);
      const relayId = addComponent('relay', 420, 220);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '2' }, to: { type: 'comp', pinId: `${btnId}-PIN1` }, color: '#3b82f6' },
        { id: 'w2', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${btnId}-PIN2` }, color: '#ef4444' },
        { id: 'w3', from: { type: 'ard', pinId: '7' }, to: { type: 'comp', pinId: `${relayId}-IN` }, color: '#f59e0b' },
        { id: 'w4', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${relayId}-VCC` }, color: '#ef4444' },
        { id: 'w5', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${relayId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  seg7: {
    code: `// Example 25: 7-segment digital number counter (0-9)
int pins[] = {2, 3, 4, 5, 6, 7, 8}; // A, B, C, D, E, F, G

byte digits[10][7] = {
  {1, 1, 1, 1, 1, 1, 0}, // 0
  {0, 1, 1, 0, 0, 0, 0}, // 1
  {1, 1, 0, 1, 1, 0, 1}, // 2
  {1, 1, 1, 1, 0, 0, 1}, // 3
  {0, 1, 1, 0, 0, 1, 1}, // 4
  {1, 0, 1, 1, 0, 1, 1}, // 5
  {1, 0, 1, 1, 1, 1, 1}, // 6
  {1, 1, 1, 0, 0, 0, 0}, // 7
  {1, 1, 1, 1, 1, 1, 1}, // 8
  {1, 1, 1, 1, 0, 1, 1}  // 9
};

void setup() {
  for (int i = 0; i < 7; i++) {
    pinMode(pins[i], OUTPUT);
  }
}

void loop() {
  for (int count = 0; count < 10; count++) {
    for (int i = 0; i < 7; i++) {
      digitalWrite(pins[i], digits[count][i]);
    }
    delay(750);
  }
}`,
    setup() {
      clearWorkspace();
      const segId = addComponent('seg7', 400, 80);
      const segs = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      segs.forEach((s, idx) => {
        wires.push({
          id: 'w-' + s,
          from: { type: 'ard', pinId: String(idx + 2) },
          to: { type: 'comp', pinId: `${segId}-${s}` },
          color: '#22c55e'
        });
      });
      wires.push({
        id: 'w-com',
        from: { type: 'ard', pinId: 'GND' },
        to: { type: 'comp', pinId: `${segId}-COM` },
        color: '#64748b'
      });
      renderWires();
    }
  },

  traffic: {
    code: `// Example 7: Traffic light simulator (Red, Green, Yellow via RGB)
int redPin = 11;
int greenPin = 10;
int bluePin = 9;

void setup() {
  pinMode(redPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(bluePin, OUTPUT);
}

void loop() {
  // 1. Red (Stop)
  digitalWrite(redPin, HIGH);
  digitalWrite(greenPin, LOW);
  digitalWrite(bluePin, LOW);
  delay(1000);

  // 2. Yellow (Ready)
  digitalWrite(redPin, HIGH);
  digitalWrite(greenPin, HIGH);
  digitalWrite(bluePin, LOW);
  delay(500);

  // 3. Green (Go)
  digitalWrite(redPin, LOW);
  digitalWrite(greenPin, HIGH);
  digitalWrite(bluePin, LOW);
  delay(1000);
}`,
    setup() {
      clearWorkspace();
      const rgbId = addComponent('rgb', 380, 80);
      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '11' }, to: { type: 'comp', pinId: `${rgbId}-R` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: '10' }, to: { type: 'comp', pinId: `${rgbId}-G` }, color: '#22c55e' },
        { id: 'w3', from: { type: 'ard', pinId: '9' }, to: { type: 'comp', pinId: `${rgbId}-B` }, color: '#3b82f6' },
        { id: 'w4', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${rgbId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  smart_home: {
    code: `// Example 36: Automatic smart home light and motion alarm
int ldrPin = A0;
int pirPin = 2;
int relayPin = 7;
int ledPin = 13;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(relayPin, OUTPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int lightLevel = analogRead(ldrPin);
  int motion = digitalRead(pirPin);

  Serial.print("LDR Level: ");
  Serial.print(lightLevel);
  Serial.print(" | Motion: ");
  Serial.println(motion);

  // The relay and light turn on when it is dark and motion is detected
  if (lightLevel < 500 && motion == HIGH) {
    digitalWrite(relayPin, HIGH);
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(relayPin, LOW);
    digitalWrite(ledPin, LOW);
  }
  delay(300);
}`,
    setup() {
      clearWorkspace();
      const ldrId = addComponent('ldr', 380, 40);
      const pirId = addComponent('pir', 380, 180);
      const relayId = addComponent('relay', 380, 320);
      const ledId = addComponent('led_r', 430, 440);

      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${ldrId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: 'A0' }, to: { type: 'comp', pinId: `${ldrId}-OUT` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ldrId}-GND` }, color: '#64748b' },

        { id: 'w4', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${pirId}-VCC` }, color: '#ef4444' },
        { id: 'w5', from: { type: 'ard', pinId: '2' }, to: { type: 'comp', pinId: `${pirId}-OUT` }, color: '#3b82f6' },
        { id: 'w6', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${pirId}-GND` }, color: '#64748b' },

        { id: 'w7', from: { type: 'ard', pinId: '7' }, to: { type: 'comp', pinId: `${relayId}-IN` }, color: '#f59e0b' },
        { id: 'w8', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${relayId}-VCC` }, color: '#ef4444' },
        { id: 'w9', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${relayId}-GND` }, color: '#64748b' },

        { id: 'w10', from: { type: 'ard', pinId: '13' }, to: { type: 'comp', pinId: `${ledId}-ANODE` }, color: '#22c55e' },
        { id: 'w11', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ledId}-CATHODE` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  radar: {
    code: `// Example 35: Ultrasonic radar and servo scanning
#include <Servo.h>

Servo radarServo;
int trigPin = 9;
int echoPin = 8;
int buzzerPin = 6;

void setup() {
  Serial.begin(9600);
  radarServo.attach(11);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  for (int angle = 0; angle <= 180; angle += 30) {
    radarServo.write(angle);
    delay(200);

    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    long duration = pulseIn(echoPin, HIGH);
    int distance = duration * 0.034 / 2;

    Serial.print("Angle: ");
    Serial.print(angle);
    Serial.print("° | Dist: ");
    Serial.print(distance);
    Serial.println(" cm");

    if (distance < 20) {
      tone(buzzerPin, 800, 100);
    } else {
      noTone(buzzerPin);
    }
  }
}`,
    setup() {
      clearWorkspace();
      const srvId = addComponent('servo', 380, 50);
      const usId = addComponent('ultrasonic', 380, 200);
      const buzId = addComponent('buz', 380, 350);

      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '11' }, to: { type: 'comp', pinId: `${srvId}-PWM` }, color: '#f59e0b' },
        { id: 'w2', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${srvId}-VCC` }, color: '#ef4444' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${srvId}-GND` }, color: '#64748b' },

        { id: 'w4', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${usId}-VCC` }, color: '#ef4444' },
        { id: 'w5', from: { type: 'ard', pinId: '9' }, to: { type: 'comp', pinId: `${usId}-TRIG` }, color: '#f59e0b' },
        { id: 'w6', from: { type: 'ard', pinId: '8' }, to: { type: 'comp', pinId: `${usId}-ECHO` }, color: '#3b82f6' },
        { id: 'w7', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${usId}-GND` }, color: '#64748b' },

        { id: 'w8', from: { type: 'ard', pinId: '6' }, to: { type: 'comp', pinId: `${buzId}-POS` }, color: '#f59e0b' },
        { id: 'w9', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${buzId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },
smart_garden: {
    code: `// Example 38: Smart agriculture and garden monitoring
#include <DHT.h>
#include <LiquidCrystal.h>

DHT dht(2, DHT11);
LiquidCrystal lcd;

int ldrPin = A0;
int relayPin = 7;

void setup() {
  Serial.begin(9600);
  dht.begin();
  lcd.begin(16, 2);
  pinMode(relayPin, OUTPUT);
}

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int lightVal = analogRead(ldrPin);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print((int)temp);
  lcd.print("C H:");
  lcd.print((int)hum);
  lcd.print("%");

  lcd.setCursor(0, 1);
  if (lightVal < 300) {
    lcd.print("Light: LOW (ON)");
    digitalWrite(relayPin, HIGH);
  } else {
    lcd.print("Light: OK (OFF)");
    digitalWrite(relayPin, LOW);
  }

  Serial.print("Temp: "); Serial.print(temp);
  Serial.print(" C | Light: "); Serial.println(lightVal);
  delay(1000);
}`,
    setup() {
      clearWorkspace();
      const dhtId = addComponent('dht', 360, 40);
      const ldrId = addComponent('ldr', 360, 200);
      const lcdId = addComponent('lcd', 560, 40);
      const relayId = addComponent('relay', 560, 220);

      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${dhtId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: '2' }, to: { type: 'comp', pinId: `${dhtId}-DATA` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${dhtId}-GND` }, color: '#64748b' },
        { id: 'w4', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${ldrId}-VCC` }, color: '#ef4444' },
        { id: 'w5', from: { type: 'ard', pinId: 'A0' }, to: { type: 'comp', pinId: `${ldrId}-OUT` }, color: '#f59e0b' },
        { id: 'w6', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ldrId}-GND` }, color: '#64748b' },
        { id: 'w7', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${lcdId}-VCC` }, color: '#ef4444' },
        { id: 'w8', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${lcdId}-GND` }, color: '#64748b' },
        { id: 'w9', from: { type: 'ard', pinId: 'A4' }, to: { type: 'comp', pinId: `${lcdId}-SDA` }, color: '#3b82f6' },
        { id: 'w10', from: { type: 'ard', pinId: 'A5' }, to: { type: 'comp', pinId: `${lcdId}-SCL` }, color: '#f59e0b' },
        { id: 'w11', from: { type: 'ard', pinId: '7' }, to: { type: 'comp', pinId: `${relayId}-IN` }, color: '#f59e0b' },
        { id: 'w12', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${relayId}-VCC` }, color: '#ef4444' },
        { id: 'w13', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${relayId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  distance_alarm: {
    code: `// Example 33: Distance-based speed alarm and servo indicator
#include <Servo.h>

Servo gauge;
int trigPin = 9;
int echoPin = 8;
int buzzerPin = 3;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  gauge.attach(11);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int distance = duration * 0.034 / 2;

  distance = constrain(distance, 5, 100);
  int angle = map(distance, 5, 100, 180, 0);
  gauge.write(angle);

  if (distance < 20) {
    tone(buzzerPin, 1200, 100);
  } else {
    noTone(buzzerPin);
  }

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  delay(150);
}`,
    setup() {
      clearWorkspace();
      const usId = addComponent('ultrasonic', 360, 50);
      const srvId = addComponent('servo', 580, 50);
      const buzId = addComponent('buz', 580, 220);

      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${usId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: '9' }, to: { type: 'comp', pinId: `${usId}-TRIG` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: '8' }, to: { type: 'comp', pinId: `${usId}-ECHO` }, color: '#3b82f6' },
        { id: 'w4', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${usId}-GND` }, color: '#64748b' },
        { id: 'w5', from: { type: 'ard', pinId: '11' }, to: { type: 'comp', pinId: `${srvId}-PWM` }, color: '#f59e0b' },
        { id: 'w6', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${srvId}-VCC` }, color: '#ef4444' },
        { id: 'w7', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${srvId}-GND` }, color: '#64748b' },
        { id: 'w8', from: { type: 'ard', pinId: '3' }, to: { type: 'comp', pinId: `${buzId}-POS` }, color: '#f59e0b' },
        { id: 'w9', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${buzId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  temp_alarm: {
    code: `// Example 32: Temperature alarm system (RGB + Buzzer)
#include <DHT.h>

DHT dht(2, DHT11);
int redPin = 11;
int greenPin = 10;
int bluePin = 9;
int buzzerPin = 5;

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(redPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(bluePin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  float temp = dht.readTemperature();
  Serial.print("Current Temp: ");
  Serial.println(temp);

  if (temp > 35) {
    // High Temp Danger (Red + Beep)
    digitalWrite(redPin, HIGH);
    digitalWrite(greenPin, LOW);
    digitalWrite(bluePin, LOW);
    tone(buzzerPin, 1500, 150);
  } else if (temp < 15) {
    // Cold Warning (Blue)
    digitalWrite(redPin, LOW);
    digitalWrite(greenPin, LOW);
    digitalWrite(bluePin, HIGH);
    noTone(buzzerPin);
  } else {
    // Normal Range (Green)
    digitalWrite(redPin, LOW);
    digitalWrite(greenPin, HIGH);
    digitalWrite(bluePin, LOW);
    noTone(buzzerPin);
  }
  delay(500);
}`,
    setup() {
      clearWorkspace();
      const dhtId = addComponent('dht', 360, 50);
      const rgbId = addComponent('rgb', 560, 50);
      const buzId = addComponent('buz', 560, 220);

      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${dhtId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: '2' }, to: { type: 'comp', pinId: `${dhtId}-DATA` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${dhtId}-GND` }, color: '#64748b' },
        { id: 'w4', from: { type: 'ard', pinId: '11' }, to: { type: 'comp', pinId: `${rgbId}-R` }, color: '#ef4444' },
        { id: 'w5', from: { type: 'ard', pinId: '10' }, to: { type: 'comp', pinId: `${rgbId}-G` }, color: '#22c55e' },
        { id: 'w6', from: { type: 'ard', pinId: '9' }, to: { type: 'comp', pinId: `${rgbId}-B` }, color: '#3b82f6' },
        { id: 'w7', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${rgbId}-GND` }, color: '#64748b' },
        { id: 'w8', from: { type: 'ard', pinId: '5' }, to: { type: 'comp', pinId: `${buzId}-POS` }, color: '#f59e0b' },
        { id: 'w9', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${buzId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  smart_door: {
    code: `// Example 34: Password and security door lock
#include <Servo.h>
#include <LiquidCrystal.h>

Servo doorLock;
LiquidCrystal lcd;
int buttonPin = 2;

void setup() {
  Serial.begin(9600);
  lcd.begin(16, 2);
  doorLock.attach(9);
  pinMode(buttonPin, INPUT);

  doorLock.write(0); // Locked
  lcd.setCursor(0, 0);
  lcd.print("Door Status:");
  lcd.setCursor(0, 1);
  lcd.print("LOCKED");
}

void loop() {
  int btnVal = digitalRead(buttonPin);
  
  if (btnVal == HIGH) {
    lcd.setCursor(0, 1);
    lcd.print("UNLOCKED (OPEN) ");
    doorLock.write(90);
    delay(2000);
    
    lcd.setCursor(0, 1);
    lcd.print("LOCKED          ");
    doorLock.write(0);
  }
  delay(100);
}`,
    setup() {
      clearWorkspace();
      const btnId = addComponent('btn', 360, 50);
      const srvId = addComponent('servo', 360, 200);
      const lcdId = addComponent('lcd', 580, 50);

      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '2' }, to: { type: 'comp', pinId: `${btnId}-PIN1` }, color: '#3b82f6' },
        { id: 'w2', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${btnId}-PIN2` }, color: '#ef4444' },
        { id: 'w3', from: { type: 'ard', pinId: '9' }, to: { type: 'comp', pinId: `${srvId}-PWM` }, color: '#f59e0b' },
        { id: 'w4', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${srvId}-VCC` }, color: '#ef4444' },
        { id: 'w5', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${srvId}-GND` }, color: '#64748b' },
        { id: 'w6', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${lcdId}-VCC` }, color: '#ef4444' },
        { id: 'w7', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${lcdId}-GND` }, color: '#64748b' },
        { id: 'w8', from: { type: 'ard', pinId: 'A4' }, to: { type: 'comp', pinId: `${lcdId}-SDA` }, color: '#3b82f6' },
        { id: 'w9', from: { type: 'ard', pinId: 'A5' }, to: { type: 'comp', pinId: `${lcdId}-SCL` }, color: '#f59e0b' }
      );
      renderWires();
    }
  },

  auto_street_light: {
    code: `// Example 27: Sensor-based automatic street light and load drive
int ldrPin = A0;
int relayPin = 7;
int redLed = 12;

void setup() {
  Serial.begin(9600);
  pinMode(relayPin, OUTPUT);
  pinMode(redLed, OUTPUT);
}

void loop() {
  int val = analogRead(ldrPin);
  Serial.print("Ambient Light: ");
  Serial.println(val);

  if (val < 350) {
    // Night Mode: Turn ON Relay Load & Indicator LED
    digitalWrite(relayPin, HIGH);
    digitalWrite(redLed, HIGH);
  } else {
    // Day Mode: Turn OFF Load
    digitalWrite(relayPin, LOW);
    digitalWrite(redLed, LOW);
  }
  delay(300);
}`,
    setup() {
      clearWorkspace();
      const ldrId = addComponent('ldr', 360, 50);
      const relayId = addComponent('relay', 580, 50);
      const ledId = addComponent('led_r', 580, 220);

      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${ldrId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: 'A0' }, to: { type: 'comp', pinId: `${ldrId}-OUT` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ldrId}-GND` }, color: '#64748b' },
        { id: 'w4', from: { type: 'ard', pinId: '7' }, to: { type: 'comp', pinId: `${relayId}-IN` }, color: '#f59e0b' },
        { id: 'w5', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${relayId}-VCC` }, color: '#ef4444' },
        { id: 'w6', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${relayId}-GND` }, color: '#64748b' },
        { id: 'w7', from: { type: 'ard', pinId: '12' }, to: { type: 'comp', pinId: `${ledId}-ANODE` }, color: '#ef4444' },
        { id: 'w8', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ledId}-CATHODE` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  analog_gauge: {
    code: `// Example 30: Potentiometer input and segment dial display
int potPin = A0;
int pins[] = {2, 3, 4, 5, 6, 7, 8};

byte digits[10][7] = {
  {1, 1, 1, 1, 1, 1, 0}, // 0
  {0, 1, 1, 0, 0, 0, 0}, // 1
  {1, 1, 0, 1, 1, 0, 1}, // 2
  {1, 1, 1, 1, 0, 0, 1}, // 3
  {0, 1, 1, 0, 0, 1, 1}, // 4
  {1, 0, 1, 1, 0, 1, 1}, // 5
  {1, 0, 1, 1, 1, 1, 1}, // 6
  {1, 1, 1, 0, 0, 0, 0}, // 7
  {1, 1, 1, 1, 1, 1, 1}, // 8
  {1, 1, 1, 1, 0, 1, 1}  // 9
};

void setup() {
  for (int i = 0; i < 7; i++) pinMode(pins[i], OUTPUT);
}

void loop() {
  int rawVal = analogRead(potPin);
  int digitVal = map(rawVal, 0, 1023, 0, 9);

  for (int i = 0; i < 7; i++) {
    digitalWrite(pins[i], digits[digitVal][i]);
  }
  delay(100);
}`,
    setup() {
      clearWorkspace();
      const potId = addComponent('pot', 360, 50);
      const segId = addComponent('seg7', 580, 50);

      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${potId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: 'A0' }, to: { type: 'comp', pinId: `${potId}-OUT` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${potId}-GND` }, color: '#64748b' }
      );

      const segs = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      segs.forEach((s, idx) => {
        wires.push({
          id: 'w-seg-' + s,
          from: { type: 'ard', pinId: String(idx + 2) },
          to: { type: 'comp', pinId: `${segId}-${s}` },
          color: '#22c55e'
        });
      });
      wires.push({
        id: 'w-seg-com',
        from: { type: 'ard', pinId: 'GND' },
        to: { type: 'comp', pinId: `${segId}-COM` },
        color: '#64748b'
      });
      renderWires();
    }
  },

  counter_system: {
    code: `// Example 31: Button visitor counter and segment display
int btnPin = 2;
int count = 0;
int lastState = LOW;

int segPins[] = {3, 4, 5, 6, 7, 8, 9};

byte digits[10][7] = {
  {1, 1, 1, 1, 1, 1, 0}, // 0
  {0, 1, 1, 0, 0, 0, 0}, // 1
  {1, 1, 0, 1, 1, 0, 1}, // 2
  {1, 1, 1, 1, 0, 0, 1}, // 3
  {0, 1, 1, 0, 0, 1, 1}, // 4
  {1, 0, 1, 1, 0, 1, 1}, // 5
  {1, 0, 1, 1, 1, 1, 1}, // 6
  {1, 1, 1, 0, 0, 0, 0}, // 7
  {1, 1, 1, 1, 1, 1, 1}, // 8
  {1, 1, 1, 1, 0, 1, 1}  // 9
};

void setup() {
  pinMode(btnPin, INPUT);
  for (int i = 0; i < 7; i++) pinMode(segPins[i], OUTPUT);
}

void loop() {
  int currentState = digitalRead(btnPin);

  if (currentState == HIGH && lastState == LOW) {
    count = (count + 1) % 10;
    delay(150);
  }
  lastState = currentState;

  for (int i = 0; i < 7; i++) {
    digitalWrite(segPins[i], digits[count][i]);
  }
}`,
    setup() {
      clearWorkspace();
      const btnId = addComponent('btn', 360, 50);
      const segId = addComponent('seg7', 580, 50);

      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '2' }, to: { type: 'comp', pinId: `${btnId}-PIN1` }, color: '#3b82f6' },
        { id: 'w2', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${btnId}-PIN2` }, color: '#ef4444' }
      );

      const segs = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      segs.forEach((s, idx) => {
        wires.push({
          id: 'w-seg2-' + s,
          from: { type: 'ard', pinId: String(idx + 3) },
          to: { type: 'comp', pinId: `${segId}-${s}` },
          color: '#22c55e'
        });
      });
      wires.push({
        id: 'w-seg2-com',
        from: { type: 'ard', pinId: 'GND' },
        to: { type: 'comp', pinId: `${segId}-COM` },
        color: '#64748b'
      });
      renderWires();
    }
  },

  music_box: {
    code: `// Example 29: Interactive music box with potentiometer frequency
int potPin = A0;
int buzzerPin = 8;
int ledPin = 13;

void setup() {
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int val = analogRead(potPin);
  int freq = map(val, 0, 1023, 100, 2000);

  if (val > 20) {
    tone(buzzerPin, freq);
    digitalWrite(ledPin, HIGH);
  } else {
    noTone(buzzerPin);
    digitalWrite(ledPin, LOW);
  }
  delay(50);
}`,
    setup() {
      clearWorkspace();
      const potId = addComponent('pot', 360, 50);
      const buzId = addComponent('buz', 580, 50);
      const ledId = addComponent('led_g', 580, 200);

      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${potId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: 'A0' }, to: { type: 'comp', pinId: `${potId}-OUT` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${potId}-GND` }, color: '#64748b' },
        { id: 'w4', from: { type: 'ard', pinId: '8' }, to: { type: 'comp', pinId: `${buzId}-POS` }, color: '#f59e0b' },
        { id: 'w5', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${buzId}-GND` }, color: '#64748b' },
        { id: 'w6', from: { type: 'ard', pinId: '13' }, to: { type: 'comp', pinId: `${ledId}-ANODE` }, color: '#22c55e' },
        { id: 'w7', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ledId}-CATHODE` }, color: '#64748b' }
      );
      renderWires();
    }
  },

  weather_station: {
    code: `// Example 37: Full weather station with a servo measurement needle
#include <DHT.h>
#include <Servo.h>

DHT dht(2, DHT11);
Servo tempGauge;
int ldrPin = A0;

void setup() {
  Serial.begin(9600);
  dht.begin();
  tempGauge.attach(9);
}

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int light = analogRead(ldrPin);

  int angle = map(constrain((int)temp, 0, 50), 0, 50, 0, 180);
  tempGauge.write(angle);

  Serial.print("T: "); Serial.print(temp);
  Serial.print("C | H: "); Serial.print(hum);
  Serial.print("% | Light: "); Serial.println(light);

  delay(500);
}`,
    setup() {
      clearWorkspace();
      const dhtId = addComponent('dht', 360, 50);
      const ldrId = addComponent('ldr', 360, 200);
      const srvId = addComponent('servo', 580, 50);

      wires.push(
        { id: 'w1', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${dhtId}-VCC` }, color: '#ef4444' },
        { id: 'w2', from: { type: 'ard', pinId: '2' }, to: { type: 'comp', pinId: `${dhtId}-DATA` }, color: '#f59e0b' },
        { id: 'w3', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${dhtId}-GND` }, color: '#64748b' },
        { id: 'w4', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${ldrId}-VCC` }, color: '#ef4444' },
        { id: 'w5', from: { type: 'ard', pinId: 'A0' }, to: { type: 'comp', pinId: `${ldrId}-OUT` }, color: '#f59e0b' },
        { id: 'w6', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${ldrId}-GND` }, color: '#64748b' },
        { id: 'w7', from: { type: 'ard', pinId: '9' }, to: { type: 'comp', pinId: `${srvId}-PWM` }, color: '#f59e0b' },
        { id: 'w8', from: { type: 'ard', pinId: '5V' }, to: { type: 'comp', pinId: `${srvId}-VCC` }, color: '#ef4444' },
        { id: 'w9', from: { type: 'ard', pinId: 'GND' }, to: { type: 'comp', pinId: `${srvId}-GND` }, color: '#64748b' }
      );
      renderWires();
    }
  }




};

function loadExample(key) {
  if (!key || !EXAMPLES[key]) return;
  const ex = EXAMPLES[key];
  $('code-input').value = ex.code;
  const apply = () => {
    ex.setup();
    layoutComponentsParallel();
  };
  if (typeof histBatch === 'function' && histReady) histBatch(apply);
  else apply();
}

window.onload = function() {
  initArduinoBoardUI();
  loadExample('blink');
};


/* Loaded in order by js/sim/boot.js. Do not load this file on its own. */
/* ===== UI v4 logic ===== */
function labelFor(c){
  if(c.type==='res') return (c.state.ohms||220)+'Ω';
  if(c.type==='bat') return (c.state.volts||9)+'V';
  if(c.type==='pot'||c.type==='ldr') return c.type.toUpperCase()+': '+c.state.value;
  if(c.type==='soil') return 'Soil: '+c.state.value;
  if(c.type==='ultrasonic') return 'Distance: '+c.state.distance+' cm';
  if(c.type==='dht') return '🌡 '+c.state.temp+'°C | 💧 '+c.state.hum+'%';
  return '';
}
// FIX: sliders/buttons used to be re-rendered on every input, which broke dragging & button release
function setCompVal(id,key,val){
  const c=components.find(i=>i.id===id); if(!c) return;
  c.state[key]=val;
  const box=$('comp-'+id); if(!box) return;
  if(key==='pressed'){
    const b=box.querySelector('button.tact');
    if(b) b.classList.toggle('down', !!val);
    return;
  }
  if(key==='value' && c.type==='pot'){
    const k=box.querySelector('.pot-knob');
    if(k) k.style.transform=`rotate(${(Number(val)/1023)*270-135}deg)`;
  }
  const l=box.querySelector('.val-lbl'); if(l) l.textContent=labelFor(c);
}
function setTab(t){
  document.querySelector('main').dataset.tab=t;
  $('tab-circuit').classList.toggle('on',t==='circuit');
  $('tab-code').classList.toggle('on',t==='code');
  if(t==='circuit') renderWires();
}
function setStatus(kind,txt){
  $('status-pill').className='status-pill '+kind; $('status-txt').innerText=txt;
}
const _toggle=toggleExecution, _stop=stopExecution, _start=startExecution;
toggleExecution=function(){
  if(isRunning){ stopExecution(); return; }
  const btn=$('run-btn'); btn.classList.add('is-stop'); btn.classList.replace('btn-primary','btn-danger');
  btn.title='Stop'; btn.setAttribute('aria-label','Stop');
  const stopWord=btn.querySelector('.run-word'); if(stopWord) stopWord.textContent='Stop';
  setStatus('run','Running'); startExecution();
};
stopExecution=function(){
  const was=isRunning; _stop();
  const btn=$('run-btn'); btn.classList.remove('is-stop'); if(btn.classList.contains('btn-danger')) btn.classList.replace('btn-danger','btn-primary');
  btn.title='Run'; btn.setAttribute('aria-label','Run');
  const runWord=btn.querySelector('.run-word'); if(runWord) runWord.textContent='Run';
  if(!$('status-pill').classList.contains('err')) setStatus('', was?'Stopped':'Stopped');
};
const _serialPrint=null;
function restartRun(){
  stopExecution(); setTimeout(()=>{ toggleExecution(); },30);
}
// show runtime errors in status pill
const _origErr=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'innerText');
new MutationObserver(()=>{
  if(/\[Code error\]/.test($('serial-out').innerText)){ setStatus('err','Error'); $('code-info').innerText='⚠ See the error in the serial monitor'; setTab('code'); }
}).observe($('serial-out'),{childList:true,characterData:true,subtree:true});

const _hpc=handlePinClick;
handlePinClick=function(t,p){ _hpc(t,p); updateCounts(); };
function updateCounts(){
  $('sb-wires').innerText='Wires: '+wires.length; $('sb-comps').innerText='Components: '+components.length;
}
['renderWires','renderComponents'].forEach(n=>{const o=window[n]; window[n]=function(){const r=o.apply(this,arguments); updateCounts(); return r;};});

function freshSerial() {
  const out = $('serial-out');
  if (out) out.innerText = '-- Arduino Serial Output Ready --\n';
}
function newFirstProject() {
  if (!confirm('Open the first project (LED Blink)? The current circuit and code will be replaced.')) return;
  freshSerial();
  loadExample('blink');
}
function newProject() {
  if (!confirm('Start an empty project with only the Arduino board? The current circuit and code will be replaced.')) return;
  histBatch(() => {
    stopExecution();
    clearWorkspace();
    bbOn = false;
    applyBbPos();
    setBoardOpen(true);
    $('code-input').value = 'void setup() {\n  \n}\n\nvoid loop() {\n  \n}\n';
    $('example-select').value = '';
    $('code-input').dispatchEvent(new Event('input'));
  });
  freshSerial();
  try {
    const url = new URL(location.href);
    url.searchParams.delete('example');
    history.replaceState(null, '', url.pathname + url.search);
  } catch (e) {}
  syncCoach();
}
function copyCode(){
  navigator.clipboard.writeText($('code-input').value).then(()=>{$('copy-btn').innerText='✔ Copied';setTimeout(()=>$('copy-btn').innerText='📋 Copy',1500);}).catch(()=>{$('code-input').select();document.execCommand('copy');});
}
let codeFs=13;
function fontStep(d){codeFs=Math.max(10,Math.min(22,codeFs+d));document.documentElement.style.setProperty('--code-fs',codeFs+'px');}

// undo / redo for the circuit, wires, board, and sketch
const HIST_MAX = 80;
const HIST_SKIP = { pressed: 1, relayOn: 1, segNum: 1, angle: 1, text: 1, lines: 1, r: 1, g: 1, b: 1 };
let histPast = [];
let histFuture = [];
let histNow = '';
let histLock = 0;
let histReady = false;
let codeHistTimer = 0;

function histState(state) {
  const out = {};
  if (!state) return out;
  Object.keys(state).forEach(k => { if (!HIST_SKIP[k]) out[k] = state[k]; });
  return out;
}
function docSnap() {
  const board = $('arduino-uno');
  return JSON.stringify({
    code: $('code-input') ? $('code-input').value : '',
    components: components.map(c => ({ id: c.id, type: c.type, x: c.x, y: c.y, seat: c.seat || null, state: histState(c.state) })),
    wires,
    nextCompId,
    arduino: { x: arduinoPos.x, y: arduinoPos.y },
    vertical: boardVertical,
    board: boardId,
    boardOpen: !(board && board.classList.contains('is-closed')),
    breadboard: bbOn ? { x: bbPos.x, y: bbPos.y, on: true } : null
  });
}
function histButtons() {
  const canUndo = histPast.length > 0;
  const canRedo = histFuture.length > 0;
  document.querySelectorAll('.hist-undo').forEach(b => { b.disabled = !canUndo; });
  document.querySelectorAll('.hist-redo').forEach(b => { b.disabled = !canRedo; });
}
function histRemember() {
  if (!histReady || histLock) return;
  const snap = docSnap();
  if (snap === histNow) return;
  if (histNow) histPast.push(histNow);
  if (histPast.length > HIST_MAX) histPast.shift();
  histNow = snap;
  histFuture = [];
  histButtons();
}
function histBatch(fn) {
  histLock++;
  try { fn(); }
  finally { histLock--; histRemember(); }
}
function histRestore(snap) {
  histLock++;
  try {
    if (isRunning) stopExecution();
    const d = JSON.parse(snap);
    if ($('code-input')) $('code-input').value = d.code || '';
    const blank = { value: 512, pressed: false, text: 'Arduino Ready', angle: 0, distance: 25, temp: 28, hum: 60, motion: false, segNum: 0, relayOn: false, r: 0, g: 0, b: 0, ohms: 220, volts: 9 };
    components = (d.components || []).map(c => ({ id: c.id, type: c.type, x: c.x, y: c.y, seat: c.seat || null, state: Object.assign({}, blank, c.state) }));
    wires = d.wires || [];
    nextCompId = d.nextCompId || 1;
    if (d.arduino && typeof d.arduino.x === 'number') arduinoPos = { x: d.arduino.x, y: d.arduino.y };
    boardVertical = !!d.vertical;
    if (d.board && d.board !== boardId) setBoard(d.board);
    if (d.breadboard && d.breadboard.on && typeof d.breadboard.x === 'number') {
      bbOn = true;
      bbPos = { x: d.breadboard.x, y: d.breadboard.y };
    } else bbOn = false;
    applyArduinoPos();
    applyBoardOrient();
    applyBbPos();
    setBoardOpen(d.boardOpen !== false);
    closeProps();
    setSelected([]);
    renderComponents();
    renderWires();
    $('code-input').dispatchEvent(new Event('input'));
  } finally {
    histLock--;
  }
}
function histCommitPending() {
  clearTimeout(codeHistTimer);
  if (!histReady) return;
  const snap = docSnap();
  if (snap === histNow) return;
  if (histNow) histPast.push(histNow);
  if (histPast.length > HIST_MAX) histPast.shift();
  histNow = snap;
  histFuture = [];
}
function undoEdit() {
  histCommitPending();
  if (!histPast.length) { histButtons(); return; }
  histFuture.push(histNow);
  histNow = histPast.pop();
  histRestore(histNow);
  histButtons();
}
function redoEdit() {
  clearTimeout(codeHistTimer);
  if (!histFuture.length) return;
  histPast.push(histNow);
  histNow = histFuture.pop();
  histRestore(histNow);
  histButtons();
}
function histReset() {
  clearTimeout(codeHistTimer);
  histPast = [];
  histFuture = [];
  histNow = docSnap();
  histReady = true;
  histButtons();
}
function scheduleCodeHist() {
  clearTimeout(codeHistTimer);
  if (!histReady || histLock) return;
  codeHistTimer = setTimeout(histRemember, 450);
}

// keyboard shortcuts
window.addEventListener('keydown',e=>{
  if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')) {
    const el = document.activeElement;
    const inField = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
    if (inField && el.id !== 'code-input') return;
    e.preventDefault();
    if (e.key === 'y' || e.key === 'Y' || e.shiftKey) redoEdit();
    else undoEdit();
    return;
  }
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault(); isRunning?restartRun():toggleExecution();}
  else if(e.key==='Escape' && $('prop-pop') && !$('prop-pop').hidden){ closeProps(); }
  else if(e.key==='Escape'&&isRunning){stopExecution();}
  else if(e.key==='Escape'&&(selectedPin||drawing)){cancelDraw();}
  else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size) {
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
    e.preventDefault();
    deleteSelected();
  }
});
// close file menu when clicking elsewhere
document.addEventListener('click',e=>{const m=document.querySelector('details.menu'); if(m&&!m.contains(e.target)) m.open=false; else if(m&&e.target.closest('.menu-list button')) m.open=false; const img=$('img-menu'); if(img&&!img.contains(e.target)) img.hidden=true;});
document.addEventListener('keydown',e=>{ if(e.key==='Escape') hideImageMenu(); });
window.addEventListener('resize',renderWires);

// run timer + code line info
setInterval(()=>{ $('sb-time').innerText='Run time: '+(isRunning?Math.floor((Date.now()-executionStartTime)/1000):0)+'s'; },500);
$('code-input').addEventListener('input',()=>{ $('code-info').innerText=$('code-input').value.split('\n').length+' lines'; scheduleCodeHist(); });

// auto-save / restore (localStorage, guarded)
const SAVE_KEY='arduino_sim_v4'; let lastSaved='';
setInterval(()=>{
  try{
    const snap=JSON.stringify({code:$('code-input').value,components,wires,arduino:arduinoPos,vertical:boardVertical,board:boardId,breadboard:bbOn?{x:bbPos.x,y:bbPos.y,on:true}:null,view});
    if(snap!==lastSaved){localStorage.setItem(SAVE_KEY,snap);lastSaved=snap;$('sb-save').innerText='Auto-save ✔ '+new Date().toLocaleTimeString();}
  }catch(e){$('sb-save').innerText='Auto-save off';}
},2000);
const LAYOUT_KEY = 'arduino_sim_layout';
function saveLayout() {
  try {
    const ws = $('workspace');
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({
      w: getComputedStyle(document.querySelector('main')).getPropertyValue('--circuit-w').trim(),
      canvasH: ws ? ws.style.height : '',
      codeH: $('code-input').style.height,
      boardOpen: !$('arduino-uno').classList.contains('is-closed')
    }));
  } catch (e) {}
}
function bindEdgeDrag(handle, onMove) {
  if (!handle) return;
  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    handle.classList.add('dragging');
    const move = ev => onMove(ev);
    const up = () => {
      handle.classList.remove('dragging');
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      saveLayout();
      renderWires();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  });
}
function setBoardOpen(open) {
  const board = $('arduino-uno');
  if (!board) return;
  board.classList.toggle('is-closed', !open);
  const show = $('board-show');
  if (show) show.hidden = !!open;
  renderWires();
  saveLayout();
  histRemember();
}
function initLabChrome() {
  try {
    const d = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    if (d) {
      if (d.w) document.querySelector('main').style.setProperty('--circuit-w', d.w);
      if (d.canvasH) $('workspace').style.height = d.canvasH;
      if (d.codeH) $('code-input').style.height = d.codeH;
      if (d.boardOpen === false) setBoardOpen(false);
    }
  } catch (e) {}
  $('parts-plus').addEventListener('click', e => {
    e.stopPropagation();
    const pop = $('parts-pop');
    pop.hidden = !pop.hidden;
    if (!pop.hidden) $('parts-search').focus();
  });
  const exampleSearch = $('example-search');
  if (exampleSearch) exampleSearch.addEventListener('input', filterExamples);
  const coachHide = $('first-run-dismiss');
  if (coachHide) coachHide.addEventListener('click', () => {
    try { sessionStorage.setItem('lab-coach', '1'); } catch (e) {}
    $('first-run').hidden = true;
  });
  $('parts-search').addEventListener('input', () => {
    const q = $('parts-search').value.trim().toLowerCase();
    document.querySelectorAll('#parts-list button').forEach(btn => {
      const hay = (btn.textContent + ' ' + (btn.dataset.find || '')).toLowerCase();
      btn.hidden = !!(q && !hay.includes(q));
    });
  });
  document.querySelectorAll('#parts-list button').forEach(btn => {
    btn.addEventListener('click', () => { $('parts-pop').hidden = true; });
  });
  $('workspace').addEventListener('pointerdown', e => {
    if (e.target.closest('#parts-plus, #parts-pop, #board-show')) return;
    $('parts-pop').hidden = true;
    if (!e.target.closest('#prop-pop, .comp-box')) closeProps();
  });
  $('board-close').addEventListener('click', e => { e.stopPropagation(); setBoardOpen(false); });
  $('board-show').addEventListener('click', e => { e.stopPropagation(); setBoardOpen(true); });
  bindEdgeDrag($('split-v'), ev => {
    const main = document.querySelector('main');
    const r = main.getBoundingClientRect();
    const x = Math.min(Math.max(ev.clientX - r.left, 300), r.width - 300);
    main.style.setProperty('--circuit-w', x + 'px');
    renderWires();
  });
  bindEdgeDrag($('canvas-resize'), ev => {
    const top = $('workspace').getBoundingClientRect().top;
    const h = Math.min(Math.max(ev.clientY - top, 280), 1400);
    $('workspace').style.height = h + 'px';
    renderWires();
  });
  bindEdgeDrag($('code-resize'), ev => {
    const top = $('code-input').getBoundingClientRect().top;
    const h = Math.min(Math.max(ev.clientY - top, 140), 1100);
    $('code-input').style.height = h + 'px';
  });
}
window.onload=function(){
  let restored=false;
  let savedBoard='uno';
  try{
    const d=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    if(d&&d.board==='esp32') savedBoard='esp32';
    if(d&&typeof d.code==='string'&&d.code.trim()){
      $('code-input').value=d.code; components=d.components||[]; wires=d.wires||[];
      if(d.arduino && typeof d.arduino.x==='number') arduinoPos={x:d.arduino.x,y:d.arduino.y};
      if(d.vertical) boardVertical=true;
      if(d.breadboard && d.breadboard.on && typeof d.breadboard.x==='number'){ bbOn=true; bbPos={x:d.breadboard.x,y:d.breadboard.y}; }
      else bbOn=false;
      if(d.view) restoreView(d.view);
      nextCompId=components.reduce((m,c)=>Math.max(m,parseInt(String(c.id).slice(1))||0),0)+1;
      applyArduinoPos();
      applyBbPos();
      restored=true;
    }
  }catch(e){}
  const q=new URLSearchParams(location.search).get('board');
  if(q==='esp32'||q==='uno') savedBoard=q;
  setBoard(savedBoard);
  applyBoardOrient();
  if(restored){ renderComponents(); renderWires(); }
  const exampleKey=new URLSearchParams(location.search).get('example');
  if(exampleKey && EXAMPLES[exampleKey]){
    loadExample(exampleKey);
    if(new URLSearchParams(location.search).get('breadboard')==='1') addBreadboard();
    try{
      const labs={ultrasonic:'simulator/sensors',pir:'simulator/sensors',ldr:'simulator/sensors',dht:'simulator/sensors',servo:'simulator/motors',fan_speed:'simulator/motors'};
      const catalog={blink:1,led_chase:1,esp32_blink:1,button:1,serial:1,rgb:1,switch_lamp:1,pot:1,ultrasonic:1,pir:1,ldr:1,dark_alarm:1,dht:1,servo:1,fan_speed:1,tone:1,relay:1,seg7:1,lcd:1,oled_hello:1,oled_light:1,oled_distance:1,oled_near:1};
      const key='edu-platform-progress';
      const data=JSON.parse(localStorage.getItem(key)||'{}');
      const mark=id=>{ if(!id) return; if(!data[id]||data[id].status!=='complete') data[id]={status:'started',at:Date.now()}; };
      mark(labs[exampleKey]);
      if(catalog[exampleKey]) mark('simulator/components');
      localStorage.setItem(key,JSON.stringify(data));
    }catch(e){}
  } else if(!restored) loadExample(savedBoard==='esp32' ? 'esp32_blink' : 'blink');
  if($('code-input') && !String($('code-input').value||'').trim()) loadExample(savedBoard==='esp32' ? 'esp32_blink' : 'blink');
  $('code-input').dispatchEvent(new Event('input')); updateCounts();
  setTimeout(renderWires,300);
  initLabChrome();
  if (exampleKey && EXAMPLES[exampleKey]) setBoardOpen(true);
  try { gridVisible = localStorage.getItem('arduino_canvas_grid') !== '0'; } catch (e) { gridVisible = true; }
  const gridBox = $('grid-toggle');
  if (gridBox) gridBox.checked = gridVisible;
  try { applyCanvasBg(parseInt(localStorage.getItem('arduino_canvas_bg') || '0', 10) || 0); } catch (e) { applyCanvasBg(0); }
  histReset();
  syncCoach();
};
// keep example dropdown in sync when loading one
const _le=loadExample;
loadExample=function(k){ histBatch(() => { stopExecution(); if(k==='esp32_blink'){ if(boardId!=='esp32') setBoard('esp32'); } else if(k && boardId!=='uno') setBoard('uno'); if(k) setBoardOpen(true); _le(k); if(k) $('example-select').value=k; $('code-input').dispatchEvent(new Event('input')); if(k){ try{ const url=new URL(location.href); url.searchParams.set('example', k); url.searchParams.set('board', k==='esp32_blink'?'esp32':'uno'); history.replaceState(null,'',url.pathname+url.search); }catch(e){} } }); syncCoach(); };
function showLessonReturn(){
  const el=$('back-lesson');
  if(!el) return;
  let back=null;
  try{ back=JSON.parse(sessionStorage.getItem('edu-platform-return')||'null'); }catch(e){}
  if(!back||!back.href){ el.hidden=true; return; }
  el.href=back.href;
  el.hidden=false;
  el.textContent='Back to '+(back.label||'lesson');
}
function filterExamples(){
  const box=$('example-search');
  const sel=$('example-select');
  if(!box||!sel) return;
  const q=box.value.trim().toLowerCase();
  Array.prototype.forEach.call(sel.querySelectorAll('optgroup'), function(group){
    let any=false;
    Array.prototype.forEach.call(group.children, function(opt){
      const show=!q || opt.textContent.toLowerCase().indexOf(q)!==-1;
      opt.hidden=!show;
      opt.disabled=!show;
      if(show) any=true;
    });
    group.hidden=!any;
    group.disabled=!any;
  });
}
function syncCoach(){
  const el=$('first-run');
  if(!el) return;
  const example=($('example-select')&&$('example-select').value)||'';
  let hide=false;
  try{ hide=sessionStorage.getItem('lab-coach')==='1'; }catch(e){}
  const empty=!example && (!components || !components.length);
  el.hidden=hide || !empty;
}
function stepExample(dir){
  const sel=$('example-select');
  const opts=Array.prototype.filter.call(sel.options, function(opt){ return opt.value && !opt.disabled; });
  let i=opts.findIndex(function(opt){ return opt.value===sel.value; });
  if(i<0) i=dir>0?-1:0;
  const next=opts[i+dir];
  if(!next) return;
  loadExample(next.value);
  try{
    const url=new URL(location.href);
    url.searchParams.set('example', next.value);
    url.searchParams.set('board', next.value==='esp32_blink' ? 'esp32' : 'uno');
    history.replaceState(null, '', url.pathname+url.search);
  }catch(e){}
}


/* Loaded in order by js/sim/boot.js. Do not load this file on its own. */
/* ===== v7: I/O functions (PWM, numeric analog pins, switches) ===== */
async function __pinMode(pin, mode) { const k = __pinKey(pin); pinStates[k] = { ...pinStates[k], mode }; }
function __setPinUI(k, v) {
  const ids = [k];
  if (k === 'A4' || k === 'SDA') ids.push('A4', 'SDA');
  if (k === 'A5' || k === 'SCL') ids.push('A5', 'SCL');
  ids.forEach(id => {
    const node = document.querySelector(`.pin-node[data-pin="${id}"]`);
    if (node) node.classList.toggle('active-high', !!v);
  });
  const ledPin = boardId === 'esp32' ? '2' : '13';
  if (k === ledPin) { const l = $('led-l'); if (l) l.classList.toggle('on-l', !!v); }
}
async function __digitalWrite(pin, val) {
  const k = __pinKey(pin), v = val ? 1 : 0;
  pinStates[k] = { ...pinStates[k], value: v, pwm: undefined };
  __setPinUI(k, v); updateVisualOutputs();
}
async function __analogWrite(pin, val) {
  const k = __pinKey(pin), p = Math.max(0, Math.min(255, Math.round(Number(val) || 0)));
  pinStates[k] = { ...pinStates[k], value: p > 127 ? 1 : 0, pwm: p };
  __setPinUI(k, p > 0); updateVisualOutputs();
}
async function __digitalRead(pin) {
  const k = __pinKey(pin);
  for (const { comp } of wiredComps(k)) {
    if (comp.type === 'btn') return comp.state.pressed ? 1 : 0;
    if (comp.type === 'switch') return comp.state.on ? 1 : 0;
    if (comp.type === 'pir') return comp.state.motion ? 1 : 0;
  }
  return pinStates[k]?.value || 0;
}
async function __analogRead(pin) {
  const n = boardId === 'esp32'
    ? String(__pinKey(pin))
    : (typeof pin === 'string' ? pin : 'A' + (Number(pin) >= 14 ? Number(pin) - 14 : Number(pin)));
  for (const { comp } of wiredComps(n)) {
    if (comp.type === 'pot' || comp.type === 'ldr' || comp.type === 'soil') return parseInt(comp.state.value, 10) || 0;
    if (comp.type === 'btn') return comp.state.pressed ? 1023 : 0;
    if (comp.type === 'switch') return comp.state.on ? 1023 : 0;
  }
  return 0;
}
async function __pulseIn(pin, val) {
  for (const { comp } of wiredComps(__pinKey(pin))) if (comp.type === 'ultrasonic') return Math.round((parseFloat(comp.state.distance) * 2) / 0.034);
  return 588;
}
async function __tone(pin, freq, duration) {
  const k = __pinKey(pin); toneState[k] = freq; playSynthSound(k, freq); updateVisualOutputs();
  if (duration) { await __delay(duration); stopSynthSound(k); delete toneState[k]; updateVisualOutputs(); }
}
async function __noTone(pin) { const k = __pinKey(pin); stopSynthSound(k); delete toneState[k]; updateVisualOutputs(); }
const __sat = stopAllTones;
stopAllTones = function () { __sat(); Object.keys(toneState).forEach(k => delete toneState[k]); updateVisualOutputs(); };
const __le2 = loadExample;
loadExample = function (k) { pinStates = {}; Object.keys(toneState).forEach(x => delete toneState[x]); document.querySelectorAll('.pin-node.active-high').forEach(p => p.classList.remove('active-high')); __le2(k); updateVisualOutputs(); };

// quick-send buttons for the serial monitor
(function () {
  const bar = document.querySelector('.serial-input-bar'); if (!bar) return;
  const q = document.createElement('div');
  q.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;padding:6px 8px;border-top:1px solid var(--card-border)';
  ['1', '0', 'a', 'hello'].forEach(t => {
    const b = document.createElement('button'); b.textContent = '➤ ' + t; b.style.cssText = 'padding:2px 10px;font-size:12px';
    b.onclick = () => { for (const ch of t) serialInputQueue.push(ch); }; q.appendChild(b);
  });
  bar.insertAdjacentElement('afterend', q);
})();


/* Loaded in order by js/sim/boot.js. Do not load this file on its own. */
/* ===== v7: more interactive projects ===== */
const __rid = () => 'w' + Math.random().toString(36).slice(2, 8);
const __W = (ard, cid, pin, col) => wires.push({ id: __rid(), from: { type: 'ard', pinId: String(ard) }, to: { type: 'comp', pinId: `${cid}-${pin}` }, color: col || '#ef4444' });
const __WC = (a, ap, b, bp, col) => wires.push({ id: __rid(), from: { type: 'comp', pinId: `${a}-${ap}` }, to: { type: 'comp', pinId: `${b}-${bp}` }, color: col || '#f59e0b' });
const __pot = (x, y, a) => { const id = addComponent('pot', x, y); __W('5V', id, 'VCC'); __W('GND', id, 'GND', '#64748b'); __W(a, id, 'OUT', '#f59e0b'); return id; };
function __extend(key, fn) {
  const ex = EXAMPLES[key]; if (!ex) return; const s = ex.setup;
  ex.setup = function () { s(); fn(); renderComponents(); renderWires(); };
}
function __loadOnRelay(type) {           // relay now switches a visible load through its COM/NO contacts
  const r = components.find(c => c.type === 'relay'); if (!r) return;
  const L = addComponent(type, r.x, Math.min(r.y + 150, 400));
  __W('5V', r.id, 'COM'); __WC(r.id, 'NO', L, 'POS'); __W('GND', L, 'GND', '#64748b');
}
['relay', 'smart_home', 'auto_street_light'].forEach(k => __extend(k, () => __loadOnRelay('lamp')));
__extend('smart_garden', () => __loadOnRelay('fan'));

EXAMPLES.rgb = {
  code: `// Example 11: RGB color mixer — mix red, green, and blue with 3 potentiometers
int rPin = 11;
int gPin = 10;
int bPin = 9;

void setup() {
  Serial.begin(9600);
  pinMode(rPin, OUTPUT);
  pinMode(gPin, OUTPUT);
  pinMode(bPin, OUTPUT);
}

void loop() {
  int r = map(analogRead(A0), 0, 1023, 0, 255);
  int g = map(analogRead(A1), 0, 1023, 0, 255);
  int b = map(analogRead(A2), 0, 1023, 0, 255);
  analogWrite(rPin, r);
  analogWrite(gPin, g);
  analogWrite(bPin, b);
  Serial.print("R="); Serial.print(r);
  Serial.print(" G="); Serial.print(g);
  Serial.print(" B="); Serial.println(b);
  delay(100);
}`,
  setup() {
    clearWorkspace();
    const c = addComponent('rgb', 620, 140);
    __W(11, c, 'R', '#ef4444'); __W(10, c, 'G', '#22c55e'); __W(9, c, 'B', '#3b82f6'); __W('GND', c, 'GND', '#64748b');
    __pot(380, 20, 'A0'); __pot(380, 170, 'A1'); __pot(380, 320, 'A2');
    renderWires();
  }
};

EXAMPLES.servo = {
  code: `// Example 24: Control the servo angle with a potentiometer
#include <Servo.h>

Servo myServo;
int potPin = A0;

void setup() {
  myServo.attach(9);
  Serial.begin(9600);
}

void loop() {
  int val = analogRead(potPin);
  int angle = map(val, 0, 1023, 0, 180);
  myServo.write(angle);
  Serial.print("Angle: ");
  Serial.println(angle);
  delay(50);
}`,
  setup() {
    clearWorkspace();
    const s = addComponent('servo', 620, 60);
    __W(9, s, 'PWM', '#f59e0b'); __W('5V', s, 'VCC'); __W('GND', s, 'GND', '#64748b');
    __pot(380, 200, 'A0');
    renderWires();
  }
};

EXAMPLES.tone = {
  code: `// Example 10: Press the button to sound the buzzer, and change the pitch with the potentiometer
int buzzerPin = 8;
int buttonPin = 2;
int potPin = A0;

void setup() {
  pinMode(buttonPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  if (digitalRead(buttonPin) == HIGH) {
    int freq = map(analogRead(potPin), 0, 1023, 200, 2000);
    tone(buzzerPin, freq);
  } else {
    noTone(buzzerPin);
  }
}`,
  setup() {
    clearWorkspace();
    const b = addComponent('buz', 620, 60);
    __W(8, b, 'POS', '#f59e0b'); __W('GND', b, 'GND', '#64748b');
    const bt = addComponent('btn', 380, 40);
    __W(2, bt, 'PIN1', '#3b82f6'); __W('5V', bt, 'PIN2');
    __pot(380, 190, 'A0');
    renderWires();
  }
};

EXAMPLES.lcd = {
  code: `// Example 21: Show the potentiometer value live on the LCD
#include <LiquidCrystal.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
int potPin = A0;

void setup() {
  lcd.begin(16, 2);
  lcd.print("Pot Value:");
}

void loop() {
  int val = analogRead(potPin);
  lcd.setCursor(0, 1);
  lcd.print(val);
  lcd.print("    ");
  delay(200);
}`,
  setup() {
    clearWorkspace();
    const l = addComponent('lcd', 620, 60);
    __W('5V', l, 'VCC'); __W('GND', l, 'GND', '#64748b'); __W('A4', l, 'SDA', '#3b82f6'); __W('A5', l, 'SCL', '#f59e0b');
    __pot(380, 100, 'A0');
    renderWires();
  }
};

EXAMPLES.switch_lamp = {
  code: `// Example 3: The lamp turns on with the switch and off when the switch is off
int swPin = 2;
int lampPin = 13;

void setup() {
  pinMode(swPin, INPUT);
  pinMode(lampPin, OUTPUT);
}

void loop() {
  if (digitalRead(swPin) == HIGH) {
    digitalWrite(lampPin, HIGH);
  } else {
    digitalWrite(lampPin, LOW);
  }
  delay(50);
}`,
  setup() {
    clearWorkspace();
    const sw = addComponent('switch', 400, 80);
    const lamp = addComponent('lamp', 580, 60);
    __W(2, sw, 'PIN1', '#3b82f6');
    __W('5V', sw, 'PIN2');
    __W(13, lamp, 'POS', '#f59e0b');
    __W('GND', lamp, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.fan_speed = {
  code: `// Example 9: Turning the potentiometer changes the fan speed
int fanPin = 9;

void setup() {
  pinMode(fanPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int speed = map(analogRead(A0), 0, 1023, 0, 255);
  analogWrite(fanPin, speed);
  Serial.print("Fan speed: ");
  Serial.println(speed);
  delay(80);
}`,
  setup() {
    clearWorkspace();
    const fan = addComponent('fan', 580, 50);
    __W(9, fan, 'POS', '#f59e0b');
    __W('GND', fan, 'GND', '#171717');
    const potId = __pot(380, 180, 'A0');
    const pot = components.find(c => c.id === potId);
    if (pot) pot.state.value = 0;
    renderComponents();
    renderWires();
  }
};

EXAMPLES.led_chase = {
  code: `// Example 6: Four LEDs light one after another — a classic chase
int pins[] = {10, 11, 12, 13};

void setup() {
  pinMode(10, OUTPUT);
  pinMode(11, OUTPUT);
  pinMode(12, OUTPUT);
  pinMode(13, OUTPUT);
}

void loop() {
  for (int i = 0; i < 4; i++) {
    digitalWrite(pins[i], HIGH);
    delay(180);
    digitalWrite(pins[i], LOW);
  }
}`,
  setup() {
    clearWorkspace();
    [10, 11, 12, 13].forEach((pin, i) => {
      const res = addComponent('res', 400, 24 + i * 72);
      const led = addComponent(i % 2 ? 'led_g' : 'led_r', 530, 16 + i * 72);
      __W(pin, res, 'A', '#15803d');
      __WC(res, 'B', led, 'ANODE', '#f97316');
      __W('GND', led, 'CATHODE', '#171717');
    });
    renderWires();
  }
};

EXAMPLES.parking = {
  code: `// Example 14: When something is close, the LED lights and the buzzer beeps faster
int trigPin = 9;
int echoPin = 8;
int buzPin = 6;
int ledPin = 13;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(buzPin, OUTPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;
  Serial.print("Distance: ");
  Serial.print(cm);
  Serial.println(" cm");

  if (cm < 30) {
    digitalWrite(ledPin, HIGH);
    int gap = map(constrain(cm, 2, 30), 2, 30, 40, 350);
    tone(buzPin, 1400, 40);
    delay(gap);
  } else {
    digitalWrite(ledPin, LOW);
    noTone(buzPin);
    delay(200);
  }
}`,
  setup() {
    clearWorkspace();
    const us = addComponent('ultrasonic', 390, 16);
    const sensor = components.find(c => c.id === us);
    if (sensor) sensor.state.distance = 80;
    const buz = addComponent('buz', 580, 20);
    const res = addComponent('res', 390, 190);
    const led = addComponent('led_r', 530, 180);
    __W('5V', us, 'VCC');
    __W('GND', us, 'GND', '#171717');
    __W(9, us, 'TRIG', '#f59e0b');
    __W(8, us, 'ECHO', '#2563eb');
    __W(6, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    __W(13, res, 'A', '#15803d');
    __WC(res, 'B', led, 'ANODE', '#f97316');
    __W('GND', led, 'CATHODE', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.thermostat = {
  code: `// Example 28: The fan spins at 30°C or higher
#include <DHT.h>

DHT dht(2, DHT11);
int fanPin = 9;

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(fanPin, OUTPUT);
}

void loop() {
  float temp = dht.readTemperature();
  Serial.print("Temp: ");
  Serial.print(temp);
  Serial.println(" C");
  if (temp >= 30) {
    analogWrite(fanPin, 255);
  } else {
    analogWrite(fanPin, 0);
  }
  delay(300);
}`,
  setup() {
    clearWorkspace();
    const dhtId = addComponent('dht', 400, 40);
    const dht = components.find(c => c.id === dhtId);
    if (dht) dht.state.temp = 24;
    const fan = addComponent('fan', 580, 70);
    __W('5V', dhtId, 'VCC');
    __W(2, dhtId, 'DATA', '#f59e0b');
    __W('GND', dhtId, 'GND', '#171717');
    __W(9, fan, 'POS', '#f59e0b');
    __W('GND', fan, 'GND', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.fade = {
  code: `// Example 2: The LED fades in, then fades out
int ledPin = 9;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  for (int b = 0; b <= 255; b = b + 5) {
    analogWrite(ledPin, b);
    delay(15);
  }
  for (int b = 255; b >= 0; b = b - 5) {
    analogWrite(ledPin, b);
    delay(15);
  }
}`,
  setup() {
    clearWorkspace();
    const res = addComponent('res', 400, 90);
    const led = addComponent('led_r', 530, 80);
    __W(9, res, 'A', '#15803d');
    __WC(res, 'B', led, 'ANODE', '#f97316');
    __W('GND', led, 'CATHODE', '#171717');
    renderWires();
  }
};

EXAMPLES.doorbell = {
  code: `// Example 5: Press the button and the doorbell sounds once
int btnPin = 2;
int buzPin = 8;
int pressed = 0;

void setup() {
  pinMode(btnPin, INPUT);
  pinMode(buzPin, OUTPUT);
}

void loop() {
  int now = digitalRead(btnPin);
  if (now == HIGH && pressed == LOW) {
    tone(buzPin, 659, 120);
    delay(140);
    tone(buzPin, 880, 220);
  }
  pressed = now;
  delay(20);
}`,
  setup() {
    clearWorkspace();
    const btn = addComponent('btn', 400, 70);
    const buz = addComponent('buz', 580, 60);
    __W(2, btn, 'PIN1', '#3b82f6');
    __W('5V', btn, 'PIN2');
    __W(8, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.light_dimmer = {
  code: `// Example 16: Raising the LDR slider makes the lamp brighter
int lampPin = 9;

void setup() {
  pinMode(lampPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(A0);
  int bright = map(light, 0, 1023, 0, 255);
  analogWrite(lampPin, bright);
  Serial.print("Brightness: ");
  Serial.println(bright);
  delay(80);
}`,
  setup() {
    clearWorkspace();
    const ldrId = addComponent('ldr', 400, 80);
    const ldr = components.find(c => c.id === ldrId);
    if (ldr) ldr.state.value = 0;
    const lamp = addComponent('lamp', 580, 70);
    __W('5V', ldrId, 'VCC');
    __W('A0', ldrId, 'OUT', '#f59e0b');
    __W('GND', ldrId, 'GND', '#171717');
    __W(9, lamp, 'POS', '#f59e0b');
    __W('GND', lamp, 'GND', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.motion_light = {
  code: `// Example 18: The lamp turns on when the PIR detects motion
int pirPin = 2;
int lampPin = 13;

void setup() {
  pinMode(pirPin, INPUT);
  pinMode(lampPin, OUTPUT);
}

void loop() {
  if (digitalRead(pirPin) == HIGH) {
    digitalWrite(lampPin, HIGH);
  } else {
    digitalWrite(lampPin, LOW);
  }
  delay(50);
}`,
  setup() {
    clearWorkspace();
    const pir = addComponent('pir', 400, 70);
    const lamp = addComponent('lamp', 580, 60);
    __W('5V', pir, 'VCC');
    __W(2, pir, 'OUT', '#3b82f6');
    __W('GND', pir, 'GND', '#171717');
    __W(13, lamp, 'POS', '#f59e0b');
    __W('GND', lamp, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.distance_lcd = {
  code: `// Example 22: Ultrasonic distance shown on the LCD
#include <LiquidCrystal.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
int trigPin = 9;
int echoPin = 8;

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  lcd.begin(16, 2);
  lcd.print("Distance");
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;

  lcd.setCursor(0, 1);
  lcd.print(cm);
  lcd.print(" cm   ");
  delay(200);
}`,
  setup() {
    clearWorkspace();
    const us = addComponent('ultrasonic', 390, 20);
    const sensor = components.find(c => c.id === us);
    if (sensor) sensor.state.distance = 42;
    const lcd = addComponent('lcd', 390, 190);
    __W('5V', us, 'VCC');
    __W('GND', us, 'GND', '#171717');
    __W(9, us, 'TRIG', '#f59e0b');
    __W(8, us, 'ECHO', '#2563eb');
    __W('5V', lcd, 'VCC');
    __W('GND', lcd, 'GND', '#171717');
    __W('A4', lcd, 'SDA', '#3b82f6');
    __W('A5', lcd, 'SCL', '#f59e0b');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.dice = {
  code: `// Example 26: Press the button to show 1 through 6 on the 7-segment
int btnPin = 12;
int pins[] = {2, 3, 4, 5, 6, 7, 8};
int pressed = 0;

byte face[6][7] = {
  {0, 1, 1, 0, 0, 0, 0},
  {1, 1, 0, 1, 1, 0, 1},
  {1, 1, 1, 1, 0, 0, 1},
  {0, 1, 1, 0, 0, 1, 1},
  {1, 0, 1, 1, 0, 1, 1},
  {1, 0, 1, 1, 1, 1, 1}
};

void setup() {
  pinMode(btnPin, INPUT);
  for (int i = 0; i < 7; i++) pinMode(pins[i], OUTPUT);
}

void loop() {
  int now = digitalRead(btnPin);
  if (now == HIGH && pressed == LOW) {
    int n = random(1, 7);
    for (int i = 0; i < 7; i++) {
      digitalWrite(pins[i], face[n - 1][i]);
    }
  }
  pressed = now;
  delay(30);
}`,
  setup() {
    clearWorkspace();
    const seg = addComponent('seg7', 560, 60);
    const btn = addComponent('btn', 380, 80);
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((s, idx) => {
      __W(idx + 2, seg, s, '#22c55e');
    });
    __W('GND', seg, 'COM', '#171717');
    __W(12, btn, 'PIN1', '#3b82f6');
    __W('5V', btn, 'PIN2');
    renderWires();
  }
};

EXAMPLES.sos = {
  code: `// Example 39: Morse SOS — LED and buzzer play ... --- ...
int ledPin = 13;
int buzPin = 8;

void mark(int ms) {
  digitalWrite(ledPin, HIGH);
  tone(buzPin, 700);
  delay(ms);
  noTone(buzPin);
  digitalWrite(ledPin, LOW);
  delay(140);
}

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(buzPin, OUTPUT);
}

void loop() {
  mark(140); mark(140); mark(140);
  delay(280);
  mark(420); mark(420); mark(420);
  delay(280);
  mark(140); mark(140); mark(140);
  delay(800);
}`,
  setup() {
    clearWorkspace();
    const res = addComponent('res', 400, 40);
    const led = addComponent('led_r', 540, 28);
    const buz = addComponent('buz', 540, 180);
    __W(13, res, 'A', '#15803d');
    __WC(res, 'B', led, 'ANODE', '#f97316');
    __W('GND', led, 'CATHODE', '#171717');
    __W(8, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.binary_count = {
  code: `// Example 40: Four LEDs count from 0 to 15 in binary (pin 10 = LSB)
int bit0 = 10;
int bit1 = 11;
int bit2 = 12;
int bit3 = 13;
int n = 0;

void setup() {
  Serial.begin(9600);
  pinMode(bit0, OUTPUT);
  pinMode(bit1, OUTPUT);
  pinMode(bit2, OUTPUT);
  pinMode(bit3, OUTPUT);
}

void loop() {
  digitalWrite(bit0, (n & 1) ? HIGH : LOW);
  digitalWrite(bit1, (n & 2) ? HIGH : LOW);
  digitalWrite(bit2, (n & 4) ? HIGH : LOW);
  digitalWrite(bit3, (n & 8) ? HIGH : LOW);
  Serial.print("Count: ");
  Serial.println(n);
  delay(450);
  n = n + 1;
  if (n > 15) n = 0;
}`,
  setup() {
    clearWorkspace();
    [10, 11, 12, 13].forEach((pin, i) => {
      const res = addComponent('res', 400, 20 + i * 78);
      const led = addComponent(i % 2 ? 'led_g' : 'led_r', 540, 8 + i * 78);
      __W(pin, res, 'A', '#15803d');
      __WC(res, 'B', led, 'ANODE', '#f97316');
      __W('GND', led, 'CATHODE', '#171717');
    });
    renderWires();
  }
};

EXAMPLES.parking_gate = {
  code: `// Example 41: The barrier opens when a car is close and closes when it is far
#include <Servo.h>

Servo gate;
int trigPin = 7;
int echoPin = 6;

void setup() {
  Serial.begin(9600);
  gate.attach(9);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(12, OUTPUT);
  pinMode(13, OUTPUT);
  gate.write(0);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;
  Serial.print("Distance: ");
  Serial.print(cm);
  Serial.println(" cm");

  if (cm < 18) {
    gate.write(90);
    digitalWrite(12, HIGH);
    digitalWrite(13, LOW);
  } else {
    gate.write(0);
    digitalWrite(12, LOW);
    digitalWrite(13, HIGH);
  }
  delay(120);
}`,
  setup() {
    clearWorkspace();
    const us = addComponent('ultrasonic', 370, 16);
    const sensor = components.find(c => c.id === us);
    if (sensor) sensor.state.distance = 80;
    const srv = addComponent('servo', 600, 20);
    const resR = addComponent('res', 370, 200);
    const red = addComponent('led_r', 510, 188);
    const resG = addComponent('res', 370, 290);
    const grn = addComponent('led_g', 510, 278);
    __W('5V', us, 'VCC');
    __W('GND', us, 'GND', '#171717');
    __W(7, us, 'TRIG', '#f59e0b');
    __W(6, us, 'ECHO', '#3b82f6');
    __W(9, srv, 'PWM', '#f59e0b');
    __W('5V', srv, 'VCC');
    __W('GND', srv, 'GND', '#171717');
    __W(12, resG, 'A', '#15803d');
    __WC(resG, 'B', grn, 'ANODE', '#22c55e');
    __W('GND', grn, 'CATHODE', '#171717');
    __W(13, resR, 'A', '#15803d');
    __WC(resR, 'B', red, 'ANODE', '#f97316');
    __W('GND', red, 'CATHODE', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.humidity_watch = {
  code: `// Example 42: DHT11 humidity on the LCD; the LED lights above 75%
#include <DHT.h>
#include <LiquidCrystal.h>

DHT dht(2, DHT11);
LiquidCrystal lcd;

void setup() {
  dht.begin();
  lcd.begin(16, 2);
  pinMode(13, OUTPUT);
  lcd.setCursor(0, 0);
  lcd.print("Humidity watch");
}

void loop() {
  int h = dht.readHumidity();
  lcd.setCursor(0, 1);
  lcd.print("Hum ");
  lcd.print(h);
  lcd.print("%     ");
  if (h > 75) digitalWrite(13, HIGH);
  else digitalWrite(13, LOW);
  delay(400);
}`,
  setup() {
    clearWorkspace();
    const d = addComponent('dht', 370, 30);
    const lcd = addComponent('lcd', 600, 30);
    const res = addComponent('res', 370, 220);
    const led = addComponent('led_r', 510, 208);
    __W('5V', d, 'VCC');
    __W(2, d, 'DATA', '#f59e0b');
    __W('GND', d, 'GND', '#64748b');
    __W('5V', lcd, 'VCC');
    __W('GND', lcd, 'GND', '#64748b');
    __W('A4', lcd, 'SDA', '#3b82f6');
    __W('A5', lcd, 'SCL', '#f59e0b');
    __W(13, res, 'A', '#15803d');
    __WC(res, 'B', led, 'ANODE', '#f97316');
    __W('GND', led, 'CATHODE', '#171717');
    renderWires();
  }
};

EXAMPLES.mood_lamp = {
  code: `// Example 43: The RGB lamp fades through red, green, and blue on its own
int level = 0;
int dir = 5;
int step = 0;

void setup() {
  pinMode(11, OUTPUT);
  pinMode(10, OUTPUT);
  pinMode(9, OUTPUT);
}

void loop() {
  level = level + dir;
  if (level >= 255) { level = 255; dir = -5; }
  if (level <= 0) {
    level = 0;
    dir = 5;
    step = step + 1;
    if (step > 2) step = 0;
  }
  int r = 0;
  int g = 0;
  int b = 0;
  if (step == 0) r = level;
  if (step == 1) g = level;
  if (step == 2) b = level;
  analogWrite(11, r);
  analogWrite(10, g);
  analogWrite(9, b);
  delay(20);
}`,
  setup() {
    clearWorkspace();
    const c = addComponent('rgb', 520, 80);
    __W(11, c, 'R', '#ef4444');
    __W(10, c, 'G', '#22c55e');
    __W(9, c, 'B', '#3b82f6');
    __W('GND', c, 'GND', '#64748b');
    renderWires();
  }
};

EXAMPLES.metronome = {
  code: `// Example 44: Potentiometer sets the beat speed (40–200 BPM)
int buzPin = 8;
int ledPin = 13;

void setup() {
  pinMode(buzPin, OUTPUT);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int bpm = map(analogRead(A0), 0, 1023, 40, 200);
  int gap = 60000 / bpm;
  Serial.print("BPM: ");
  Serial.println(bpm);
  digitalWrite(ledPin, HIGH);
  tone(buzPin, 1200, 40);
  delay(80);
  digitalWrite(ledPin, LOW);
  delay(gap);
}`,
  setup() {
    clearWorkspace();
    const res = addComponent('res', 400, 30);
    const led = addComponent('led_g', 540, 18);
    const buz = addComponent('buz', 540, 160);
    __W(13, res, 'A', '#15803d');
    __WC(res, 'B', led, 'ANODE', '#22c55e');
    __W('GND', led, 'CATHODE', '#171717');
    __W(8, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    const potId = __pot(370, 280, 'A0');
    const pot = components.find(c => c.id === potId);
    if (pot) pot.state.value = 400;
    renderComponents();
    renderWires();
  }
};

EXAMPLES.pedestrian = {
  code: `// Example 45: Press the button to stop the cars and light the walk LED
int btnPin = 2;
int redPin = 11;
int grnPin = 10;
int walkPin = 13;
int buzPin = 8;
int phase = 0;
int tick = 0;

void cars(int red, int grn) {
  digitalWrite(redPin, red);
  digitalWrite(grnPin, grn);
}

void setup() {
  pinMode(btnPin, INPUT);
  pinMode(redPin, OUTPUT);
  pinMode(grnPin, OUTPUT);
  pinMode(walkPin, OUTPUT);
  pinMode(buzPin, OUTPUT);
}

void loop() {
  if (digitalRead(btnPin) == HIGH) {
    cars(HIGH, LOW);
    digitalWrite(walkPin, HIGH);
    tone(buzPin, 880, 90);
    delay(280);
    digitalWrite(walkPin, LOW);
    delay(180);
  } else {
    digitalWrite(walkPin, LOW);
    noTone(buzPin);
    if (phase == 0) cars(LOW, HIGH);
    else if (phase == 1) cars(HIGH, HIGH);
    else cars(HIGH, LOW);
    tick = tick + 1;
    if (tick > 6) {
      tick = 0;
      phase = phase + 1;
      if (phase > 2) phase = 0;
    }
    delay(220);
  }
}`,
  setup() {
    clearWorkspace();
    const rgb = addComponent('rgb', 560, 20);
    const btn = addComponent('btn', 370, 30);
    const res = addComponent('res', 370, 180);
    const walk = addComponent('led_g', 510, 168);
    const buz = addComponent('buz', 560, 200);
    __W(11, rgb, 'R', '#ef4444');
    __W(10, rgb, 'G', '#22c55e');
    __W(9, rgb, 'B', '#3b82f6');
    __W('GND', rgb, 'GND', '#64748b');
    __W(2, btn, 'PIN1', '#3b82f6');
    __W('5V', btn, 'PIN2');
    __W(13, res, 'A', '#15803d');
    __WC(res, 'B', walk, 'ANODE', '#22c55e');
    __W('GND', walk, 'CATHODE', '#171717');
    __W(8, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.temp_fan_pwm = {
  code: `// Example 46: The fan spins faster as the temperature rises (PWM)
#include <DHT.h>

DHT dht(2, DHT11);
int fanPin = 9;

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(fanPin, OUTPUT);
}

void loop() {
  int temp = dht.readTemperature();
  int speed = map(temp, 24, 40, 0, 255);
  speed = constrain(speed, 0, 255);
  analogWrite(fanPin, speed);
  Serial.print("Temp: ");
  Serial.print(temp);
  Serial.print(" C  PWM: ");
  Serial.println(speed);
  delay(300);
}`,
  setup() {
    clearWorkspace();
    const d = addComponent('dht', 380, 40);
    const fan = addComponent('fan', 600, 50);
    __W('5V', d, 'VCC');
    __W(2, d, 'DATA', '#f59e0b');
    __W('GND', d, 'GND', '#64748b');
    __W(9, fan, 'POS', '#f59e0b');
    __W('GND', fan, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.soil_meter = {
  code: `// Example 47: Potentiometer stands in for a soil sensor. A low value means dry, and the lamp turns on
#include <LiquidCrystal.h>

LiquidCrystal lcd;
int lampPin = 9;

void setup() {
  lcd.begin(16, 2);
  pinMode(lampPin, OUTPUT);
  lcd.setCursor(0, 0);
  lcd.print("Soil moisture");
}

void loop() {
  int v = analogRead(A0);
  lcd.setCursor(0, 1);
  if (v < 400) {
    lcd.print("DRY   water now");
    digitalWrite(lampPin, HIGH);
  } else {
    lcd.print("WET   soil ok  ");
    digitalWrite(lampPin, LOW);
  }
  delay(200);
}`,
  setup() {
    clearWorkspace();
    const lcd = addComponent('lcd', 600, 30);
    const lamp = addComponent('lamp', 600, 200);
    __W('5V', lcd, 'VCC');
    __W('GND', lcd, 'GND', '#64748b');
    __W('A4', lcd, 'SDA', '#3b82f6');
    __W('A5', lcd, 'SCL', '#f59e0b');
    __W(9, lamp, 'POS', '#f59e0b');
    __W('GND', lamp, 'GND', '#171717');
    const potId = __pot(370, 80, 'A0');
    const pot = components.find(c => c.id === potId);
    if (pot) pot.state.value = 700;
    renderComponents();
    renderWires();
  }
};

EXAMPLES.message_board = {
  code: `// Example 48: Press the button to change the LCD message and beep the buzzer once
#include <LiquidCrystal.h>

LiquidCrystal lcd;
int btnPin = 2;
int buzPin = 8;
int page = 0;
int held = 0;

void showPage() {
  lcd.setCursor(0, 0);
  lcd.print("Message board  ");
  lcd.setCursor(0, 1);
  if (page == 0) lcd.print("Hello, Arduino! ");
  if (page == 1) lcd.print("Press the button");
  if (page == 2) lcd.print("Keep learning!  ");
}

void setup() {
  lcd.begin(16, 2);
  pinMode(btnPin, INPUT);
  pinMode(buzPin, OUTPUT);
  showPage();
}

void loop() {
  int now = digitalRead(btnPin);
  if (now == HIGH && held == LOW) {
    page = page + 1;
    if (page > 2) page = 0;
    showPage();
    tone(buzPin, 660, 80);
  }
  held = now;
  delay(40);
}`,
  setup() {
    clearWorkspace();
    const btn = addComponent('btn', 370, 40);
    const lcd = addComponent('lcd', 560, 30);
    const buz = addComponent('buz', 370, 200);
    __W(2, btn, 'PIN1', '#3b82f6');
    __W('5V', btn, 'PIN2');
    __W('5V', lcd, 'VCC');
    __W('GND', lcd, 'GND', '#64748b');
    __W('A4', lcd, 'SDA', '#3b82f6');
    __W('A5', lcd, 'SCL', '#f59e0b');
    __W(8, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.distance_gauge = {
  code: `// Example 49: Ultrasonic distance shown with a servo needle
#include <Servo.h>

Servo needle;
int trigPin = 7;
int echoPin = 6;

void setup() {
  Serial.begin(9600);
  needle.attach(9);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;
  cm = constrain(cm, 2, 150);
  int angle = map(cm, 2, 150, 0, 180);
  needle.write(angle);
  Serial.print(cm);
  Serial.print(" cm  -> ");
  Serial.print(angle);
  Serial.println(" deg");
  delay(80);
}`,
  setup() {
    clearWorkspace();
    const us = addComponent('ultrasonic', 380, 40);
    const sensor = components.find(c => c.id === us);
    if (sensor) sensor.state.distance = 60;
    const srv = addComponent('servo', 620, 50);
    __W('5V', us, 'VCC');
    __W('GND', us, 'GND', '#171717');
    __W(7, us, 'TRIG', '#f59e0b');
    __W(6, us, 'ECHO', '#3b82f6');
    __W(9, srv, 'PWM', '#f59e0b');
    __W('5V', srv, 'VCC');
    __W('GND', srv, 'GND', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.night_guard = {
  code: `// Example 50: In the dark, PIR motion triggers the lamp, buzzer, and LCD alarm
#include <LiquidCrystal.h>

LiquidCrystal lcd;
int pirPin = 2;
int lampPin = 9;
int buzPin = 8;

void setup() {
  lcd.begin(16, 2);
  pinMode(pirPin, INPUT);
  pinMode(lampPin, OUTPUT);
  pinMode(buzPin, OUTPUT);
  lcd.setCursor(0, 0);
  lcd.print("Night guard");
}

void loop() {
  int dark = analogRead(A0) < 400;
  int motion = digitalRead(pirPin);
  lcd.setCursor(0, 1);
  if (dark && motion) {
    lcd.print("INTRUDER!      ");
    digitalWrite(lampPin, HIGH);
    tone(buzPin, 1400, 120);
  } else {
    lcd.print(dark ? "Dark, watching  " : "Day, standing by");
    digitalWrite(lampPin, LOW);
    noTone(buzPin);
  }
  delay(180);
}`,
  setup() {
    clearWorkspace();
    const ldrId = addComponent('ldr', 360, 16);
    const ldr = components.find(c => c.id === ldrId);
    if (ldr) ldr.state.value = 900;
    const pir = addComponent('pir', 360, 190);
    const lamp = addComponent('lamp', 560, 16);
    const buz = addComponent('buz', 560, 190);
    const lcd = addComponent('lcd', 740, 40);
    __W('5V', ldrId, 'VCC');
    __W('GND', ldrId, 'GND', '#64748b');
    __W('A0', ldrId, 'OUT', '#f59e0b');
    __W('5V', pir, 'VCC');
    __W(2, pir, 'OUT', '#3b82f6');
    __W('GND', pir, 'GND', '#64748b');
    __W(9, lamp, 'POS', '#f59e0b');
    __W('GND', lamp, 'GND', '#171717');
    __W(8, buz, 'POS', '#eab308');
    __W('GND', buz, 'GND', '#171717');
    __W('5V', lcd, 'VCC');
    __W('GND', lcd, 'GND', '#64748b');
    __W('A4', lcd, 'SDA', '#3b82f6');
    __W('A5', lcd, 'SCL', '#f59e0b');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.dark_alarm = {
  code: `// Example 51: Dark alarm (LDR + LED + Buzzer)
int ldrPin = A0;
int ledPin = 13;
int buzPin = 8;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
  pinMode(buzPin, OUTPUT);
  Serial.println("Dark alarm ready. Lower the LDR light to trigger it.");
}

void loop() {
  int light = analogRead(ldrPin);
  Serial.print("Light: ");
  Serial.println(light);

  if (light < 400) {
    digitalWrite(ledPin, HIGH);
    tone(buzPin, 880, 160);
    delay(180);
    noTone(buzPin);
    delay(240);
  } else {
    digitalWrite(ledPin, LOW);
    noTone(buzPin);
    delay(200);
  }
}`,
  setup() {
    clearWorkspace();
    const ldrId = addComponent('ldr', 360, 30);
    const ldr = components.find(c => c.id === ldrId);
    if (ldr) ldr.state.value = 220;
    const led = addComponent('led_r', 560, 24);
    const buz = addComponent('buz', 560, 210);
    __W('5V', ldrId, 'VCC');
    __W('A0', ldrId, 'OUT', '#f59e0b');
    __W('GND', ldrId, 'GND', '#171717');
    __W(13, led, 'ANODE', '#22c55e');
    __W('GND', led, 'CATHODE', '#171717');
    __W(8, buz, 'POS', '#eab308');
    __W('GND', buz, 'GND', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.oled_hello = {
    code: `// Example 52: OLED 0.96" message
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 oled(128, 64);

void setup() {
  oled.begin();
  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setCursor(0, 0);
  oled.println("Arduino OLED");
  oled.setCursor(0, 16);
  oled.println("128 x 64");
  oled.setCursor(0, 32);
  oled.println("I2C SSD1306");
  oled.display();
}

void loop() {
}`,
    setup() {
      clearWorkspace();
      const id = addComponent('oled', 400, 70);
      __W('5V', id, 'VCC');
      __W('GND', id, 'GND', '#171717');
      __W('A4', id, 'SDA', '#3b82f6');
      __W('A5', id, 'SCL', '#f59e0b');
      renderComponents();
      renderWires();
    }
};

EXAMPLES.oled_light = {
    code: `// Example 53: LDR + OLED light meter
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 oled(128, 64);

void setup() {
  oled.begin();
}

void loop() {
  int light = analogRead(A0);
  oled.clearDisplay();
  oled.setCursor(0, 0);
  oled.println("Light meter");
  oled.setCursor(0, 16);
  oled.print(light);
  oled.setCursor(0, 32);
  oled.println(light < 400 ? "DARK" : "BRIGHT");
  oled.display();
  delay(200);
}`,
    setup() {
      clearWorkspace();
      const ldrId = addComponent('ldr', 340, 20);
      const ldr = components.find(c => c.id === ldrId);
      if (ldr) ldr.state.value = 220;
      const id = addComponent('oled', 500, 70);
      __W('5V', ldrId, 'VCC');
      __W('A0', ldrId, 'OUT', '#f59e0b');
      __W('GND', ldrId, 'GND', '#171717');
      __W('5V', id, 'VCC');
      __W('GND', id, 'GND', '#171717');
      __W('A4', id, 'SDA', '#3b82f6');
      __W('A5', id, 'SCL', '#eab308');
      renderComponents();
      renderWires();
    }
};

EXAMPLES.oled_distance = {
    code: `// Example 54: Ultrasonic distance on the OLED
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 oled(128, 64);
int trigPin = 9;
int echoPin = 8;

void setup() {
  oled.begin();
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;
  oled.clearDisplay();
  oled.setCursor(0, 0);
  oled.println("Distance");
  oled.setCursor(0, 16);
  oled.print(cm);
  oled.println(" cm");
  oled.display();
  delay(200);
}`,
    setup() {
      clearWorkspace();
      const usId = addComponent('ultrasonic', 300, 16);
      const id = addComponent('oled', 520, 80);
      __W('5V', usId, 'VCC');
      __W('9', usId, 'TRIG', '#f59e0b');
      __W('8', usId, 'ECHO', '#3b82f6');
      __W('GND', usId, 'GND', '#171717');
      __W('5V', id, 'VCC');
      __W('GND', id, 'GND', '#171717');
      __W('A4', id, 'SDA', '#60a5fa');
      __W('A5', id, 'SCL', '#eab308');
      renderComponents();
      renderWires();
    }
};

EXAMPLES.oled_near = {
    code: `// Example 55: The LED lights when the distance is under 150 cm
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 oled(128, 64);
int trigPin = 9;
int echoPin = 8;
int ledPin = 13;

void setup() {
  oled.begin();
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;

  if (cm < 150) digitalWrite(ledPin, HIGH);
  else digitalWrite(ledPin, LOW);

  oled.clearDisplay();
  oled.setCursor(0, 0);
  oled.println("Distance");
  oled.setCursor(0, 16);
  oled.print(cm);
  oled.println(" cm");
  oled.setCursor(0, 32);
  oled.println(cm < 150 ? "Light On" : "Light Off");
  oled.display();
  delay(200);
}`,
    setup() {
      clearWorkspace();
      const usId = addComponent('ultrasonic', 280, 16);
      const id = addComponent('oled', 470, 80);
      const led = addComponent('led_r', 700, 24);
      __W('5V', usId, 'VCC');
      __W('9', usId, 'TRIG', '#f59e0b');
      __W('8', usId, 'ECHO', '#3b82f6');
      __W('GND', usId, 'GND', '#171717');
      __W('5V', id, 'VCC');
      __W('GND', id, 'GND', '#171717');
      __W('A4', id, 'SDA', '#60a5fa');
      __W('A5', id, 'SCL', '#eab308');
      __W(13, led, 'ANODE', '#ef4444');
      __W('GND', led, 'CATHODE', '#171717');
      renderComponents();
      renderWires();
    }
};

EXAMPLES.water_level = {
  code: `// Example 56: Water level alarm
// The HC-SR04 looks down at the water. A smaller distance means the tank is fuller.
// Red = low, yellow = medium, green = full. Each LED has a 220 ohm resistor.
// The buzzer alarms when the tank is low, and chirps when it is overflowing.
int trigPin = 9;
int echoPin = 8;
int redPin = 13;
int yellowPin = 12;
int greenPin = 11;
int buzPin = 6;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(redPin, OUTPUT);
  pinMode(yellowPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(buzPin, OUTPUT);
  Serial.println("Water level ready. Move the distance slider.");
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;

  digitalWrite(redPin, LOW);
  digitalWrite(yellowPin, LOW);
  digitalWrite(greenPin, LOW);

  if (cm < 10) {
    digitalWrite(greenPin, HIGH);
    Serial.print("FULL ");
    Serial.print(cm);
    Serial.println(" cm");
    tone(buzPin, 1800, 70);
    delay(420);
  } else if (cm < 25) {
    digitalWrite(yellowPin, HIGH);
    noTone(buzPin);
    Serial.print("MEDIUM ");
    Serial.print(cm);
    Serial.println(" cm");
    delay(200);
  } else {
    digitalWrite(redPin, HIGH);
    Serial.print("LOW ");
    Serial.print(cm);
    Serial.println(" cm");
    tone(buzPin, 880, 160);
    delay(200);
  }
}`,
  setup() {
    clearWorkspace();
    const us = addComponent('ultrasonic', 300, 16);
    const sensor = components.find(c => c.id === us);
    if (sensor) sensor.state.distance = 40;
    const resR = addComponent('res', 460, 20);
    const red = addComponent('led_r', 560, 12);
    const resY = addComponent('res', 460, 110);
    const yellow = addComponent('led_y', 560, 102);
    const resG = addComponent('res', 460, 200);
    const green = addComponent('led_g', 560, 192);
    const buz = addComponent('buz', 680, 80);
    __W('5V', us, 'VCC');
    __W('GND', us, 'GND', '#171717');
    __W(9, us, 'TRIG', '#f59e0b');
    __W(8, us, 'ECHO', '#2563eb');
    __W(13, resR, 'A', '#dc2626');
    __WC(resR, 'B', red, 'ANODE', '#f97316');
    __W('GND', red, 'CATHODE', '#171717');
    __W(12, resY, 'A', '#eab308');
    __WC(resY, 'B', yellow, 'ANODE', '#f59e0b');
    __W('GND', yellow, 'CATHODE', '#171717');
    __W(11, resG, 'A', '#16a34a');
    __WC(resG, 'B', green, 'ANODE', '#22c55e');
    __W('GND', green, 'CATHODE', '#171717');
    __W(6, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.plant_water = {
  code: `// Example 57: Soil moisture watering
// The soil probe is on A0. A low reading is dry. At 400 or above the soil is wet enough.
// Pin 7 drives a relay, and the relay switches the water pump.
int soilPin = A0;
int relayPin = 7;

void setup() {
  Serial.begin(9600);
  pinMode(relayPin, OUTPUT);
  Serial.println("Plant watering ready. Lower the moisture slider to start the pump.");
}

void loop() {
  int moisture = analogRead(soilPin);
  if (moisture < 400) {
    digitalWrite(relayPin, HIGH);
    Serial.print("DRY ");
    Serial.print(moisture);
    Serial.println("  pump ON");
  } else {
    digitalWrite(relayPin, LOW);
    Serial.print("WET ");
    Serial.print(moisture);
    Serial.println("  pump OFF");
  }
  delay(300);
}`,
  setup() {
    clearWorkspace();
    const soil = addComponent('soil', 360, 40);
    const probe = components.find(c => c.id === soil);
    if (probe) probe.state.value = 180;
    const relay = addComponent('relay', 560, 30);
    __W('5V', soil, 'VCC');
    __W('A0', soil, 'OUT', '#f59e0b');
    __W('GND', soil, 'GND', '#171717');
    __W(7, relay, 'IN', '#f59e0b');
    __W('5V', relay, 'VCC');
    __W('GND', relay, 'GND', '#171717');
    __loadOnRelay('pump');
    renderComponents();
    renderWires();
  }
};
