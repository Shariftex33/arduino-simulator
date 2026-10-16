const KIND = { concept: ['Cpt-', 5], predict: ['Pred-', 15], sim: ['Sim-', 25] };

export function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

export function streakCount(days, today) {
  const set = new Set(days || []);
  const cursor = today ? new Date(today + 'T12:00:00') : new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

export function parseActivities(source) {
  const xp = {};
  for (const match of source.matchAll(/\{\s*id:\s*'([^']+)',\s*xp:\s*(\d+)/g)) {
    xp[match[1]] = Number(match[2]);
  }
  for (const match of source.matchAll(/\b(concept|predict|sim)\('([^']+)'/g)) {
    const spec = KIND[match[1]];
    xp[spec[0] + match[2]] = spec[1];
  }

  const marks = [];
  const markRe = /\{\s*(?:level:\s*'([^']+)',\s*)?id:\s*'([^']+)',\s*name:/g;
  let mark;
  while ((mark = markRe.exec(source))) {
    marks.push({ level: mark[1] || '', id: mark[2], index: mark.index });
  }

  const categories = {};
  const levels = {};
  marks.forEach(function (cat, index) {
    const end = index + 1 < marks.length ? marks[index + 1].index : source.length;
    const slice = source.slice(cat.index, end);
    const found = [];
    for (const call of slice.matchAll(/\b(concept|predict|sim)\('([^']+)'/g)) {
      found.push({ index: call.index, id: KIND[call[1]][0] + call[2] });
    }
    for (const pick of slice.matchAll(/pick\(\[([^\]]*)\]\)/g)) {
      for (const id of pick[1].matchAll(/'([^']+)'/g)) {
        found.push({ index: pick.index + id.index, id: id[1] });
      }
    }
    for (const item of slice.matchAll(/\{\s*id:\s*'([^']+)',\s*xp:\s*\d+/g)) {
      found.push({ index: item.index, id: item[1] });
    }
    found.sort(function (a, b) { return a.index - b.index; });
    const members = [];
    const seen = new Set();
    found.forEach(function (row) {
      if (!row.id || seen.has(row.id) || xp[row.id] == null) return;
      seen.add(row.id);
      members.push(row.id);
    });
    categories[cat.id] = members;
    if (cat.level) {
      if (!levels[cat.level]) levels[cat.level] = [];
      levels[cat.level].push(cat.id);
    }
  });
  return { xp: xp, categories: categories, levels: levels };
}

function validId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(id);
}

function categoryDone(catalog, catId, solved) {
  const members = catalog.categories[catId];
  return Array.isArray(members) && members.length > 0 && members.every(function (id) { return solved.has(id); });
}

export function acceptProgress(catalog, body, alreadyIds, today) {
  const solved = new Set(alreadyIds || []);
  const grants = [];
  const incoming = [];
  const items = Array.isArray(body && body.items) ? body.items.slice(0, 200) : [];
  const solvedIds = Array.isArray(body && body.solved) ? body.solved.slice(0, 2000) : [];
  items.forEach(function (item) {
    if (item && validId(item.id)) incoming.push(item.id);
  });
  solvedIds.forEach(function (id) {
    if (validId(id)) incoming.push(id);
  });

  const plain = [];
  const cats = [];
  const levelIds = [];
  incoming.forEach(function (id) {
    if (solved.has(id)) return;
    if (id.startsWith('cat:')) cats.push(id);
    else if (id.startsWith('lvl:')) levelIds.push(id);
    else plain.push(id);
  });

  plain.forEach(function (id) {
    const points = catalog.xp[id];
    if (!points || solved.has(id)) return;
    solved.add(id);
    grants.push({ id: id, xp: points });
  });
  cats.forEach(function (id) {
    const catId = id.slice(4);
    if (solved.has(id) || !categoryDone(catalog, catId, solved)) return;
    solved.add(id);
    grants.push({ id: id, xp: 100 });
  });
  levelIds.forEach(function (id) {
    const levelId = id.slice(4);
    const catsInLevel = catalog.levels[levelId];
    if (!catsInLevel || !catsInLevel.length || solved.has(id)) return;
    const done = catsInLevel.every(function (catId) { return categoryDone(catalog, catId, solved); });
    if (!done) return;
    solved.add(id);
    grants.push({ id: id, xp: 250 });
  });

  const limit = today || dayKey(new Date());
  const days = [];
  const seenDays = new Set();
  const rawDays = Array.isArray(body && body.days) ? body.days.slice(0, 4000) : [];
  rawDays.forEach(function (day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day > limit || seenDays.has(day)) return;
    seenDays.add(day);
    days.push(day);
  });
  return { grants: grants, days: days };
}
