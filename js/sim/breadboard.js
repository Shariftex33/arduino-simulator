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

