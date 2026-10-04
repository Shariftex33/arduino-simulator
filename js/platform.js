(function () {
  const KEY = 'edu-platform-progress';
  const PROFILE = 'edu-platform-student';

  const MODULES = [
    { id: 'simulator/arduino-uno', group: 'Simulator', title: 'Arduino Uno' },
    { id: 'simulator/esp32', group: 'Simulator', title: 'ESP32' },
    { id: 'simulator/sensors', group: 'Simulator', title: 'Sensors' },
    { id: 'simulator/motors', group: 'Simulator', title: 'Motors' },
    { id: 'simulator/components', group: 'Simulator', title: 'Components' },
    { id: 'learning/lessons', group: 'Learning', title: 'Lessons' },
    { id: 'learning/quizzes', group: 'Learning', title: 'Quiz' },
    { id: 'learning/projects', group: 'Learning', title: 'Final Projects' },
    { id: 'projects/build-robot', group: 'Projects', title: 'Build Robot' },
    { id: 'projects/smart-home', group: 'Projects', title: 'Smart Home' },
    { id: 'projects/line-follower', group: 'Projects', title: 'Line Follower' },
    { id: 'projects/iot', group: 'Projects', title: 'IoT' }
  ];

  function readProgress() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function writeProgress(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function markVisit(id) {
    if (!id) return;
    const data = readProgress();
    const prev = data[id] || {};
    if (prev.status === 'complete') return;
    data[id] = { status: 'started', at: Date.now() };
    writeProgress(data);
  }

  function prefix() {
    const depth = Number(document.body.dataset.depth || 0);
    return depth > 0 ? '../'.repeat(depth) : '';
  }

  function mountNav() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const root = prefix();
    const links = [
      ['Home', root + 'index.html'],
      ['Simulator', root + 'simulator/index.html'],
      ['Learning', root + 'learning/index.html'],
      ['Projects', root + 'projects/index.html'],
      ['Leaderboard', root + 'leaderboard/index.html'],
      ['Teach', root + 'teach/index.html'],
      ['Pricing', root + 'pricing/index.html'],
      ['Account', root + 'account/index.html']
    ];
    const here = location.pathname.replace(/\\/g, '/');
    header.innerHTML =
      '<a class="brand" href="' + root + 'index.html"><img src="' + root + 'assets/svg/arduino-uno.svg?v=r3" alt=""><span>Arduino Lab</span></a>' +
      '<nav class="nav">' + links.map(function (item) {
        const path = new URL(item[1], location.href).pathname.replace(/\\/g, '/');
        const active = here === path ? ' class="active"' : '';
        return '<a' + active + ' href="' + item[1] + '">' + item[0] + '</a>';
      }).join('') + lessonReturn() + '</nav>';
  }

  function lessonReturn() {
    let back = null;
    try { back = JSON.parse(sessionStorage.getItem('edu-platform-return') || 'null'); } catch (e) {}
    if (!back || !back.href) return '';
    const lessonPath = back.href.split('#')[0].split('?')[0];
    if (location.pathname.replace(/\\/g, '/') === lessonPath) return '';
    const label = String(back.label || 'lesson').replace(/[&<>"]/g, '');
    return '<a class="back-lesson" href="' + back.href + '">Back to ' + label + '</a>';
  }

  function escapeText(value) {
    return String(value || '').replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function renderAuth(host) {
    const user = window.EduSync.profile();
    if (user) {
      host.innerHTML =
        '<h2>Signed in</h2>' +
        '<p class="lede">' + escapeText(user.name) + ' · ' + escapeText(user.email) + '</p>' +
        '<p class="lede">Role: ' + escapeText(user.role) + ' · Plan: ' + escapeText(user.plan) + '</p>' +
        '<button class="btn ghost" id="logout-btn" type="button">Log out</button>';
      document.getElementById('logout-btn').onclick = function () {
        window.EduSync.logout().then(function () { location.reload(); });
      };
      return;
    }
    host.innerHTML =
      '<h2>Sign in</h2>' +
      '<p class="lede">An account keeps XP, streaks, and certificates when you change browsers.</p>' +
      '<p class="error" id="auth-error"></p>' +
      '<form id="login-form" class="form stack-form">' +
        '<label>Email<input type="email" name="email" autocomplete="username" required></label>' +
        '<label>Password<input type="password" name="password" autocomplete="current-password" required></label>' +
        '<button class="btn" type="submit">Log in</button>' +
      '</form>' +
      '<h2>Create account</h2>' +
      '<form id="register-form" class="form stack-form">' +
        '<label>Name<input type="text" name="name" autocomplete="name" required></label>' +
        '<label>Email<input type="email" name="email" autocomplete="email" required></label>' +
        '<label>Password<input type="password" name="password" autocomplete="new-password" minlength="8" required></label>' +
        '<label>I am a<select name="role"><option value="student">Student</option><option value="teacher">Teacher</option></select></label>' +
        '<button class="btn" type="submit">Create account</button>' +
      '</form>';
    const error = document.getElementById('auth-error');
    function fail(err) { error.textContent = err.message || 'Could not reach the server'; }
    document.getElementById('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      window.EduSync.request('/api/auth/login', { method: 'POST', body: body }).then(function (data) {
        window.EduSync.setSession(data.token);
        location.reload();
      }).catch(fail);
    });
    document.getElementById('register-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      window.EduSync.request('/api/auth/register', { method: 'POST', body: body }).then(function (data) {
        window.EduSync.setSession(data.token);
        location.reload();
      }).catch(fail);
    });
  }

  function mountAccount() {
    const auth = document.getElementById('auth-panel');
    if (auth && window.EduSync) renderAuth(auth);
    const list = document.getElementById('progress-list');
    if (!list) return;
    const nameInput = document.getElementById('student-name');
    const saved = localStorage.getItem(PROFILE) || '';
    if (nameInput) nameInput.value = saved;
    const form = document.getElementById('student-form');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = nameInput.value.trim();
        localStorage.setItem(PROFILE, name);
        const user = window.EduSync && window.EduSync.profile();
        if (user && window.EduSync.token()) {
          window.EduSync.request('/api/me', { method: 'PATCH', body: { name: name } }).then(function (state) {
            window.EduSync.applyState(state);
            renderProgress();
          }).catch(function () { renderProgress(); });
          return;
        }
        renderProgress();
      });
    }
    renderProgress();
  }

  function renderProgress() {
    const list = document.getElementById('progress-list');
    const certs = document.getElementById('certificates');
    if (!list) return;
    const data = readProgress();
    const name = localStorage.getItem(PROFILE) || 'Student';
    const hello = document.getElementById('hello');
    if (hello) hello.textContent = name;
    const xpEl = document.getElementById('learn-xp');
    if (xpEl) {
      let xp = 0;
      let streak = 0;
      try { xp = JSON.parse(localStorage.getItem('edu-platform-learn') || '{}').xp || 0; } catch (e) {}
      try { streak = JSON.parse(localStorage.getItem('edu-platform-learn-meta') || '{}').streak || 0; } catch (e) {}
      xpEl.textContent = xp + ' XP · ' + streak + ' day streak. Points come from concepts, quizzes, code prediction, and simulator challenges.';
    }

    list.innerHTML = MODULES.map(function (mod) {
      const status = (data[mod.id] && data[mod.id].status) || 'not started';
      const width = status === 'complete' ? 100 : status === 'started' ? 40 : 0;
      return '<div class="progress-row"><span>' + mod.title + '</span><div class="bar"><span style="width:' + width + '%"></span></div><span class="tag">' + status + '</span></div>';
    }).join('');

    const levelNames = {
      foundations: 'Level 1 — Arduino Foundations',
      programming: 'Level 2 — Arduino Programming',
      electronics: 'Level 3 — Electronics & Inputs',
      outputs: 'Level 4 — Outputs & Automation',
      robotics: 'Level 5 — Robotics & IoT'
    };
    const levelRows = Object.keys(levelNames).map(function (id) {
      const saved = data['learning/level/' + id];
      const status = (saved && saved.status) || 'not started';
      const width = status === 'complete' ? 100 : status === 'started' ? 40 : 0;
      return '<div class="progress-row"><span>' + levelNames[id] + '</span><div class="bar"><span style="width:' + width + '%"></span></div><span class="tag">' + status + '</span></div>';
    }).join('');
    list.innerHTML += levelRows;

    if (!certs) return;
    const done = MODULES.filter(function (mod) { return data[mod.id] && data[mod.id].status === 'complete'; });
    const levelDone = Object.keys(levelNames).filter(function (id) {
      return data['learning/level/' + id] && data['learning/level/' + id].status === 'complete';
    }).map(function (id) {
      const saved = data['learning/level/' + id] || {};
      return { title: levelNames[id], official: saved.official };
    });
    const issued = done.concat(levelDone);
    if (!issued.length) {
      certs.innerHTML = '<div class="cert"><strong>No certificate yet</strong>Finish a level or a module and it will appear here for ' + escapeText(name) + '.</div>';
      return;
    }
    certs.innerHTML = issued.map(function (mod) {
      const official = mod.official ? ' · official' : '';
      return '<div class="cert"><strong>' + mod.title + official + '</strong>Issued to ' + escapeText(name) + '</div>';
    }).join('');
  }

  function renderLabHome() {
    const box = document.getElementById('lab-home');
    if (!box) return;
    let meta = {};
    try { meta = JSON.parse(localStorage.getItem('edu-platform-learn-meta') || '{}'); } catch (e) {}
    const total = meta.total || 0;
    const done = meta.done || 0;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const bar = document.getElementById('lab-bar');
    const pctEl = document.getElementById('lab-pct');
    const levelEl = document.getElementById('lab-level');
    const xpEl = document.getElementById('lab-xp');
    const streakEl = document.getElementById('lab-streak');
    const cont = document.getElementById('continue-learning');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (levelEl) levelEl.textContent = meta.levelName || 'Level 1 · Arduino Foundations';
    if (xpEl) xpEl.textContent = (meta.xp || 0).toLocaleString() + ' XP';
    const streak = meta.streak || 0;
    if (streakEl) streakEl.textContent = streak + ' day streak';
    if (cont && meta.continueHref) cont.setAttribute('href', meta.continueHref);
    const codeLink = document.getElementById('code-challenge');
    const circuitLink = document.getElementById('circuit-challenge');
    if (codeLink && meta.predictHref) codeLink.setAttribute('href', meta.predictHref);
    if (circuitLink && meta.simHref) circuitLink.setAttribute('href', meta.simHref);
  }

  mountNav();
  function startPlatform() {
    markVisit(document.body.dataset.module || '');
    mountAccount();
    renderLabHome();
  }
  if (window.EduSync) window.EduSync.hydrate().then(startPlatform, startPlatform);
  else startPlatform();
})();
