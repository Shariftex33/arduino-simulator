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

