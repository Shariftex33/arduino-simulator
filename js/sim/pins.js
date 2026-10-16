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

