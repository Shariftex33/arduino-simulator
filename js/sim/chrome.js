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

