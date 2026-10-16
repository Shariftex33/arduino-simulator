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
  const narrow = !!(ws && ws.clientWidth < 900);
  const insetX = narrow ? 4 : 0;
  const insetY = narrow ? 58 : 0;
  const fitX = ws && needX > 0 ? (ws.clientWidth - insetX - 12) / needX : 1;
  const fitY = ws && needY > 0 ? (ws.clientHeight - insetY - (narrow ? 48 : 8)) / needY : 1;
  view.x = insetX;
  view.y = insetY;
  view.z = Math.max(narrow ? 0.18 : 0.45, Math.min(1, fitX, fitY));
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

