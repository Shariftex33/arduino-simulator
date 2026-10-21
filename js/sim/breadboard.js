/* Loaded in order by js/sim/boot.js. Do not load this file on its own. */
/* ===== breadboard: rails + 5-hole rows, parts snap in, wires land on holes ===== */
const BB = { cols: 24, pitch: 14, hole: 5 };
const BB_FULL = { cols: 63, split: 31 };
let bbFullOn = false;
let bbFullPos = { x: 12, y: 680 };

function bbMetrics(full) {
  const p = BB.pitch;
  const cols = full ? BB_FULL.cols : BB.cols;
  const lab = 16;
  const right = full ? 18 : 0;
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
  y += 5 * p + (full ? 4 : 6);
  const botNumY = full ? y : 0;
  if (full) y += 14;
  rails['b+'] = y; y += p;
  rails['b-'] = y; y += p;
  y += 8;
  return { lab, right, rails, rows, numY, botNumY, cols, width: lab + cols * p + right + 8, height: y, full };
}

function parseHole(id) {
  const s = String(id);
  const full = s.charAt(0) === 'F';
  const body = full ? s.slice(1) : s;
  const rail = body.match(/^(t\+|t-|b\+|b-)(\d+)$/);
  if (rail) return { full, rail: rail[1], col: +rail[2], row: null };
  const cell = body.match(/^(\d+)([a-j])$/);
  if (cell) return { full, rail: null, col: +cell[1], row: cell[2] };
  return null;
}

function holeNet(id) {
  const p = parseHole(id);
  const cols = p && p.full ? BB_FULL.cols : BB.cols;
  if (!p || p.col < 1 || p.col > cols) return null;
  const tag = p.full ? 'F' : '';
  if (p.rail) {
    const side = p.full ? (p.col > BB_FULL.split ? 'R' : 'L') : '';
    if (p.rail === 't+') return tag + 'tp' + side;
    if (p.rail === 't-') return tag + 'tn' + side;
    if (p.rail === 'b+') return tag + 'bp' + side;
    if (p.rail === 'b-') return tag + 'bn' + side;
  }
  if (p.row && 'abcde'.includes(p.row)) return tag + 't' + p.col;
  if (p.row && 'fghij'.includes(p.row)) return tag + 'b' + p.col;
  return null;
}

function holeCenter(id) {
  const p = parseHole(id);
  if (!p) return { x: 0, y: 0 };
  const m = bbMetrics(p.full);
  const pos = p.full ? bbFullPos : bbPos;
  const top = p.rail ? m.rails[p.rail] : m.rows[p.row];
  return {
    x: pos.x + m.lab + (p.col - 1) * BB.pitch + BB.pitch / 2,
    y: pos.y + top + BB.pitch / 2
  };
}

function bbSeat() {
  if (bbFullOn) return { cols: BB_FULL.cols, pre: 'F' };
  if (bbOn) return { cols: BB.cols, pre: '' };
  return null;
}

function breadboardState() {
  if (!bbOn && !bbFullOn) return null;
  const state = { x: bbPos.x, y: bbPos.y, on: !!bbOn };
  if (bbFullOn) state.full = { x: bbFullPos.x, y: bbFullPos.y, on: true };
  return state;
}

function applyBreadboardState(data) {
  if (data && data.on && typeof data.x === 'number') {
    bbOn = true;
    bbPos = { x: data.x, y: data.y };
  } else bbOn = false;
  if (data && data.full && data.full.on && typeof data.full.x === 'number') {
    bbFullOn = true;
    bbFullPos = { x: data.full.x, y: data.full.y };
  } else bbFullOn = false;
}

function applyBbPos() {
  const mini = $('breadboard');
  if (mini) {
    mini.classList.toggle('off', !bbOn);
    mini.style.left = bbPos.x + 'px';
    mini.style.top = bbPos.y + 'px';
  }
  const full = $('breadboard-full');
  if (full) {
    full.classList.toggle('off', !bbFullOn);
    full.style.left = bbFullPos.x + 'px';
    full.style.top = bbFullPos.y + 'px';
  }
}
function clearBoardLinks(full) {
  components.forEach(c => {
    if (!c.seat) return;
    const here = Object.values(c.seat).some(id => (String(id).charAt(0) === 'F') === full);
    if (here) c.seat = null;
  });
  wires = wires.filter(w => ![w.from, w.to].some(ref =>
    ref.type === 'bb' && (String(ref.pinId).charAt(0) === 'F') === full));
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
  clearBoardLinks(false);
  applyBbPos();
  renderComponents();
  renderWires();
  histRemember();
}
function addFullBreadboard() {
  if (bbFullOn) return;
  bbFullOn = true;
  bbFullPos = { x: arduinoPos.x, y: bbOn ? bbPos.y + 280 : arduinoPos.y + 380 };
  applyBbPos();
  histRemember();
}
function removeFullBreadboard() {
  if (!bbFullOn) return;
  bbFullOn = false;
  clearBoardLinks(true);
  applyBbPos();
  renderComponents();
  renderWires();
  histRemember();
}

function railLines(m, rail, color) {
  const top = m.rails[rail] + BB.pitch / 2 - 1;
  if (!m.full) {
    return `<i class="bb-line" style="left:${m.lab}px;top:${top}px;width:${m.cols * BB.pitch}px;background:${color}"></i>`;
  }
  const gap = 10;
  const leftW = BB_FULL.split * BB.pitch - gap / 2;
  const rightX = m.lab + BB_FULL.split * BB.pitch + gap / 2;
  const rightW = (m.cols - BB_FULL.split) * BB.pitch - gap / 2;
  return `<i class="bb-line" style="left:${m.lab}px;top:${top}px;width:${leftW}px;background:${color}"></i>`
    + `<i class="bb-line" style="left:${rightX}px;top:${top}px;width:${rightW}px;background:${color}"></i>`;
}

function renderBoardEl(el, full) {
  if (!el) return;
  const m = bbMetrics(full);
  const p = BB.pitch;
  const h = BB.hole;
  const ox = (p - h) / 2;
  const pre = full ? 'F' : '';
  el.style.width = m.width + 'px';
  el.style.height = m.height + 'px';
  const holes = [];
  const labs = [];
  for (let col = 1; col <= m.cols; col++) {
    const x = m.lab + (col - 1) * p;
    const numbered = !full || col === 1 || col % 5 === 0;
    if (numbered) {
      const left = full ? x + p / 2 - 9 : x;
      labs.push(`<span class="bb-lab bb-num" style="left:${left}px;top:${m.numY}px">${col}</span>`);
      if (full) labs.push(`<span class="bb-lab bb-num" style="left:${left}px;top:${m.botNumY}px">${col}</span>`);
    }
    for (const rail of ['t+', 't-', 'b+', 'b-']) {
      const id = pre + rail + col;
      const mark = rail.endsWith('+') ? '+' : '−';
      holes.push(`<i class="bb-hole" data-hole="${id}" title="${mark} ${col}" style="left:${x + ox}px;top:${m.rails[rail] + ox}px"></i>`);
    }
    for (const row of 'abcdefghij') {
      const id = pre + col + row;
      holes.push(`<i class="bb-hole" data-hole="${id}" title="${col}${row}" style="left:${x + ox}px;top:${m.rows[row] + ox}px"></i>`);
    }
  }
  for (const row of 'abcdefghij') {
    labs.push(`<span class="bb-lab" style="left:1px;top:${m.rows[row]}px">${row}</span>`);
    if (full) labs.push(`<span class="bb-lab" style="left:${m.width - 15}px;top:${m.rows[row]}px">${row}</span>`);
  }
  [['t+', 'plus', '+'], ['t-', 'minus', '−'], ['b+', 'plus', '+'], ['b-', 'minus', '−']].forEach(([rail, cls, ch]) => {
    labs.push(`<span class="bb-lab bb-pow ${cls}" style="left:1px;top:${m.rails[rail]}px">${ch}</span>`);
    if (full) labs.push(`<span class="bb-lab bb-pow ${cls}" style="left:${m.width - 14}px;top:${m.rails[rail]}px">${ch}</span>`);
  });
  const trenchTop = m.rows.e + p;
  const silk = full ? '' : `<span class="bb-silk" style="top:${trenchTop}px;line-height:${m.rows.f - trenchTop}px">BREADBOARD</span>`;
  const closer = full ? 'removeFullBreadboard()' : 'removeBreadboard()';
  el.innerHTML = `
    <i class="bb-trench" style="left:${m.lab}px;top:${trenchTop}px;width:${m.cols * p}px;height:${m.rows.f - trenchTop}px"></i>
    ${silk}
    ${railLines(m, 't+', '#dc2626')}${railLines(m, 't-', '#2563eb')}${railLines(m, 'b+', '#dc2626')}${railLines(m, 'b-', '#2563eb')}
    <button type="button" class="bb-close" onclick="${closer}" title="Remove">✕</button>
    ${labs.join('')}${holes.join('')}`;
}

function renderBreadboard() {
  renderBoardEl($('breadboard'), false);
  renderBoardEl($('breadboard-full'), true);
  applyBbPos();
}

function nearestGridHole(x, y, maxDist) {
  let best = null;
  let bd = maxDist;
  [[false, bbOn, bbPos], [true, bbFullOn, bbFullPos]].forEach(([full, on, pos]) => {
    if (!on) return;
    const m = bbMetrics(full);
    for (let col = 1; col <= m.cols; col++) {
      for (const row of 'abcdefghij') {
        const cx = pos.x + m.lab + (col - 1) * BB.pitch + BB.pitch / 2;
        const cy = pos.y + m.rows[row] + BB.pitch / 2;
        const d = Math.hypot(x - cx, y - cy);
        if (d < bd) { bd = d; best = { col, row, full }; }
      }
    }
  });
  return best;
}

function markOccupiedHoles() {
  const taken = new Set();
  components.forEach(c => {
    if (!c.seat) return;
    Object.values(c.seat).forEach(id => taken.add(String(id)));
  });
  document.querySelectorAll('.breadboard .bb-hole').forEach(el => {
    el.classList.toggle('occupied', taken.has(el.dataset.hole));
  });
}

const LEAD_ART = {
  led_r: { w: 68, h: 92, pins: { ANODE: [0.309, 1], CATHODE: [0.662, 1] } },
  led_y: { w: 68, h: 92, pins: { ANODE: [0.309, 1], CATHODE: [0.662, 1] } },
  led_g: { w: 68, h: 92, pins: { ANODE: [0.309, 1], CATHODE: [0.662, 1] } },
  led_b: { w: 68, h: 92, pins: { ANODE: [0.309, 1], CATHODE: [0.662, 1] } },
  res: { w: 120, h: 36, pins: { A: [0.108, 0.5], B: [0.892, 0.5] } },
  bat: { w: 140, h: 44, pins: { NEG: [0.079, 0.5], POS: [0.921, 0.5] } }
};
const MOD_ART = {
  pot: [40, 40], ldr: [36, 28], soil: [36, 46], dht: [32, 42], pir: [56, 40],
  ultrasonic: [124, 40], servo: [168, 96], relay: [90, 48], seg7: [56, 48],
  lcd: [168, 64], oled: [150, 72], buz: [40, 32], lamp: [32, 42],
  fan: [44, 44], pump: [48, 48], switch: [56, 24], rgb: [36, 46]
};

function fitLeadArt(pts, model) {
  const used = pts.filter(p => model.pins[p.pin]);
  if (used.length < 2) return null;
  let a = used[0], b = used[1], best = -1;
  for (let i = 0; i < used.length; i++) {
    for (let j = i + 1; j < used.length; j++) {
      const pa = model.pins[used[i].pin], pb = model.pins[used[j].pin];
      const score = Math.abs(pb[0] - pa[0]) + Math.abs(pb[1] - pa[1]);
      if (score > best) { best = score; a = used[i]; b = used[j]; }
    }
  }
  const ax = model.pins[a.pin], bx = model.pins[b.pin];
  const adx = bx[0] - ax[0], ady = bx[1] - ax[1];
  let w, h;
  if (Math.abs(adx) >= Math.abs(ady)) {
    w = Math.abs((b.x - a.x) / adx);
    h = w * model.h / model.w;
  } else {
    h = Math.abs((b.y - a.y) / ady);
    w = h * model.w / model.h;
  }
  if (!isFinite(w) || w < 8 || !isFinite(h) || h < 8) return null;
  return { x: a.x - ax[0] * w, y: a.y - ax[1] * h, w, h };
}

function fitModuleArt(type, pts) {
  const size = MOD_ART[type] || [Math.max(pts.length * 12, 32), 36];
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const top = Math.min(...ys);
  const gap = 8;
  return { x: cx - size[0] / 2, y: top - gap - size[1], w: size[0], h: size[1] };
}

function seatedLayout(c) {
  const spec = COMP_SPECS[c.type];
  if (!c.seat || !spec) return null;
  const pts = [];
  for (const pin of spec.pins) {
    const id = c.seat[pin];
    if (!id) continue;
    const parsed = parseHole(id);
    if (!parsed || parsed.rail) return null;
    pts.push({ pin, ...holeCenter(id) });
  }
  if (!pts.length) return null;
  const dot = BB.hole / 2;
  let art = null;
  let kind = 'mod';
  if (c.type === 'btn') kind = 'btn';
  else if (LEAD_ART[c.type]) {
    art = fitLeadArt(pts, LEAD_ART[c.type]);
    kind = art ? 'leads' : 'mod';
  }
  if (!art && kind === 'mod') art = fitModuleArt(c.type, pts);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (x, y) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  };
  pts.forEach(p => { grow(p.x - dot, p.y - dot); grow(p.x + dot, p.y + dot); });
  if (art) { grow(art.x, art.y); grow(art.x + art.w, art.y + art.h); }
  const pins = {};
  pts.forEach(p => { pins[p.pin] = { left: p.x - minX - dot, top: p.y - minY - dot }; });
  return {
    x: minX,
    y: minY,
    w: Math.max(maxX - minX, BB.hole),
    h: Math.max(maxY - minY, BB.hole),
    pins,
    kind,
    art: art ? { x: art.x - minX, y: art.y - minY, w: art.w, h: art.h } : null
  };
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
  if (!bbOn && !bbFullOn) return false;
  const el = $('comp-' + c.id);
  const pinEl = el && el.querySelector('.term-pin');
  if (!pinEl) return false;
  const r = pinEl.getBoundingClientRect();
  const pt = stagePoint(r.left + r.width / 2, r.top + r.height / 2);
  const hit = nearestGridHole(pt.x, pt.y, 22);
  if (!hit) return false;
  const pins = COMP_SPECS[c.type].pins;
  const cols = hit.full ? BB_FULL.cols : BB.cols;
  const pre = hit.full ? 'F' : '';
  if (c.type === 'btn') {
    const col = Math.max(1, Math.min(hit.col, cols - 1));
    const holes = [pre + col + 'e', pre + (col + 1) + 'e', pre + col + 'f', pre + (col + 1) + 'f'];
    if (holes.some(h => holeTaken(h, c.id))) return false;
    c.seat = { PIN1: holes[0], PIN2: holes[1], PIN3: holes[2], PIN4: holes[3] };
    return true;
  }
  const strides = (c.type === 'res' || c.type === 'bat') ? [4, 1] : [1];
  for (const stride of strides) {
    const span = (pins.length - 1) * stride;
    for (let start = hit.col; start + span <= cols; start++) {
      const holes = pins.map((_, i) => pre + (start + i * stride) + hit.row);
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
  const el = e.currentTarget;
  const full = el.id === 'breadboard-full';
  const pt = e.touches ? e.touches[0] : e;
  const rect = el.getBoundingClientRect();
  bbDrag = {
    el,
    pos: full ? bbFullPos : bbPos,
    dx: (pt.clientX - rect.left) / view.z,
    dy: (pt.clientY - rect.top) / view.z
  };
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
  bbDrag.pos.x = Math.max(-2500, Math.min(6500, p.x - bbDrag.dx));
  bbDrag.pos.y = Math.max(-2500, Math.min(6500, p.y - bbDrag.dy));
  applyBbPos();
  applySeatedPositions();
  renderWires();
}
function endBbDrag() {
  const el = bbDrag && bbDrag.el;
  bbDrag = null;
  if (el) el.classList.remove('dragging');
  document.removeEventListener('mousemove', moveBbDrag);
  document.removeEventListener('mouseup', endBbDrag);
  document.removeEventListener('touchmove', moveBbDrag);
  document.removeEventListener('touchend', endBbDrag);
  histRemember();
}
renderBreadboard();
['breadboard', 'breadboard-full'].forEach(id => {
  const el = $(id);
  if (!el) return;
  el.addEventListener('mousedown', startBbDrag);
  el.addEventListener('touchstart', startBbDrag, { passive: true });
});

