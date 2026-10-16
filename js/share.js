(function () {
  const KEY = 'edu-showcase-draft';
  const PUBLISHED = 'edu-showcase-published';
  const depth = Number(document.body.dataset.depth || 1);
  const asset = '../'.repeat(depth) + 'assets/svg/';

  const CATALOG = {
    components: [
      { name: 'Arduino Uno', svg: 'arduino-uno.svg' },
      { name: 'ESP32 DevKit', svg: 'esp32-devkit.svg' },
      { name: '1 relay module 5 Vdc 10A (assembled)', svg: 'relay.svg' },
      { name: 'Buzzer', svg: 'buzzer.svg' },
      { name: 'Red LED', svg: 'led-red.svg' },
      { name: 'Green LED', svg: 'led-green.svg' },
      { name: 'Yellow LED', svg: 'led-yellow.svg' },
      { name: 'Blue LED', svg: 'led-blue.svg' },
      { name: 'Resistor 220Ω', svg: 'resistor.svg' },
      { name: 'Breadboard', svg: 'breadboard-row.svg' },
      { name: 'Push button', svg: 'button.svg' },
      { name: 'Potentiometer', svg: 'pot.svg' },
      { name: 'Slide switch', svg: 'switch.svg' },
      { name: 'HC-SR04 ultrasonic', svg: 'hcsr04.svg' },
      { name: 'PIR motion sensor', svg: 'pir.svg' },
      { name: 'LDR', svg: 'ldr.svg' },
      { name: 'DHT11', svg: 'dht11.svg' },
      { name: 'Soil moisture sensor', svg: 'soil.svg' },
      { name: 'Servo SG90', svg: 'servo.svg' },
      { name: 'DC fan', svg: 'fan.svg' },
      { name: 'Water pump', svg: 'pump.svg' },
      { name: '7-segment display', svg: 'seg7.svg' },
      { name: 'LCD 16×2', svg: 'lcd.svg' },
      { name: 'OLED 0.96"', svg: 'oled.svg' },
      { name: 'Lamp', svg: 'bulb.svg' },
      { name: 'Jumper wires', svg: 'jumper-wires.svg' },
      { name: 'Battery', svg: 'battery.svg' }
    ],
    tools: [
      { name: 'Soldering iron' },
      { name: 'Multimeter' },
      { name: 'Wire stripper' },
      { name: 'Side cutters' },
      { name: 'Helping hands' },
      { name: 'Hot glue gun' },
      { name: 'Screwdriver set' },
      { name: '3D printer' },
      { name: 'Laser cutter' }
    ],
    software: [
      { name: 'Arduino IDE', svg: 'arduino-ide.svg' },
      { name: 'Arduino Lab simulator', svg: 'sketch-card.svg' },
      { name: 'Arduino Cloud' },
      { name: 'PlatformIO' },
      { name: 'VS Code' },
      { name: 'Fritzing' },
      { name: 'Tinkercad' },
      { name: 'GitHub' }
    ]
  };

  const CHECKS = [
    { id: 'intro', label: 'Intro', target: 'title' },
    { id: 'team', label: 'The team', target: 'sec-team' },
    { id: 'components', label: 'Devices & Components', target: 'sec-components' },
    { id: 'tools', label: 'Hardware & Tools', target: 'sec-tools' },
    { id: 'software', label: 'Software & Tools', target: 'sec-software' },
    { id: 'description', label: 'Project description', target: 'sec-description' },
    { id: 'code', label: 'Code', target: 'sec-code' },
    { id: 'apps', label: 'Arduino App Lab', target: 'sec-apps' },
    { id: 'files', label: 'Downloadable files', target: 'sec-files' },
    { id: 'docs', label: 'Documentation', target: 'sec-docs' }
  ];

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function makerName() {
    try {
      const user = window.EduSync && window.EduSync.profile && window.EduSync.profile();
      if (user && user.name) return user.name;
    } catch (e) {}
    return localStorage.getItem('edu-platform-student') || '';
  }

  function blank() {
    return {
      title: '',
      pitch: '',
      cover: '',
      notAuthor: false,
      members: [{ id: uid(), name: makerName(), avatar: '' }],
      attribution: '',
      contributors: [],
      components: [],
      tools: [],
      software: [],
      description: '',
      code: [],
      apps: [],
      files: [],
      docs: []
    };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!saved || typeof saved !== 'object') return blank();
      const base = blank();
      Object.keys(base).forEach(function (key) {
        if (saved[key] !== undefined) base[key] = saved[key];
      });
      if (!Array.isArray(base.members) || !base.members.length) base.members = blank().members;
      ['contributors', 'components', 'tools', 'software', 'code', 'apps', 'files', 'docs'].forEach(function (key) {
        if (!Array.isArray(base[key])) base[key] = [];
      });
      return base;
    } catch (e) {
      return blank();
    }
  }

  const state = load();

  function $(id) { return document.getElementById(id); }

  function escapeText(value) {
    return String(value || '').replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function isUrl(value) {
    return /^https?:\/\/\S+$/i.test(String(value || '').trim());
  }

  function linkOrText(value) {
    const text = String(value || '').trim();
    if (isUrl(text)) {
      const safe = escapeText(text);
      return '<a href="' + safe + '" target="_blank" rel="noopener">' + safe + '</a>';
    }
    return '<p class="preview-pre">' + escapeText(text) + '</p>';
  }

  function thumb(item) {
    if (item.svg) return '<img src="' + asset + encodeURI(item.svg) + '" alt="">';
    const letter = escapeText((item.name || '?').trim().charAt(0).toUpperCase() || '?');
    return letter;
  }

  function safeDataUrl(url) {
    if (typeof url !== 'string' || url.length > 1800000) return '';
    return /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(url) ? url : '';
  }

  function avatar(person) {
    const src = safeDataUrl(person.avatar);
    if (src) return '<img src="' + src + '" alt="">';
    return escapeText((person.name || '?').trim().charAt(0).toUpperCase() || '?');
  }

  function readPeople() {
    document.querySelectorAll('.person-name').forEach(function (input) {
      const list = state[input.dataset.list];
      const person = list && list.find(function (item) { return item.id === input.dataset.id; });
      if (person) person.name = input.value;
    });
  }

  function readFields() {
    state.title = $('title').value;
    state.pitch = $('pitch').value;
    state.notAuthor = $('not-author').checked;
    state.attribution = $('attribution').value;
    state.description = $('description').value;
    readPeople();
  }

  function renderPeople(listId, listName) {
    readPeople();
    const host = $(listId);
    host.innerHTML = state[listName].map(function (person) {
      return '<div class="person-row">' +
        '<button class="avatar" type="button" data-avatar="' + person.id + '" data-list="' + listName + '" aria-label="Add a photo">' + avatar(person) + '</button>' +
        '<input class="person-name" type="text" maxlength="60" placeholder="Your name" data-id="' + person.id + '" data-list="' + listName + '" value="' + escapeText(person.name) + '" aria-label="Name">' +
        '<button class="icon-btn danger" type="button" data-remove="' + person.id + '" data-list="' + listName + '" aria-label="Remove">×</button>' +
      '</div>';
    }).join('');
  }

  function renderComponents() {
    $('component-list').innerHTML = state.components.map(function (item) {
      return '<div class="part-row">' +
        '<span class="part-thumb">' + thumb(item) + '</span>' +
        '<span>' + escapeText(item.name) + '</span>' +
        '<span class="stepper">' +
          '<button type="button" data-qty="' + item.id + '" data-dir="-1" aria-label="Decrease">−</button>' +
          '<b>' + item.qty + '</b>' +
          '<button type="button" data-qty="' + item.id + '" data-dir="1" aria-label="Increase">+</button>' +
        '</span>' +
      '</div>';
    }).join('');
  }

  function renderNamed(listId, items) {
    $(listId).innerHTML = items.map(function (item) {
      return '<div class="plain-row"><span>' + escapeText(item.name) + '</span>' +
        '<button class="icon-btn danger" type="button" data-drop="' + item.id + '" data-host="' + listId + '" aria-label="Remove">×</button></div>';
    }).join('');
  }

  function renderNotes(listId, items) {
    $(listId).innerHTML = items.map(function (item) {
      return '<div class="plain-row"><span>' + escapeText(item.text || item.name) + '</span>' +
        '<button class="icon-btn danger" type="button" data-drop="' + item.id + '" data-host="' + listId + '" aria-label="Remove">×</button></div>';
    }).join('');
  }

  function showDescription() {
    const has = state.description.trim().length > 0;
    $('description').hidden = !has && $('description').hidden;
    if (has) {
      $('description').hidden = false;
      $('edit-desc').hidden = true;
    }
  }

  function doneMap() {
    return {
      intro: state.title.trim() && state.pitch.trim(),
      team: state.members.some(function (m) { return m.name.trim(); }) || state.attribution.trim() || state.contributors.length > 0,
      components: state.components.length > 0,
      tools: state.tools.length > 0,
      software: state.software.length > 0,
      description: state.description.trim().length > 0,
      code: state.code.length > 0,
      apps: state.apps.length > 0,
      files: state.files.length > 0,
      docs: state.docs.length > 0
    };
  }

  function renderChecklist() {
    const done = doneMap();
    $('checklist').innerHTML = CHECKS.map(function (item) {
      return '<li><button class="check-item' + (done[item.id] ? ' done' : '') + '" type="button" data-jump="' + item.target + '">' +
        '<span class="dot" aria-hidden="true"></span>' + item.label + '</button></li>';
    }).join('');
  }

  function renderAll() {
    $('title').value = state.title;
    $('pitch').value = state.pitch;
    $('not-author').checked = !!state.notAuthor;
    $('author-hint').hidden = !state.notAuthor;
    $('attribution').value = state.attribution;
    $('description').value = state.description;
    showDescription();
    paintCover();
    renderPeople('member-list', 'members');
    renderPeople('contributor-list', 'contributors');
    renderComponents();
    renderNamed('tool-list', state.tools);
    renderNamed('software-list', state.software);
    renderNotes('code-list', state.code);
    renderNotes('app-list', state.apps);
    renderNotes('file-list', state.files);
    renderNotes('doc-list', state.docs);
    $('tools-empty').hidden = state.tools.length > 0;
    $('apps-empty').hidden = state.apps.length > 0;
    $('files-empty').hidden = state.files.length > 0;
    $('docs-empty').hidden = state.docs.length > 0;
    renderChecklist();
  }

  function paintCover() {
    const img = $('cover-preview');
    const drop = $('cover-drop');
    const src = safeDataUrl(state.cover);
    if (src) {
      img.src = src;
      img.hidden = false;
      drop.classList.add('has-image');
    } else {
      img.removeAttribute('src');
      img.hidden = true;
      drop.classList.remove('has-image');
    }
  }

  function compressImage(file, max, done) {
    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function save(message) {
    readFields();
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      $('save-status').textContent = message || 'Saved on this browser';
    } catch (e) {
      $('save-status').textContent = 'Could not save. The cover image may be too large.';
    }
    renderChecklist();
  }

  function addNamed(list, name, svg) {
    const clean = name.trim();
    if (!clean) return;
    const found = list.find(function (item) { return item.name.toLowerCase() === clean.toLowerCase(); });
    if (found) {
      if (list === state.components) found.qty = (found.qty || 1) + 1;
      return;
    }
    const row = { id: uid(), name: clean };
    if (svg) row.svg = svg;
    if (list === state.components) row.qty = 1;
    list.push(row);
  }

  function closePickers() {
    document.querySelectorAll('.picker-panel').forEach(function (panel) { panel.hidden = true; });
  }

  function drawPicker(kind, query) {
    const q = query.trim().toLowerCase();
    const items = CATALOG[kind].filter(function (item) {
      return !q || item.name.toLowerCase().indexOf(q) !== -1;
    });
    const host = $('list-' + kind);
    let html = items.map(function (item) {
      const icon = item.svg ? '<img src="' + asset + encodeURI(item.svg) + '" alt="">' : '';
      return '<button type="button" data-add="' + kind + '" data-name="' + escapeText(item.name) + '" data-svg="' + escapeText(item.svg || '') + '">' +
        icon + escapeText(item.name) + '</button>';
    }).join('');
    if (q && !items.some(function (item) { return item.name.toLowerCase() === q; })) {
      html += '<button type="button" data-add="' + kind + '" data-name="' + escapeText(query.trim()) + '" data-svg="">Add “' + escapeText(query.trim()) + '”</button>';
    }
    host.innerHTML = html || '<p class="empty-note">No matches. Type a name and it will be added.</p>';
  }

  function hostToList(hostId) {
    return {
      'tool-list': state.tools,
      'software-list': state.software,
      'code-list': state.code,
      'app-list': state.apps,
      'file-list': state.files,
      'doc-list': state.docs
    }[hostId];
  }

  function refreshLists() {
    renderComponents();
    renderNamed('tool-list', state.tools);
    renderNamed('software-list', state.software);
    renderNotes('code-list', state.code);
    renderNotes('app-list', state.apps);
    renderNotes('file-list', state.files);
    renderNotes('doc-list', state.docs);
    $('tools-empty').hidden = state.tools.length > 0;
    $('apps-empty').hidden = state.apps.length > 0;
    $('files-empty').hidden = state.files.length > 0;
    $('docs-empty').hidden = state.docs.length > 0;
    renderChecklist();
  }

  function pushNote(list, text) {
    const clean = text.trim();
    if (!clean) return;
    list.push({ id: uid(), text: clean });
  }

  function fillPreview() {
    readFields();
    $('preview-title').textContent = state.title.trim() || 'Untitled project';
    $('preview-pitch').textContent = state.pitch.trim();
    const cover = $('preview-cover');
    const coverSrc = safeDataUrl(state.cover);
    if (coverSrc) {
      cover.src = coverSrc;
      cover.hidden = false;
    } else {
      cover.hidden = true;
    }
    const teamBits = [];
    if (state.notAuthor) teamBits.push('<p>Shared by someone who is not the author.</p>');
    state.members.forEach(function (person) {
      if (person.name.trim()) teamBits.push('<p>' + escapeText(person.name) + '</p>');
    });
    if (state.attribution.trim()) teamBits.push('<p>' + escapeText(state.attribution) + '</p>');
    state.contributors.forEach(function (person) {
      if (person.name.trim()) teamBits.push('<p>Contributor · ' + escapeText(person.name) + '</p>');
    });
    $('preview-team').innerHTML = teamBits.join('') || '<p>No team yet.</p>';
    $('preview-components').innerHTML = state.components.map(function (item) {
      return '<p>' + item.qty + ' × ' + escapeText(item.name) + '</p>';
    }).join('') || '<p>No components yet.</p>';
    $('preview-tools').innerHTML = state.tools.map(function (item) {
      return '<p>' + escapeText(item.name) + '</p>';
    }).join('') || '<p>No tools used in this project</p>';
    $('preview-software').innerHTML = state.software.map(function (item) {
      return '<p>' + escapeText(item.name) + '</p>';
    }).join('') || '<p>No apps yet.</p>';
    $('preview-description').textContent = state.description.trim() || 'No description yet.';
    $('preview-code').innerHTML = state.code.map(function (item) { return linkOrText(item.text); }).join('') || '<p>No code yet.</p>';
    $('preview-apps').innerHTML = state.apps.map(function (item) { return '<p>' + escapeText(item.name) + '</p>'; }).join('') || '<p>No Arduino App to add in this project</p>';
    $('preview-files').innerHTML = state.files.map(function (item) { return '<p>' + escapeText(item.name) + '</p>'; }).join('') || '<p>No files to add in this project</p>';
    $('preview-docs').innerHTML = state.docs.map(function (item) { return linkOrText(item.text); }).join('') || '<p>No documentation to add</p>';
  }

  function openPreview() {
    fillPreview();
    $('share-layout').hidden = true;
    $('preview').hidden = false;
    window.scrollTo(0, 0);
  }

  function closePreview() {
    $('preview').hidden = true;
    $('share-layout').hidden = false;
    window.scrollTo(0, 0);
  }

  $('title').addEventListener('input', function () { state.title = this.value; renderChecklist(); });
  $('pitch').addEventListener('input', function () { state.pitch = this.value; renderChecklist(); });
  $('not-author').addEventListener('change', function () {
    state.notAuthor = this.checked;
    $('author-hint').hidden = !this.checked;
    renderChecklist();
  });
  $('attribution').addEventListener('input', function () { state.attribution = this.value; renderChecklist(); });
  $('description').addEventListener('input', function () { state.description = this.value; renderChecklist(); });

  $('cover-file').addEventListener('change', function () {
    const file = this.files && this.files[0];
    this.value = '';
    if (!file) return;
    compressImage(file, 1400, function (url) {
      state.cover = url;
      paintCover();
    });
  });

  $('edit-desc').addEventListener('click', function () {
    $('description').hidden = false;
    this.hidden = true;
    $('description').focus();
  });

  $('add-member').addEventListener('click', function () {
    $('member-add').hidden = false;
    $('member-name').focus();
  });
  $('member-confirm').addEventListener('click', function () {
    const name = $('member-name').value.trim();
    if (!name) return;
    state.members.push({ id: uid(), name: name, avatar: '' });
    $('member-name').value = '';
    $('member-add').hidden = true;
    renderPeople('member-list', 'members');
    renderChecklist();
  });

  $('add-contributor').addEventListener('click', function () {
    $('contributor-add').hidden = false;
    $('contributor-name').focus();
  });
  $('contributor-confirm').addEventListener('click', function () {
    const name = $('contributor-name').value.trim();
    if (!name) return;
    state.contributors.push({ id: uid(), name: name, avatar: '' });
    $('contributor-name').value = '';
    $('contributor-add').hidden = true;
    renderPeople('contributor-list', 'contributors');
    renderChecklist();
  });

  document.addEventListener('click', function (event) {
    const jump = event.target.closest('[data-jump]');
    if (jump) {
      const node = $(jump.dataset.jump);
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const add = event.target.closest('[data-add]');
    if (add) {
      const list = add.dataset.add === 'components' ? state.components : add.dataset.add === 'tools' ? state.tools : state.software;
      addNamed(list, add.dataset.name, add.dataset.svg);
      closePickers();
      refreshLists();
      return;
    }

    const qty = event.target.closest('[data-qty]');
    if (qty) {
      const item = state.components.find(function (row) { return row.id === qty.dataset.qty; });
      if (!item) return;
      item.qty += Number(qty.dataset.dir);
      if (item.qty < 1) state.components = state.components.filter(function (row) { return row.id !== item.id; });
      refreshLists();
      return;
    }

    const remove = event.target.closest('[data-remove]');
    if (remove) {
      readPeople();
      const key = remove.dataset.list;
      state[key] = state[key].filter(function (person) { return person.id !== remove.dataset.remove; });
      renderPeople(key === 'members' ? 'member-list' : 'contributor-list', key);
      renderChecklist();
      return;
    }

    const drop = event.target.closest('[data-drop]');
    if (drop) {
      const list = hostToList(drop.dataset.host);
      if (!list) return;
      const next = list.filter(function (item) { return item.id !== drop.dataset.drop; });
      list.length = 0;
      next.forEach(function (item) { list.push(item); });
      refreshLists();
      return;
    }

    const avatarBtn = event.target.closest('[data-avatar]');
    if (avatarBtn) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', function () {
        const file = input.files && input.files[0];
        if (!file) return;
        compressImage(file, 240, function (url) {
          const person = state[avatarBtn.dataset.list].find(function (row) { return row.id === avatarBtn.dataset.avatar; });
          if (!person) return;
          person.avatar = url;
          renderPeople(avatarBtn.dataset.list === 'members' ? 'member-list' : 'contributor-list', avatarBtn.dataset.list);
        });
      });
      input.click();
    }
  });

  document.querySelectorAll('[data-picker]').forEach(function (button) {
    button.addEventListener('click', function () {
      const kind = button.dataset.picker;
      const panel = $('picker-' + kind);
      const willOpen = panel.hidden;
      closePickers();
      panel.hidden = !willOpen;
      if (willOpen) {
        const search = panel.querySelector('input');
        search.value = '';
        drawPicker(kind, '');
        search.focus();
      }
    });
  });

  document.querySelectorAll('[data-filter]').forEach(function (input) {
    input.addEventListener('input', function () { drawPicker(input.dataset.filter, input.value); });
    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const kind = input.dataset.filter;
      if (!input.value.trim()) return;
      const list = kind === 'components' ? state.components : kind === 'tools' ? state.tools : state.software;
      const exact = CATALOG[kind].find(function (item) { return item.name.toLowerCase() === input.value.trim().toLowerCase(); });
      addNamed(list, input.value, exact ? exact.svg : '');
      input.value = '';
      closePickers();
      refreshLists();
    });
  });

  $('add-code').addEventListener('click', function () {
    $('code-form').hidden = false;
    $('code-input').focus();
  });
  $('code-confirm').addEventListener('click', function () {
    pushNote(state.code, $('code-input').value);
    $('code-input').value = '';
    $('code-form').hidden = true;
    refreshLists();
  });

  $('add-doc').addEventListener('click', function () {
    $('doc-form').hidden = false;
    $('doc-input').focus();
  });
  $('doc-confirm').addEventListener('click', function () {
    pushNote(state.docs, $('doc-input').value);
    $('doc-input').value = '';
    $('doc-form').hidden = true;
    refreshLists();
  });

  $('app-file').addEventListener('change', function () {
    const file = this.files && this.files[0];
    this.value = '';
    if (!file) return;
    state.apps.push({ id: uid(), name: file.name });
    refreshLists();
  });

  $('extra-file').addEventListener('change', function () {
    const file = this.files && this.files[0];
    this.value = '';
    if (!file) return;
    state.files.push({ id: uid(), name: file.name });
    refreshLists();
  });

  function readPublished() {
    try {
      const data = JSON.parse(localStorage.getItem(PUBLISHED) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function toPublic() {
    readFields();
    const author = state.members.find(function (person) { return person.name.trim(); });
    const codeText = state.code.map(function (item) { return item.text; }).filter(Boolean).join('\n\n');
    const link = isUrl(codeText) ? codeText.trim() : '';
    return {
      id: state.publishedId || ('p-' + uid()),
      title: state.title.trim(),
      pitch: state.pitch.trim(),
      date: new Date().toISOString(),
      views: 0,
      respects: 0,
      kind: 'Showcase',
      license: 'LGPL3+',
      cover: safeDataUrl(state.cover),
      author: { name: author ? author.name.trim() : 'Maker', followers: 0, projects: 1 },
      components: state.components.map(function (item) {
        return { qty: item.qty || 1, name: item.name, svg: item.svg || '' };
      }),
      software: state.software.map(function (item) { return item.name; }),
      tools: state.tools.map(function (item) { return item.name; }),
      description: state.description.trim(),
      code: !link && codeText ? { title: state.title.trim(), caption: '', lang: 'cpp', source: codeText } : null,
      codeLink: link,
      comments: []
    };
  }

  function openHub(query) {
    const base = document.body.dataset.view || 'index.html';
    location.href = base + query;
  }

  function publish() {
    readFields();
    if (!state.title.trim()) {
      $('save-status').textContent = 'Add a title before publishing.';
      $('title').focus();
      return;
    }
    const project = toPublic();
    const projects = readPublished();
    const prev = projects.find(function (item) { return item.id === project.id; });
    if (prev) {
      project.views = prev.views || 0;
      project.respects = prev.respects || 0;
      project.comments = prev.comments || [];
      project.date = prev.date || project.date;
    }
    state.publishedId = project.id;
    const next = projects.filter(function (item) { return item.id !== project.id; });
    next.unshift(project);
    try {
      localStorage.setItem(PUBLISHED, JSON.stringify(next));
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      $('save-status').textContent = 'Could not publish. The cover image may be too large.';
      return;
    }
    openHub('?id=' + encodeURIComponent(project.id));
  }

  $('editor').addEventListener('submit', function (event) {
    event.preventDefault();
    save('Saved on this browser');
  });

  if ($('publish-btn')) $('publish-btn').addEventListener('click', publish);
  $('go-preview').addEventListener('click', function () {
    save('');
    openHub('?draft=1');
  });
  $('back-edit').addEventListener('click', closePreview);
  $('preview-save').addEventListener('click', function () { save('Saved on this browser'); });

  $('delete-draft').addEventListener('click', function () {
    if (!window.confirm('Delete this draft?')) return;
    localStorage.removeItem(KEY);
    const fresh = blank();
    Object.keys(state).forEach(function (key) { delete state[key]; });
    Object.keys(fresh).forEach(function (key) { state[key] = fresh[key]; });
    $('save-status').textContent = '';
    $('description').hidden = true;
    $('edit-desc').hidden = false;
    closePickers();
    closePreview();
    renderAll();
  });

  $('open-guidelines').addEventListener('click', function () { $('guidelines').showModal(); });
  $('close-guidelines').addEventListener('click', function () { $('guidelines').close(); });

  renderAll();
})();
