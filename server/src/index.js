import express from 'express';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { LEVELS, PLANS, PROJECTS, PROJECT_SETS, levelById, planById } from './catalog.js';
import { acceptProgress, dayKey, parseActivities, streakCount } from './activities.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const activities = parseActivities(readFileSync(path.join(root, 'js', 'learn.js'), 'utf8'));
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

function nowIso() {
  return new Date().toISOString();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 2) return false;
  const next = scryptSync(password, parts[0], 32);
  const prev = Buffer.from(parts[1], 'hex');
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

function validEmail(email) {
  return typeof email === 'string' && email.length < 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    plan: row.plan,
    xp: row.xp
  };
}

function officialPlan(plan) {
  return plan === 'plus' || plan === 'classroom';
}

function stateFor(userId) {
  const user = db.prepare('SELECT id, email, name, role, plan, xp FROM users WHERE id = ?').get(userId);
  const solved = db.prepare('SELECT activity_id FROM progress WHERE user_id = ?').all(userId).map(function (row) { return row.activity_id; });
  const days = db.prepare('SELECT day FROM activity_days WHERE user_id = ? ORDER BY day').all(userId).map(function (row) { return row.day; });
  const certificates = db.prepare('SELECT level_id, title, issued_at FROM certificates WHERE user_id = ?').all(userId).map(function (row) {
    return {
      levelId: row.level_id,
      title: row.title,
      issuedAt: row.issued_at,
      official: officialPlan(user.plan)
    };
  });
  return {
    user: publicUser(user),
    xp: user.xp,
    solved: solved,
    days: days,
    streak: streakCount(days),
    certificates: certificates
  };
}

function issueCertificate(userId, activityId) {
  if (!String(activityId).startsWith('lvl:')) return;
  const level = levelById(String(activityId).slice(4));
  if (!level) return;
  db.prepare(`
    INSERT OR IGNORE INTO certificates (id, user_id, level_id, title, issued_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(randomUUID(), userId, level.id, level.name, nowIso());
}

function applySync(userId, body) {
  const existing = db.prepare('SELECT activity_id FROM progress WHERE user_id = ?').all(userId).map(function (row) { return row.activity_id; });
  const accepted = acceptProgress(activities, body || {}, existing, dayKey(new Date()));
  const insert = db.prepare('INSERT INTO progress (user_id, activity_id, xp, created_at) VALUES (?, ?, ?, ?)');
  const addXp = db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?');
  const addDay = db.prepare('INSERT OR IGNORE INTO activity_days (user_id, day) VALUES (?, ?)');
  const stamp = nowIso();

  db.exec('BEGIN');
  try {
    accepted.grants.forEach(function (grant) {
      insert.run(userId, grant.id, grant.xp, stamp);
      addXp.run(grant.xp, userId);
      issueCertificate(userId, grant.id);
    });
    accepted.days.forEach(function (day) { addDay.run(userId, day); });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return stateFor(userId);
}

function daysByUser(userIds) {
  const grouped = {};
  userIds.forEach(function (id) { grouped[id] = []; });
  if (!userIds.length) return grouped;
  const marks = userIds.map(function () { return '?'; }).join(',');
  db.prepare('SELECT user_id, day FROM activity_days WHERE user_id IN (' + marks + ')').all(...userIds).forEach(function (row) {
    grouped[row.user_id].push(row.day);
  });
  return grouped;
}

function countsByUser(table, userIds) {
  const grouped = {};
  userIds.forEach(function (id) { grouped[id] = 0; });
  if (!userIds.length) return grouped;
  const marks = userIds.map(function () { return '?'; }).join(',');
  db.prepare('SELECT user_id, COUNT(*) AS n FROM ' + table + ' WHERE user_id IN (' + marks + ') GROUP BY user_id').all(...userIds).forEach(function (row) {
    grouped[row.user_id] = row.n;
  });
  return grouped;
}

function readUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  return db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.plan, u.xp
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token) || null;
}

function requireUser(req, res, next) {
  const user = readUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  req.user = user;
  next();
}

function classLimit(user) {
  if (user.plan === 'classroom') return 20;
  if (user.role === 'teacher') return 1;
  return 0;
}

function studentCap(owner) {
  return owner.plan === 'classroom' ? 40 : 8;
}

app.get('/api/health', function (_req, res) {
  res.json({ ok: true });
});

app.get('/api/catalog', function (_req, res) {
  res.json({ levels: LEVELS, projects: PROJECTS, sets: PROJECT_SETS, plans: PLANS });
});

app.get('/api/plans', function (_req, res) {
  res.json({ plans: PLANS });
});

app.post('/api/auth/register', function (req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const name = String(req.body.name || '').trim();
  const password = String(req.body.password || '');
  const role = req.body.role === 'teacher' ? 'teacher' : 'student';
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email' });
  if (name.length < 1 || name.length > 40) return res.status(400).json({ error: 'Name must be 1 to 40 characters' });
  if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be 8 to 72 characters' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'That email is already registered' });
  }
  const id = randomUUID();
  const token = randomBytes(32).toString('hex');
  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, role, plan, xp, created_at)
    VALUES (?, ?, ?, ?, ?, 'free', 0, ?)
  `).run(id, email, name, hashPassword(password), role, nowIso());
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, id, nowIso());
  res.status(201).json({ token: token, state: stateFor(id) });
});

app.post('/api/auth/login', function (req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'Email or password is wrong' });
  }
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, row.id, nowIso());
  res.json({ token: token, state: stateFor(row.id) });
});

app.post('/api/auth/logout', requireUser, function (req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ ok: true });
});

app.get('/api/me', requireUser, function (req, res) {
  res.json(stateFor(req.user.id));
});

app.patch('/api/me', requireUser, function (req, res) {
  const name = String(req.body.name || '').trim();
  if (name.length < 1 || name.length > 40) return res.status(400).json({ error: 'Name must be 1 to 40 characters' });
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
  res.json(stateFor(req.user.id));
});

app.get('/api/progress', requireUser, function (req, res) {
  res.json(stateFor(req.user.id));
});

app.post('/api/progress/sync', requireUser, function (req, res) {
  res.json(applySync(req.user.id, req.body || {}));
});

app.get('/api/leaderboard', function (req, res) {
  const me = readUser(req);
  const rows = db.prepare('SELECT id, name, xp, plan FROM users ORDER BY xp DESC, name ASC LIMIT 50').all();
  const days = daysByUser(rows.map(function (row) { return row.id; }));
  const board = rows.map(function (row, index) {
    return {
      rank: index + 1,
      name: row.name,
      xp: row.xp,
      streak: streakCount(days[row.id]),
      plan: row.plan,
      you: Boolean(me && me.id === row.id)
    };
  });
  res.json({ leaders: board });
});

app.get('/api/classes', requireUser, function (req, res) {
  const teaching = db.prepare(`
    SELECT id, name, join_code, created_at FROM classrooms WHERE teacher_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  const enrolled = db.prepare(`
    SELECT c.id, c.name, c.join_code, e.joined_at
    FROM enrollments e
    JOIN classrooms c ON c.id = e.classroom_id
    WHERE e.user_id = ?
    ORDER BY e.joined_at DESC
  `).all(req.user.id);
  res.json({
    teaching: teaching,
    enrolled: enrolled,
    classLimit: classLimit(req.user),
    plan: req.user.plan,
    role: req.user.role
  });
});

app.post('/api/classes', requireUser, function (req, res) {
  const name = String(req.body.name || '').trim();
  if (name.length < 1 || name.length > 60) return res.status(400).json({ error: 'Class name must be 1 to 60 characters' });
  const owned = db.prepare('SELECT COUNT(*) AS n FROM classrooms WHERE teacher_id = ?').get(req.user.id).n;
  const limit = classLimit(req.user);
  if (owned >= limit) {
    return res.status(402).json({ error: 'Classroom plan is required to open another class' });
  }
  const id = randomUUID();
  const joinCode = randomBytes(3).toString('hex').toUpperCase();
  db.prepare(`
    INSERT INTO classrooms (id, teacher_id, name, join_code, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user.id, name, joinCode, nowIso());
  res.status(201).json({ id: id, name: name, joinCode: joinCode });
});

app.post('/api/classes/join', requireUser, function (req, res) {
  const code = String(req.body.code || '').trim().toUpperCase();
  const classroom = db.prepare('SELECT * FROM classrooms WHERE join_code = ?').get(code);
  if (!classroom) return res.status(404).json({ error: 'No class uses that code' });
  if (classroom.teacher_id === req.user.id) return res.status(400).json({ error: 'You already teach this class' });
  const owner = db.prepare('SELECT plan FROM users WHERE id = ?').get(classroom.teacher_id);
  const count = db.prepare('SELECT COUNT(*) AS n FROM enrollments WHERE classroom_id = ?').get(classroom.id).n;
  if (count >= studentCap(owner)) return res.status(403).json({ error: 'This class is full' });
  db.prepare('INSERT OR IGNORE INTO enrollments (classroom_id, user_id, joined_at) VALUES (?, ?, ?)').run(classroom.id, req.user.id, nowIso());
  res.json({ id: classroom.id, name: classroom.name });
});

app.get('/api/classes/:id', requireUser, function (req, res) {
  const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id);
  if (!classroom) return res.status(404).json({ error: 'Class not found' });
  const teaching = classroom.teacher_id === req.user.id;
  const enrolled = db.prepare('SELECT 1 FROM enrollments WHERE classroom_id = ? AND user_id = ?').get(classroom.id, req.user.id);
  if (!teaching && !enrolled) return res.status(403).json({ error: 'You are not in this class' });
  if (!teaching) return res.json({ id: classroom.id, name: classroom.name, joinCode: classroom.join_code, roster: null });
  const students = db.prepare(`
    SELECT u.id, u.name, u.xp, u.plan
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    WHERE e.classroom_id = ?
    ORDER BY u.xp DESC, u.name ASC
  `).all(classroom.id);
  const ids = students.map(function (student) { return student.id; });
  const days = daysByUser(ids);
  const solved = countsByUser('progress', ids);
  const certificates = countsByUser('certificates', ids);
  const roster = students.map(function (student) {
    return {
      name: student.name,
      xp: student.xp,
      streak: streakCount(days[student.id]),
      solved: solved[student.id],
      certificates: certificates[student.id],
      plan: student.plan
    };
  });
  res.json({ id: classroom.id, name: classroom.name, joinCode: classroom.join_code, roster: roster });
});

app.get('/api/billing/invoices', requireUser, function (req, res) {
  const invoices = db.prepare(`
    SELECT id, plan_id, amount_cents, status, reference, created_at
    FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.user.id);
  res.json({ plan: req.user.plan, invoices: invoices });
});

app.post('/api/billing/checkout', requireUser, function (req, res) {
  const plan = planById(String(req.body.planId || ''));
  if (!plan) return res.status(400).json({ error: 'Unknown plan' });
  if (plan.id === 'free') {
    db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(req.user.id);
    return res.json({ plan: 'free', status: 'active' });
  }
  const id = randomUUID();
  const reference = 'LAB-' + randomBytes(4).toString('hex').toUpperCase();
  db.prepare(`
    INSERT INTO invoices (id, user_id, plan_id, amount_cents, status, reference, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `).run(id, req.user.id, plan.id, plan.priceCents, reference, nowIso());
  if (process.env.BILLING_DEMO === '1') {
    activateInvoice(reference);
    return res.json({ reference: reference, amountCents: plan.priceCents, status: 'paid', plan: plan.id });
  }
  res.status(201).json({
    reference: reference,
    amountCents: plan.priceCents,
    status: 'pending',
    plan: plan.id
  });
});

function activateInvoice(reference) {
  const invoice = db.prepare('SELECT * FROM invoices WHERE reference = ?').get(reference);
  if (!invoice || invoice.status === 'paid') return invoice;
  db.exec('BEGIN');
  try {
    db.prepare("UPDATE invoices SET status = 'paid' WHERE id = ?").run(invoice.id);
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, plan_id, status, created_at)
      VALUES (?, ?, ?, 'active', ?)
    `).run(randomUUID(), invoice.user_id, invoice.plan_id, nowIso());
    const role = invoice.plan_id === 'classroom' ? 'teacher' : null;
    if (role) {
      db.prepare('UPDATE users SET plan = ?, role = ? WHERE id = ?').run(invoice.plan_id, role, invoice.user_id);
    } else {
      db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(invoice.plan_id, invoice.user_id);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id);
}

app.post('/api/billing/confirm', function (req, res) {
  const secret = process.env.BILLING_WEBHOOK_SECRET || '';
  if (!secret) return res.status(503).json({ error: 'Billing webhook is not configured' });
  if (req.headers['x-billing-secret'] !== secret) return res.status(401).json({ error: 'Unauthorized' });
  const reference = String(req.body.reference || '').trim();
  const invoice = activateInvoice(reference);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ reference: invoice.reference, status: invoice.status, plan: invoice.plan_id });
});

const simParts = [
  'js/sim/workspace.js',
  'js/sim/breadboard.js',
  'js/sim/transpile.js',
  'js/sim/clock.js',
  'js/sim/signals.js',
  'js/sim/chrome.js',
  'js/sim/pins.js',
  'js/sim/examples.js'
];

function simSource() {
  return simParts.map(function (file) {
    return readFileSync(path.join(root, file), 'utf8');
  }).join('\n');
}

writeFileSync(path.join(root, 'js/sim/simulator.js'), simSource());

app.get('/js/sim/simulator.js', function (_req, res) {
  res.set('Cache-Control', 'no-cache');
  res.type('application/javascript').send(simSource());
});

app.use(function (req, res, next) {
  if (/^\/(server|node_modules)(\/|$)/.test(req.path)) return res.status(404).end();
  next();
});

app.use(express.static(root, { index: 'index.html', dotfiles: 'ignore' }));

const port = Number(process.env.PORT || 8080);
app.listen(port, function () {
  console.log('Arduino Lab listening on ' + port);
});
