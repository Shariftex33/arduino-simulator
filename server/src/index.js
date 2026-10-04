import express from 'express';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { LEVELS, PLANS, PROJECTS, PROJECT_SETS, levelById, planById } from './catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
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

function validActivity(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(id);
}

function clampXp(id, xp) {
  const n = Number(xp);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (String(id).startsWith('lvl:')) return Math.min(250, Math.floor(n));
  if (String(id).startsWith('cat:')) return Math.min(100, Math.floor(n));
  return Math.min(50, Math.floor(n));
}

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function streakCount(days) {
  const set = new Set(days || []);
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
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
  const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
  const solved = Array.isArray(body.solved) ? body.solved.slice(0, 2000) : [];
  const days = Array.isArray(body.days) ? body.days.slice(0, 4000) : [];
  const existing = new Set(
    db.prepare('SELECT activity_id FROM progress WHERE user_id = ?').all(userId).map(function (row) { return row.activity_id; })
  );
  const insert = db.prepare('INSERT INTO progress (user_id, activity_id, xp, created_at) VALUES (?, ?, ?, ?)');
  const addXp = db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?');
  const addDay = db.prepare('INSERT OR IGNORE INTO activity_days (user_id, day) VALUES (?, ?)');
  const stamp = nowIso();

  db.exec('BEGIN');
  try {
    if (existing.size === 0) {
      const imported = Math.floor(Number(body.xp) || 0);
      if (imported > 0) {
        db.prepare('UPDATE users SET xp = ? WHERE id = ? AND xp = 0').run(Math.min(imported, 500000), userId);
      }
    }
    items.forEach(function (item) {
      if (!item || !validActivity(item.id) || existing.has(item.id)) return;
      const xp = clampXp(item.id, item.xp);
      if (!xp) return;
      insert.run(userId, item.id, xp, stamp);
      addXp.run(xp, userId);
      existing.add(item.id);
      issueCertificate(userId, item.id);
    });
    solved.forEach(function (id) {
      if (!validActivity(id) || existing.has(id)) return;
      insert.run(userId, id, 0, stamp);
      existing.add(id);
      issueCertificate(userId, id);
    });
    days.forEach(function (day) {
      if (typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)) addDay.run(userId, day);
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return stateFor(userId);
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
  const board = rows.map(function (row, index) {
    const days = db.prepare('SELECT day FROM activity_days WHERE user_id = ?').all(row.id).map(function (day) { return day.day; });
    return {
      rank: index + 1,
      name: row.name,
      xp: row.xp,
      streak: streakCount(days),
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
  `).all(classroom.id).map(function (student) {
    const days = db.prepare('SELECT day FROM activity_days WHERE user_id = ?').all(student.id).map(function (row) { return row.day; });
    const solved = db.prepare('SELECT COUNT(*) AS n FROM progress WHERE user_id = ?').get(student.id).n;
    const certificates = db.prepare('SELECT COUNT(*) AS n FROM certificates WHERE user_id = ?').get(student.id).n;
    return {
      name: student.name,
      xp: student.xp,
      streak: streakCount(days),
      solved: solved,
      certificates: certificates,
      plan: student.plan
    };
  });
  res.json({ id: classroom.id, name: classroom.name, joinCode: classroom.join_code, roster: students });
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

app.use(function (req, res, next) {
  if (/^\/(server|node_modules)(\/|$)/.test(req.path)) return res.status(404).end();
  next();
});

app.use(express.static(root, { index: 'index.html', dotfiles: 'ignore' }));

const port = Number(process.env.PORT || 8080);
app.listen(port, function () {
  console.log('Arduino Lab listening on ' + port);
});
