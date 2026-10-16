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

