import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function browserPath() {
  const list = [
    process.env.LAB_BROWSER,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);
  return list.find(function (file) { return existsSync(file); }) || '';
}

function freePort() {
  return new Promise(function (resolve, reject) {
    const socket = createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', function () {
      const port = socket.address().port;
      socket.close(function () { resolve(port); });
    });
  });
}

function stop(pid) {
  if (!pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  else {
    try { process.kill(pid); } catch (e) {}
  }
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function waitFor(label, fn, attempts) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await sleep(200);
  }
  throw new Error(label + (last ? ': ' + last.message : ''));
}

test('opening a project loads its sketch, parts, and run', { timeout: 45000 }, async function () {
  const browser = browserPath();
  assert.ok(browser, 'Edge or Chrome is required to open a project');
  const port = await freePort();
  const dataDir = mkdtempSync(path.join(tmpdir(), 'lab-sim-'));
  const profile = mkdtempSync(path.join(tmpdir(), 'lab-browser-'));
  const lab = spawn(process.execPath, ['src/index.js'], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  lab.stdout.on('data', function (chunk) { log += chunk; });
  lab.stderr.on('data', function (chunk) { log += chunk; });
  const browserProc = spawn(browser, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1400,900',
    '--remote-debugging-port=0',
    '--remote-allow-origins=*',
    '--user-data-dir=' + profile,
    'http://127.0.0.1:' + port + '/projects/index.html'
  ], { stdio: 'ignore' });

  try {
    await waitFor('lab server did not start\n' + log, async function () {
      const response = await fetch('http://127.0.0.1:' + port + '/api/health');
      return response.ok;
    }, 40);

    const debugPort = await waitFor('browser debug port', async function () {
      const text = readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8');
      return Number(text.split('\n')[0]) || 0;
    }, 40);

    const page = await waitFor('browser page', async function () {
      const list = await fetch('http://127.0.0.1:' + debugPort + '/json/list').then(function (response) { return response.json(); });
      return list.find(function (item) { return item.type === 'page' && item.webSocketDebuggerUrl; });
    }, 40);

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let nextId = 0;
    const pending = new Map();
    ws.addEventListener('message', function (event) {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    });
    function send(method, params) {
      const id = ++nextId;
      return new Promise(function (resolve) {
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }
    await new Promise(function (resolve) { ws.addEventListener('open', resolve); });
    await send('Runtime.enable');
    await send('Page.enable');

    const href = await waitFor('project link', async function () {
      const result = await send('Runtime.evaluate', {
        expression: `(document.querySelector('#project-catalog a') || {}).getAttribute && document.querySelector('#project-catalog a').getAttribute('href')`,
        returnByValue: true
      });
      return result.result && result.result.result && result.result.result.value;
    }, 30);
    assert.match(href, /arduino_simulator_v7\.html\?/);
    assert.match(href, /example=/);
    const projectUrl = new URL(href, 'http://127.0.0.1:' + port + '/projects/index.html');
    const example = projectUrl.searchParams.get('example');
    await send('Page.navigate', { url: projectUrl.href });

    const opened = await waitFor('project sketch', async function () {
      const result = await send('Runtime.evaluate', {
        expression: `(() => {
          const code = (document.getElementById('code-input') || {}).value || '';
          const script = document.querySelector('script[src*="simulator.js"]');
          return {
            example: (document.getElementById('example-select') || {}).value || '',
            code,
            comps: document.querySelectorAll('.comp-box').length,
            wires: (document.getElementById('sb-wires') || {}).textContent || '',
            linked: !!(script && script.src.indexOf('simulator.js') !== -1)
          };
        })()`,
        returnByValue: true
      });
      const value = result.result && result.result.result && result.result.result.value;
      if (!value || !value.code.trim()) return null;
      return value;
    }, 40);

    assert.equal(opened.linked, true);
    assert.equal(opened.example, example);
    assert.match(opened.code, /void setup\s*\(/);
    assert.match(opened.code, /void loop\s*\(/);
    assert.ok(opened.comps >= 1, 'project opened with no parts');
    assert.doesNotMatch(opened.wires, /Wires:\s*0/);

    const running = await waitFor('sketch did not start', async function () {
      const result = await send('Runtime.evaluate', {
        expression: `({
          word: (document.querySelector('.run-word') || {}).textContent || '',
          serial: (document.getElementById('serial-out') || {}).innerText || ''
        })`,
        returnByValue: true
      });
      const value = result.result && result.result.result && result.result.result.value;
      if (!value) return null;
      if (value.word === 'Run') {
        await send('Runtime.evaluate', { expression: `toggleExecution()`, returnByValue: true });
        return null;
      }
      if (value.word !== 'Stop' || !/Sketch started/.test(value.serial)) return null;
      return value;
    }, 25);
    assert.match(running.serial, /Sketch started/);
    assert.doesNotMatch(running.serial, /Code error/);
    ws.close();
  } finally {
    stop(browserProc.pid);
    stop(lab.pid);
  }
});
