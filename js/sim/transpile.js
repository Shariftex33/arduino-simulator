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
  sketchSnapshot = rawCode;
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
  if (typeof paintRunButtons === 'function') paintRunButtons(false);
}

function toggleExecution() {
  if (isRunning && typeof codeDirty === 'function' && codeDirty()) { restartRun(); return; }
  if (isRunning) {
    stopExecution();
  } else {
    startExecution();
    if (typeof paintRunButtons === 'function') paintRunButtons(true);
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

