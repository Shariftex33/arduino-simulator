(function () {
  const TOKEN = 'edu-token';
  const OUTBOX = 'edu-platform-outbox';
  const LEARN = 'edu-platform-learn';
  const META = 'edu-platform-learn-meta';
  const PROFILE = 'edu-platform-student';
  const PROGRESS = 'edu-platform-progress';
  let profile = null;
  let hydratePromise = null;

  function token() {
    return localStorage.getItem(TOKEN) || '';
  }

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch (e) { return {}; }
  }

  function readOutbox() {
    const data = readJson(OUTBOX);
    return Array.isArray(data) ? data : [];
  }

  function writeOutbox(items) {
    localStorage.setItem(OUTBOX, JSON.stringify(items));
  }

  async function request(path, options) {
    const headers = { 'Content-Type': 'application/json' };
    if (token()) headers.Authorization = 'Bearer ' + token();
    const res = await fetch(path, {
      method: (options && options.method) || 'GET',
      headers: headers,
      body: options && options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json().catch(function () { return {}; });
    if (res.status === 401 && headers.Authorization && path.indexOf('/api/auth/login') === -1) {
      localStorage.removeItem(TOKEN);
    }
    if (!res.ok) {
      const error = new Error(data.error || 'Request failed');
      error.status = res.status;
      throw error;
    }
    return data;
  }

  function applyState(state) {
    if (!state || !state.user) return;
    profile = state.user;
    const learn = readJson(LEARN);
    learn.xp = state.xp || 0;
    learn.solved = state.solved || [];
    learn.days = state.days || [];
    localStorage.setItem(LEARN, JSON.stringify(learn));
    localStorage.setItem(PROFILE, state.user.name || '');
    const meta = readJson(META);
    meta.xp = state.xp || 0;
    meta.streak = state.streak || 0;
    localStorage.setItem(META, JSON.stringify(meta));
    const progress = readJson(PROGRESS);
    (state.certificates || []).forEach(function (cert) {
      progress['learning/level/' + cert.levelId] = {
        status: 'complete',
        at: Date.parse(cert.issuedAt) || Date.now(),
        title: cert.title,
        official: Boolean(cert.official)
      };
    });
    localStorage.setItem(PROGRESS, JSON.stringify(progress));
  }

  function localSnapshot() {
    const data = readJson(LEARN);
    return {
      solved: Array.isArray(data.solved) ? data.solved : [],
      xp: data.xp || 0,
      days: Array.isArray(data.days) ? data.days : []
    };
  }

  let flushing = null;
  function flush() {
    if (!token()) return Promise.resolve(null);
    if (flushing) return flushing;
    const box = readOutbox();
    if (!box.length) return Promise.resolve(null);
    writeOutbox([]);
    const local = localSnapshot();
    flushing = request('/api/progress/sync', {
      method: 'POST',
      body: { items: box, days: local.days }
    }).then(function (state) {
      applyState(state);
      return state;
    }).catch(function () {
      writeOutbox(box.concat(readOutbox()));
      return null;
    }).finally(function () {
      flushing = null;
    });
    return flushing;
  }

  function hydrate() {
    if (!token()) return Promise.resolve(null);
    if (hydratePromise) return hydratePromise;
    hydratePromise = request('/api/progress').then(function (state) {
      const local = localSnapshot();
      const serverEmpty = !(state.solved && state.solved.length) && !(state.xp);
      const localHas = local.solved.length || local.xp;
      if (serverEmpty && localHas) {
        writeOutbox([]);
        return request('/api/progress/sync', {
          method: 'POST',
          body: { items: [], solved: local.solved, xp: local.xp, days: local.days }
        });
      }
      return flush().then(function () { return request('/api/progress'); });
    }).then(function (state) {
      applyState(state);
      return state;
    }).catch(function () {
      hydratePromise = null;
      return null;
    });
    return hydratePromise;
  }

  function award(id, xp) {
    if (!token()) return;
    const box = readOutbox();
    box.push({ id: id, xp: xp });
    writeOutbox(box);
    flush();
  }

  function setSession(tokenValue) {
    localStorage.setItem(TOKEN, tokenValue);
    hydratePromise = null;
  }

  function logout() {
    const done = token() ? request('/api/auth/logout', { method: 'POST', body: {} }).catch(function () {}) : Promise.resolve();
    return done.then(function () {
      localStorage.removeItem(TOKEN);
      profile = null;
      hydratePromise = null;
    });
  }

  window.EduSync = {
    token: token,
    profile: function () { return profile; },
    request: request,
    hydrate: hydrate,
    award: award,
    applyState: applyState,
    setSession: setSession,
    logout: logout
  };
})();
