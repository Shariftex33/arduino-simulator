(function () {
  const PUBLISHED = 'edu-showcase-published';
  const SOCIAL = 'edu-showcase-social';
  const DRAFT = 'edu-showcase-draft';
  const depth = Number(document.body.dataset.depth || 1);
  const asset = '../'.repeat(depth) + 'assets/svg/';

  const SKETCH = [
    'int melody[] = {',
    '  //Line 1 ',
    '  262, 262 , 294 , 262 , 349 , 330 ,',
    '  //Line 2 ',
    '  262 , 262 , 294 , 262 , 392 , 349 ,',
    '  //Line 3 ',
    '  262 , 262 , 523 , 440 , 392 , 330 , 294 , ',
    '  //Line 4 ',
    '  466 , 466 , 440 , 349 , 392 , 349',
    '};',
    'int duration[] = {',
    '  300 , 300, 600 , 600 , 600 , 1300 ,',
    '  300 , 300, 600 , 600 , 600 , 1300 ,',
    '  300 , 300, 600 , 600 , 600 , 700 , 1000 ,',
    '  300 , 300, 600 , 600 , 600 , 1300 ,',
    '};',
    'void setup() ',
    '{',
    '  pinMode(8,OUTPUT);',
    '}',
    'void loop() ',
    '{',
    '  for (int i = 0 ; i< sizeof(melody)/sizeof(int); i++)   ',
    '  {',
    '   int durations = duration[i];',
    '   tone(8 , melody[i] , durations);',
    '',
    '   int puz = durations * 1.3;     ',
    '   delay(puz);',
    '',
    '  noTone(8);   ',
    '  }',
    'delay(1000);     ',
    '}'
  ].join('\n');

  const DESCRIPTION = [
    'In this project, I programmed an **Arduino Uno** to play the **"Happy Birthday"** melody using a buzzer.',
    '',
    'The melody is stored as an array of frequencies, while a second array defines the duration of each note. The Arduino uses the `tone()` function to generate the different frequencies and play the melody.',
    '',
    'The circuit is simple and suitable for beginners who want to practice both **Arduino programming and basic electronics**.',
    '',
    'Components :',
    '- Arduino Uno',
    '- Buzzer',
    '- 220Ω resistor',
    '- Jumper wires',
    '',
    'Circuit Connections :',
    '- Arduino **D8 → 220Ω resistor → Buzzer (+)**',
    '- Buzzer **(−) → Arduino GND**',
    '',
    'The 220Ω resistor is connected in series with the positive terminal of the buzzer.',
    '',
    'How the Code Works :',
    'The `melody[]` array contains the frequencies of the notes.',
    '',
    'The `duration[]` array contains the duration of each note in milliseconds.',
    '',
    'A `for` loop goes through the melody and uses:',
    '',
    '`tone(8, melody[i], durations);`',
    '',
    'to generate each note on digital pin 8.',
    '',
    'After each note, `noTone(8)` stops the sound, and the song is repeated continuously with a short pause between repetitions.',
    '',
    'What I Learned :',
    'Through this project, I practiced:',
    '',
    '- Using arrays in Arduino programming',
    '- Using the `tone()` and `noTone()` functions',
    '- Controlling a buzzer',
    '- Understanding basic electronic connections',
    '- Combining programming with music and sound',
    '',
    'This was a simple project, but it was a great way to make an Arduino circuit more interactive and fun.'
  ].join('\n');

  const REPLY = [
    'Thank you for your comment! Here is a simple explanation of the code, especially the for loop:',
    '',
    '1. Melody and duration arrays',
    'int melody[] = { ... };',
    'int duration[] = { ... };',
    'The melody array stores the frequencies of the notes in Hertz (Hz). Each number represents one musical note.',
    'The duration array stores the duration of each corresponding note in milliseconds.',
    'The two arrays work together: melody[i] gives the frequency of the note, while duration[i] gives its duration.',
    '',
    '2. setup()',
    'void setup()',
    '{',
    'pinMode(8, OUTPUT);',
    '}',
    'Pin 8 is configured as an output because the buzzer is connected to this pin.',
    '',
    '3. The for loop',
    'for (int i = 0; i < sizeof(melody) / sizeof(int); i++)',
    'This loop goes through all the elements of the melody array one by one.',
    'int i = 0 starts the loop from the first note.',
    'i++ increases the index by one after each iteration, so the next note is selected.',
    'The expression sizeof(melody) / sizeof(int) calculates the number of elements in the array. sizeof(melody) gives the total size of the array in bytes, and sizeof(int) gives the size of one integer element. Dividing them gives the total number of notes.',
    '',
    '4. Playing each note',
    'int durations = duration[i];',
    'tone(8, melody[i], durations);',
    'duration[i] gets the duration corresponding to the current note.',
    'Then tone() generates a sound on pin 8 using the frequency stored in melody[i] for that duration.',
    '',
    '5. The 1.3 multiplier',
    'int puz = durations * 1.3;',
    'delay(puz);',
    'I use a slightly longer delay than the actual note duration. This gives a small gap between consecutive notes and makes the melody sound cleaner instead of having the notes run too closely together.',
    '',
    '6. noTone()',
    'noTone(8);',
    'This stops the tone on pin 8 after each note, creating a small separation between the notes.',
    '',
    '7. The final delay',
    'delay(1000);',
    'After the entire melody has been played, the Arduino waits for 1 second before starting the melody again.',
    '',
    'So, in simple terms, the for loop is responsible for going through the notes one by one, selecting the corresponding duration, playing each note, and then moving to the next note until the entire melody is completed.'
  ].join('\n');

  const SEED = {
    id: 'happy-birthday',
    title: 'Happy Birthday Melody with Arduino',
    pitch: 'I programmed an Arduino Uno to play the “Happy Birthday” melody using a buzzer. The melody is stored as an array of frequencies, while a second array defines the duration of each note.',
    date: '2026-08-20',
    kind: 'Getting started',
    views: 3608,
    respects: 6,
    tone: 'tone-paper',
    art: ['arduino-uno.svg', 'buzzer.svg'],
    license: 'LGPL3+',
    cover: '',
    author: { name: 'niyoushasm', followers: 8, projects: 8 },
    components: [
      { qty: 1, name: '10 jumper wires 150mm male', svg: 'jumper-wires.svg' },
      { qty: 1, name: 'Arduino USB 2.0 CABLE TYPE A/B 1M', svg: '' },
      { qty: 1, name: 'Arduino Uno Rev3', svg: 'arduino-uno.svg' },
      { qty: 1, name: '220 ohm Resistor', svg: 'resistor.svg' },
      { qty: 1, name: 'Buzzer', svg: 'buzzer.svg' }
    ],
    software: ['Arduino IDE'],
    tools: [],
    description: DESCRIPTION,
    code: {
      title: 'Happy Birthday Melody with Arduino',
      caption: 'Play the “Happy Birthday” melody using a buzzer',
      lang: 'cpp',
      source: SKETCH
    },
    codeLink: '',
    comments: [
      {
        id: 'c1',
        author: 'frenchy22',
        when: '6 days ago',
        text: 'Your project is interesting and shows what you have understood. If you want to go further, you are invited to have a glance at my project "Volume control with R4 boards" (https://projecthub.arduino.cc/frenchy22/volume-control-with-r4-boards-74ff48). It is somewhat complex, but you can use it to gradually learn how to program melodies using note names, control the buzzer volume, integrate your project into a larger one, and so on.'
      },
      {
        id: 'c2',
        author: 'aleksei2026',
        when: '21 days ago',
        text: 'Explain the code, functions and for loop.\nThank you really much!',
        replies: [
          { id: 'c3', author: 'niyoushasm', when: '14 days ago', text: REPLY }
        ]
      }
    ]
  };

  const LIBRARY = [
    {
      id: 'jbr-001',
      title: 'JBR-001: A Desktop Companion Robot Powered by Arduino UNO Q',
      kind: 'Tutorial',
      pitch: 'A desktop robot that looks around and waves when someone sits nearby.',
      date: '2026-02-02',
      views: 76000,
      viewLabel: '76k+',
      respects: 7,
      commentTotal: 0,
      license: 'CC BY-SA',
      author: { name: 'syntheticaidata', followers: 42, projects: 4 },
      tone: 'tone-blue',
      art: ['robot-parts.svg'],
      components: [
        { qty: 1, name: 'Arduino Uno', svg: 'arduino-uno.svg' },
        { qty: 2, name: 'Servo SG90', svg: 'servo.svg' },
        { qty: 1, name: 'HC-SR04 ultrasonic', svg: 'hcsr04.svg' }
      ],
      software: ['Arduino IDE'],
      tools: [],
      description: 'JBR-001 sits on a desk and turns its head with two servos. An ultrasonic sensor watches the space in front of it. When someone comes close, the robot waves once and then settles.\n\n- Arduino Uno drives the servos on pins 9 and 10\n- HC-SR04 trigger and echo use pins 6 and 7\n\nThe sketch stores a short pose list and steps through it with `Servo.write()`.',
      code: {
        title: 'Desk companion',
        caption: 'Wave when the distance drops under 30 cm',
        lang: 'cpp',
        source: 'if (cm < 30) {\n  head.write(40);\n  delay(400);\n  head.write(140);\n  delay(400);\n  head.write(90);\n}\n'
      },
      comments: []
    },
    {
      id: 'hc05-led',
      title: 'Controlling led using HC-05 bluetooth module',
      kind: 'Tutorial',
      pitch: 'A phone sends 1 or 0 over Bluetooth and the Uno switches an LED.',
      date: '2026-01-18',
      views: 1102000,
      viewLabel: '1102k+',
      respects: 18,
      commentTotal: 12,
      license: 'CC BY',
      author: { name: 'syedmahamood', followers: 310, projects: 9 },
      tone: 'tone-board',
      art: ['arduino-uno.svg', 'led-red.svg'],
      components: [
        { qty: 1, name: 'Arduino Uno', svg: 'arduino-uno.svg' },
        { qty: 1, name: 'HC-05 Bluetooth module', svg: '' },
        { qty: 1, name: 'Red LED', svg: 'led-red.svg' },
        { qty: 1, name: 'Resistor 220Ω', svg: 'resistor.svg' }
      ],
      software: ['Arduino IDE'],
      tools: [],
      description: 'The HC-05 talks to the Uno over serial. A phone app sends the character `1` to turn the LED on and `0` to turn it off.\n\n- HC-05 TX → Arduino pin 2\n- HC-05 RX → Arduino pin 3, through a divider\n- LED → pin 13, with a 220Ω resistor\n\n`Serial.available()` reads one character and `digitalWrite()` follows it.',
      code: {
        title: 'Bluetooth LED',
        caption: '1 turns the LED on, 0 turns it off',
        lang: 'cpp',
        source: 'if (Serial.available()) {\n  char cmd = Serial.read();\n  if (cmd == \'1\') digitalWrite(13, HIGH);\n  if (cmd == \'0\') digitalWrite(13, LOW);\n}\n'
      },
      comments: []
    },
    {
      id: 'ventuno-steam',
      title: 'Gaming with Steam on VENTUNO Q',
      kind: 'Showcase',
      pitch: 'VENTUNO Q boots into a desktop and launches Steam on the attached display.',
      date: '2026-04-09',
      views: 1178,
      respects: 1,
      commentTotal: 0,
      license: 'CC BY',
      author: { name: 'jbruges', followers: 16, projects: 2 },
      tone: 'tone-dark',
      art: ['esp32-devkit.svg'],
      components: [
        { qty: 1, name: 'Arduino VENTUNO Q', svg: 'esp32-devkit.svg' },
        { qty: 1, name: 'HDMI display', svg: '' }
      ],
      software: ['Arduino App Lab'],
      tools: [],
      description: 'This showcase boots VENTUNO Q to a desktop session and opens Steam. The point is the board running a full app, not a pin sketch.\n\nPlug in the display, power the board, and start the Steam app from the desktop launcher.',
      comments: []
    },
    {
      id: 'smart-security',
      title: 'Arduino Based Smart Security System',
      kind: 'Tutorial',
      pitch: 'A PIR sensor trips a buzzer and a lamp when someone walks into the room.',
      date: '2026-03-01',
      views: 11000,
      viewLabel: '11k+',
      respects: 11,
      commentTotal: 4,
      license: 'CC BY-SA',
      author: { name: 'esperamos', followers: 88, projects: 6 },
      tone: 'tone-board',
      art: ['pir.svg', 'buzzer.svg'],
      components: [
        { qty: 1, name: 'Arduino Uno', svg: 'arduino-uno.svg' },
        { qty: 1, name: 'PIR motion sensor', svg: 'pir.svg' },
        { qty: 1, name: 'Buzzer', svg: 'buzzer.svg' },
        { qty: 1, name: 'Lamp', svg: 'bulb.svg' }
      ],
      software: ['Arduino IDE'],
      tools: [],
      description: 'The PIR output goes to pin 2. When it goes high, pin 8 sounds the buzzer and pin 9 lights the lamp for a few seconds.\n\n- PIR VCC → 5V\n- PIR GND → GND\n- PIR OUT → D2\n\nA short `delay()` holds the alarm so a single walk-by does not chirp and stop instantly.',
      code: {
        title: 'Motion alarm',
        caption: 'Sound the buzzer while the PIR sees motion',
        lang: 'cpp',
        source: 'if (digitalRead(2) == HIGH) {\n  tone(8, 880);\n  digitalWrite(9, HIGH);\n} else {\n  noTone(8);\n  digitalWrite(9, LOW);\n}\n'
      },
      comments: []
    },
    {
      id: 'echo-alert',
      title: 'EchoAlert: Smart Obstacle Detector',
      kind: 'Tutorial',
      pitch: 'The buzzer beeps faster as an object gets closer to the ultrasonic sensor.',
      date: '2026-05-14',
      views: 5435,
      respects: 8,
      commentTotal: 0,
      license: 'CC BY',
      author: { name: 'niha_arduino', followers: 27, projects: 3 },
      tone: 'tone-board',
      art: ['hcsr04.svg', 'buzzer.svg'],
      components: [
        { qty: 1, name: 'Arduino Uno', svg: 'arduino-uno.svg' },
        { qty: 1, name: 'HC-SR04 ultrasonic', svg: 'hcsr04.svg' },
        { qty: 1, name: 'Buzzer', svg: 'buzzer.svg' }
      ],
      software: ['Arduino IDE'],
      tools: [],
      description: 'EchoAlert measures distance with an HC-SR04 and turns that reading into a beep. Far away, the pause between beeps is long. Under 15 cm, the beeps run together.\n\n- Trigger → D9\n- Echo → D10\n- Buzzer → D8\n\n`pulseIn()` times the echo, and the sketch converts microseconds to centimeters.',
      code: {
        title: 'Obstacle beeps',
        caption: 'Shorter gaps as the object gets closer',
        lang: 'cpp',
        source: 'long cm = pulseIn(10, HIGH) / 58;\ntone(8, 1200, 40);\ndelay(cm < 15 ? 80 : cm * 8);\n'
      },
      comments: []
    },
    SEED
  ];

  let current = null;
  let replyTo = '';

  function $(id) { return document.getElementById(id); }

  function escapeText(value) {
    return String(value || '').replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function safeDataUrl(url) {
    if (typeof url !== 'string' || url.length > 1800000) return '';
    return /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(url) ? url : '';
  }

  function initial(name) {
    return escapeText((name || '?').trim().charAt(0).toUpperCase() || '?');
  }

  function readJson(key, fallback) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '');
      return data == null ? fallback : data;
    } catch (e) {
      return fallback;
    }
  }

  function userProjects() {
    const data = readJson(PUBLISHED, []);
    return Array.isArray(data) ? data : [];
  }

  function allSocial() {
    const data = readJson(SOCIAL, {});
    return data && typeof data === 'object' ? data : {};
  }

  function socialOf(id) {
    const all = allSocial();
    const row = all[id] || {};
    return {
      respected: !!row.respected,
      followed: !!row.followed,
      comments: Array.isArray(row.comments) ? row.comments : [],
      replies: row.replies && typeof row.replies === 'object' ? row.replies : {}
    };
  }

  function writeSocial(id, row) {
    const all = allSocial();
    all[id] = row;
    localStorage.setItem(SOCIAL, JSON.stringify(all));
  }

  function formatDate(value) {
    const raw = String(value || '');
    const date = new Date(raw.length === 10 ? raw + 'T12:00:00' : raw);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function makerName() {
    try {
      const user = window.EduSync && window.EduSync.profile && window.EduSync.profile();
      if (user && user.name) return user.name;
    } catch (e) {}
    return localStorage.getItem('edu-platform-student') || 'You';
  }

  function draftProject() {
    const state = readJson(DRAFT, null);
    if (!state || !state.title) return null;
    const author = (state.members || []).find(function (person) { return person.name && person.name.trim(); });
    const codeText = (state.code || []).map(function (item) { return item.text; }).filter(Boolean).join('\n\n');
    const link = /^https?:\/\/\S+$/i.test(codeText.trim()) ? codeText.trim() : '';
    return {
      id: 'draft',
      title: state.title,
      pitch: state.pitch || '',
      date: new Date().toISOString(),
      views: 0,
      respects: 0,
      license: 'LGPL3+',
      cover: safeDataUrl(state.cover),
      author: { name: author ? author.name.trim() : makerName(), followers: 0, projects: 1 },
      components: (state.components || []).map(function (item) {
        return { qty: item.qty || 1, name: item.name, svg: item.svg || '' };
      }),
      software: (state.software || []).map(function (item) { return item.name; }),
      tools: (state.tools || []).map(function (item) { return item.name; }),
      description: state.description || '',
      code: !link && codeText ? { title: state.title, caption: '', lang: 'cpp', source: codeText } : null,
      codeLink: link,
      comments: [],
      draft: true
    };
  }

  function catalog() {
    const known = {};
    LIBRARY.forEach(function (project) { known[project.id] = true; });
    const extra = userProjects().filter(function (project) { return !known[project.id]; });
    return extra.concat(LIBRARY);
  }

  function viewText(project) {
    if (project.viewLabel) return project.viewLabel;
    return String(project.views || 0);
  }

  function extraComments(social) {
    let count = social.comments.length;
    Object.keys(social.replies).forEach(function (key) {
      count += (social.replies[key] || []).length;
    });
    return count;
  }

  function shownComments(project, social) {
    const live = commentCount(project, social);
    if (project.commentTotal == null) return live;
    const stored = commentCount(project, { comments: [], replies: {} });
    return project.commentTotal + (live - stored);
  }

  function findProject(id) {
    if (id === 'draft') return draftProject();
    return catalog().find(function (item) { return item.id === id; }) || null;
  }

  function inline(text) {
    return escapeText(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function renderMarkdown(source) {
    const lines = String(source || '').split('\n');
    let html = '';
    let list = false;
    function closeList() {
      if (list) { html += '</ul>'; list = false; }
    }
    lines.forEach(function (line) {
      const trim = line.trim();
      if (!trim) { closeList(); return; }
      if (trim.indexOf('- ') === 0) {
        if (!list) { html += '<ul>'; list = true; }
        html += '<li>' + inline(trim.slice(2)) + '</li>';
        return;
      }
      closeList();
      html += '<p>' + inline(trim) + '</p>';
    });
    closeList();
    return html || '<p>No description yet.</p>';
  }

  function renderCode(project) {
    if (project.codeLink) {
      const href = escapeText(project.codeLink);
      return '<p><a href="' + href + '" target="_blank" rel="noopener">' + href + '</a></p>';
    }
    if (!project.code || !project.code.source) return '<p class="hub-kicker">No code yet.</p>';
    const lines = String(project.code.source).replace(/\s+$/, '').split('\n');
    const body = lines.map(function (line) {
      return '<li><code>' + (escapeText(line) || '&nbsp;') + '</code></li>';
    }).join('');
    const caption = project.code.caption ? '<p class="code-caption">' + escapeText(project.code.caption) + '</p>' : '';
    return caption +
      '<div class="code-panel"><header><span>' + escapeText(project.code.title || 'Sketch') + '</span><span>' + escapeText(project.code.lang || 'cpp') + '</span></header><ol class="code-lines">' + body + '</ol></div>';
  }

  function linkify(text) {
    return escapeText(text)
      .replace(/https?:\/\/[^\s<&]+/g, function (url) {
        const clean = url.replace(/[).,;:]+$/g, '');
        const rest = url.slice(clean.length);
        return '<a href="' + clean + '" target="_blank" rel="noopener">' + clean + '</a>' + rest;
      })
      .replace(/\n/g, '<br>');
  }

  function thumb(item) {
    if (item.svg) return '<img src="' + asset + encodeURI(item.svg) + '" alt="">';
    return initial(item.name);
  }

  function coverHtml(project) {
    const photo = safeDataUrl(project.cover);
    if (photo) return '<div class="hub-cover"><img class="photo" src="' + photo + '" alt=""></div>';
    const art = project.art && project.art.length ? project.art : ['arduino-uno.svg', 'buzzer.svg'];
    return '<div class="hub-cover ' + escapeText(project.tone || '') + '" aria-hidden="true">' + art.map(function (file) {
      return '<img class="part" src="' + asset + encodeURI(file) + '" alt="">';
    }).join('') + '</div>';
  }

  function commentCount(project, social) {
    const comments = (project.comments || []).concat(social.comments);
    return comments.reduce(function (sum, comment) {
      const replies = (comment.replies || []).concat(social.replies[comment.id] || []);
      return sum + 1 + replies.length;
    }, 0);
  }

  function renderOneComment(comment, social) {
    const replies = (comment.replies || []).concat(social.replies[comment.id] || []);
    const replyHtml = replies.map(function (reply) {
      return '<div class="comment"><span class="avatar">' + initial(reply.author) + '</span><div class="comment-body"><header><b>' + escapeText(reply.author) + '</b><span>' + escapeText(reply.when) + '</span></header><p>' + linkify(reply.text) + '</p></div></div>';
    }).join('');
    return '<div class="comment"><span class="avatar">' + initial(comment.author) + '</span><div class="comment-body"><header><b>' + escapeText(comment.author) + '</b><span>' + escapeText(comment.when) + '</span></header><p>' + linkify(comment.text) + '</p><button class="text-btn reply" type="button" data-reply="' + escapeText(comment.id) + '" data-author="' + escapeText(comment.author) + '">Reply</button></div></div>' +
      (replyHtml ? '<div class="replies">' + replyHtml + '</div>' : '');
  }

  const ICONS = {
    view: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    comment: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M5 6h14v9H8l-3 3V6z"/></svg>',
    respect: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M8 11v8H5v-8h3zm0 0 3-6a2 2 0 0 1 2 2v4h4.2a2 2 0 0 1 2 2.3l-1 5A2 2 0 0 1 16.2 20H8"/></svg>'
  };

  function cardCover(project) {
    const photo = safeDataUrl(project.cover);
    if (photo) return '<img class="card-photo" src="' + photo + '" alt="">';
    const art = project.art && project.art.length ? project.art : ['arduino-uno.svg'];
    return '<div class="card-art ' + escapeText(project.tone || 'tone-board') + '">' + art.map(function (file) {
      return '<img src="' + asset + encodeURI(file) + '" alt="">';
    }).join('') + '</div>';
  }

  function renderGallery(projects) {
    current = null;
    document.title = 'Showcase';
    if ($('hub-switch')) $('hub-switch').innerHTML = '<a class="btn" href="new/index.html">New project</a>';
    $('hub-article').innerHTML = '<div class="project-grid">' + projects.map(function (project) {
      const social = socialOf(project.id);
      const respects = (project.respects || 0) + (social.respected ? 1 : 0);
      const author = project.author || { name: 'Maker' };
      return '<a class="project-card" href="?id=' + encodeURIComponent(project.id) + '">' +
        cardCover(project) +
        '<h2>' + escapeText(project.title) + '</h2>' +
        '<p class="project-by">' + escapeText(project.kind || 'Showcase') + ' by <span>' + escapeText(author.name) + '</span></p>' +
        '<p class="project-stats"><span>' + ICONS.view + ' ' + escapeText(viewText(project)) + '</span><span>' + ICONS.comment + ' ' + shownComments(project, social) + '</span><span>' + ICONS.respect + ' ' + respects + '</span></p>' +
      '</a>';
    }).join('') + '</div>';
  }

  function renderArticle(project) {
    current = project;
    replyTo = '';
    const social = socialOf(project.id);
    const views = project.views || 0;
    const respects = (project.respects || 0) + (social.respected ? 1 : 0);
    const comments = commentCount(project, social);
    const author = project.author || { name: 'Maker', followers: 0, projects: 1 };
    const parts = (project.components || []).map(function (item) {
      return '<div class="bom-row"><span class="bom-thumb">' + thumb(item) + '</span><b>' + (item.qty || 1) + '</b><span>' + escapeText(item.name) + '</span></div>';
    }).join('');
    const software = (project.software || []).map(function (name) {
      const icon = name === 'Arduino IDE' ? '<img src="' + asset + 'arduino-ide.svg" alt="">' : initial(name);
      return '<div class="soft-row"><span class="bom-thumb">' + icon + '</span><span>' + escapeText(name) + '</span></div>';
    }).join('');
    const tools = (project.tools || []).map(function (name) {
      return '<div class="soft-row"><span class="bom-thumb">' + initial(name) + '</span><span>' + escapeText(name) + '</span></div>';
    }).join('');
    const thread = (project.comments || []).concat(social.comments).map(function (comment) {
      return renderOneComment(comment, social);
    }).join('');
    const banner = project.draft
      ? '<p class="draft-banner"><span class="draft-pill">draft</span> <a href="new/index.html">Back to editor</a></p>'
      : '<p class="hub-back"><a href="index.html">Showcase</a></p>';

    $('hub-article').innerHTML =
      banner +
      '<div class="hub-layout"><div>' +
        coverHtml(project) +
        '<h1 id="intro">' + escapeText(project.title) + '</h1>' +
        '<p class="hub-kicker">' + escapeText(project.pitch) + '</p>' +
        '<p class="hub-meta"><time>' + escapeText(formatDate(project.date)) + '</time><span>•</span><span>' + escapeText(viewText(project)) + ' views</span><span>•</span><button type="button" id="respect-btn"' + (social.respected ? ' class="on"' : '') + '>' + respects + ' respects</button><span>•</span><span>' + escapeText(project.license || 'LGPL3+') + '</span></p>' +
        (parts ? '<section class="hub-section" id="devices"><h2>Devices &amp; Components</h2>' + parts + '</section>' : '') +
        (tools ? '<section class="hub-section" id="tools"><h2>Hardware &amp; Tools</h2>' + tools + '</section>' : '') +
        (software ? '<section class="hub-section" id="software"><h2>Software &amp; Tools</h2>' + software + '</section>' : '') +
        '<section class="hub-section" id="description"><h2>Project description</h2><div class="prose">' + renderMarkdown(project.description) + '</div></section>' +
        ((project.code && project.code.source) || project.codeLink ? '<section class="hub-section" id="code"><h2>Code</h2>' + renderCode(project) + '</section>' : '') +
        '<section class="hub-section" id="comments"><h2>Comments</h2>' +
          '<div class="comment-form"><span class="avatar">' + initial(makerName()) + '</span><form id="comment-form"><div><p class="reply-note" id="reply-note" hidden></p><div style="display:flex;gap:8px"><input id="comment-input" type="text" maxlength="2000" placeholder="Add a comment..." autocomplete="off"><button class="btn" type="submit">send</button></div></div></form></div>' +
          thread +
        '</section>' +
      '</div><aside class="hub-side">' +
        '<div class="author-card"><span class="avatar">' + initial(author.name) + '</span><h2>' + escapeText(author.name) + '</h2><p>' + (author.followers || 0) + ' Followers</p><p>' + (author.projects || 1) + ' Projects</p><button class="btn' + (social.followed ? ' ghost' : '') + '" type="button" id="follow-btn">' + (social.followed ? 'FOLLOWING' : 'FOLLOW') + '</button></div>' +
        '<nav class="toc-card"><h2>Table of contents</h2><a href="#intro">Intro</a>' +
          (parts ? '<a href="#devices">Devices &amp; Components</a>' : '') +
          (software ? '<a href="#software">Software &amp; Tools</a>' : '') +
          '<a href="#description">Project description</a>' +
          ((project.code && project.code.source) || project.codeLink ? '<a href="#code">Code</a>' : '') +
        '</nav>' +
        '<div class="hub-counts"><span><b id="respect-count">' + respects + '</b> respects</span><span><b id="comment-count">' + comments + '</b> comments</span></div>' +
      '</aside></div>';
    document.title = project.title + ' · Showcase';
  }

  function paint() {
    const params = new URLSearchParams(location.search);
    if (params.get('draft') === '1') {
      const draft = draftProject();
      if (draft) {
        renderArticle(draft);
        return;
      }
    }
    const id = params.get('id');
    if (id) {
      const project = findProject(id);
      if (project) {
        renderArticle(project);
        return;
      }
    }
    renderGallery(catalog());
  }

  document.addEventListener('click', function (event) {
    if (!current) return;
    if (event.target.id === 'respect-btn') {
      const social = socialOf(current.id);
      social.respected = !social.respected;
      writeSocial(current.id, social);
      renderArticle(current);
      return;
    }
    if (event.target.id === 'follow-btn') {
      const social = socialOf(current.id);
      social.followed = !social.followed;
      writeSocial(current.id, social);
      renderArticle(current);
      return;
    }
    const reply = event.target.closest('[data-reply]');
    if (reply && $('comment-input')) {
      replyTo = reply.dataset.reply;
      $('reply-note').hidden = false;
      $('reply-note').textContent = 'Replying to ' + reply.dataset.author;
      $('comment-input').focus();
    }
  });

  document.addEventListener('submit', function (event) {
    if (!current || event.target.id !== 'comment-form') return;
    event.preventDefault();
    const input = $('comment-input');
    const text = input.value.trim();
    if (!text) return;
    const social = socialOf(current.id);
    const note = { id: 'local-' + Date.now(), author: makerName(), when: 'just now', text: text };
    if (replyTo) {
      social.replies[replyTo] = (social.replies[replyTo] || []).concat([note]);
    } else {
      social.comments.push(note);
    }
    writeSocial(current.id, social);
    renderArticle(current);
  });

  if ($('hub-article')) paint();
})();
