//uses the window controls from electron, or does nothing in a normal browser
const shell = window.floatie || {
  setMode() {}, moveTo() {}, showMenu() {}, onBlur() {},
};

//sets the name tasks are saved under
const STORE_KEY = 'todo-ball-v2';
//sets the only categories you can pick
const CATS = ['work', 'study', 'life'];

//turns a date into text like 2026-11-23
const dayKey = (d = new Date()) => {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
//turns text like 2026-11-23 back into a date
const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
//moves a date forward or back by some days
const shiftDay = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return dayKey(d); };
//finds the monday of the week a date is in
const weekOf = (k) => { const d = fromKey(k); const back = (d.getDay() + 6) % 7; d.setDate(d.getDate() - back); return dayKey(d); };
//writes a date like November 23, Monday
const prettyDay = (k) => {
  const d = fromKey(k);
  return `${d.toLocaleDateString('en-GB', { month: 'long' })} ${d.getDate()}, ${d.toLocaleDateString('en-GB', { weekday: 'long' })}`;
};
//writes a week like Nov 23 – Nov 29
const prettyWeek = (k) => {
  const f = (d) => `${d.toLocaleDateString('en-GB', { month: 'short' })} ${d.getDate()}`;
  return `${f(fromKey(k))} – ${f(fromKey(shiftDay(k, 6)))}`;
};

//loads saved tasks, or starts with a few examples
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.tasks)) return s;
  } catch {}
  //brings over tasks from the old version as daily tasks
  try {
    const old = JSON.parse(localStorage.getItem('todo-ball-v1'));
    if (old && Array.isArray(old.tasks)) {
      return {
        lastCat: CATS.includes(old.lastCat) ? old.lastCat : 'life',
        tasks: old.tasks.map((t) => ({ ...t, scope: 'day', cat: CATS.includes(t.cat) ? t.cat : 'life' })),
      };
    }
  } catch {}
  const t = dayKey(), w = weekOf(t);
  const mk = (text, cat, scope) => ({ id: crypto.randomUUID(), text, cat, status: 'todo', scope, date: scope === 'week' ? w : t });
  return {
    lastCat: 'life',
    tasks: [
      mk('weekly report', 'work', 'day'),
      mk('get groceries', 'life', 'day'),
      mk('hw 6', 'study', 'day'),
      mk('prep client deck', 'work', 'week'),
      mk('gym 3 times', 'life', 'week'),
    ],
  };
}
let state = load();
//saves tasks on your mac
const save = () => localStorage.setItem(STORE_KEY, JSON.stringify(state));

//keeps track of what you're looking at
let today = dayKey();
let thisWeek = weekOf(today);
let view = 'daily';
let viewDay = today;
let viewWeek = thisWeek;
let tab = 'todo';

//moves unfinished tasks from past days to today and past weeks to this week
function rollOver() {
  today = dayKey();
  thisWeek = weekOf(today);
  let changed = false;
  for (const t of state.tasks) {
    if (!CATS.includes(t.cat)) { t.cat = 'life'; changed = true; }
    const open = t.status === 'todo' || t.status === 'pending';
    if (!open) continue;
    if (t.scope === 'day' && t.date < today) { t.date = today; changed = true; }
    if (t.scope === 'week' && t.date < thisWeek) { t.date = thisWeek; changed = true; }
  }
  if (changed) save();
}

//grabs the parts of the page we change
const $ = (id) => document.getElementById(id);
const ball = $('ball'), ballCount = $('ball-count'), ballLabel = $('ball-label');
const list = $('list'), dateLabel = $('date-label');
const addForm = $('add'), addText = $('add-text'), addCat = $('add-cat');
const progress = $('progress'), progressFill = $('progress-fill'), progressText = $('progress-text');

//gets the tasks for the day or week on screen
function shownTasks() {
  return view === 'daily'
    ? state.tasks.filter((t) => t.scope === 'day' && t.date === viewDay)
    : state.tasks.filter((t) => t.scope === 'week' && t.date === viewWeek);
}

//redraws everything
function render() {
  //counts today's daily tasks still left for the ball
  const left = state.tasks.filter((t) => t.scope === 'day' && t.date === today && (t.status === 'todo' || t.status === 'pending')).length;
  ballCount.textContent = left === 0 ? '✓' : left;
  ballLabel.textContent = left === 0 ? 'all done' : 'left';
  ball.classList.toggle('done', left === 0);

  if (document.body.classList.contains('mode-ball')) return;

  //highlights daily or weekly
  document.querySelectorAll('#view-switch button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));

  //shows the date or the week
  if (view === 'daily') {
    dateLabel.textContent = prettyDay(viewDay) + (viewDay === today ? '' : '  ↩');
  } else {
    dateLabel.textContent = prettyWeek(viewWeek) + (viewWeek === thisWeek ? '' : '  ↩');
  }
  addText.placeholder = view === 'daily' ? 'add a task for today…' : 'add a task for this week…';

  const tasks = shownTasks();

  //shows the weekly progress bar
  progress.hidden = view !== 'weekly';
  if (view === 'weekly') {
    const counted = tasks.filter((t) => t.status !== 'cancelled');
    const done = counted.filter((t) => t.status === 'completed').length;
    progressFill.style.width = counted.length ? `${(done / counted.length) * 100}%` : '0%';
    progressText.textContent = `${done} / ${counted.length} done`;
  }

  //shows how many tasks are in each tab
  document.querySelectorAll('#tabs button').forEach((b) => {
    const n = tasks.filter((t) => t.status === b.dataset.tab).length;
    b.classList.toggle('active', b.dataset.tab === tab);
    b.textContent = b.dataset.label;
    if (n) { const s = document.createElement('span'); s.className = 'n'; s.textContent = n; b.append(s); }
  });

  //picks the last category you used
  addCat.value = state.lastCat;

  //draws the list
  list.innerHTML = '';
  const shown = tasks.filter((t) => t.status === tab);

  //shows a message when the tab is empty
  if (!shown.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = {
      todo: 'nothing to do ✿\nadd a task below',
      pending: 'nothing on hold',
      completed: 'nothing finished yet',
      cancelled: 'nothing cancelled',
    }[tab];
    list.append(e);
    return;
  }

  //groups tasks under work, study and life
  for (const cat of CATS) {
    const items = shown.filter((t) => t.cat === cat);
    if (!items.length) continue;
    const g = document.createElement('div');
    g.className = 'group';
    const h = document.createElement('h3');
    h.textContent = cat;
    g.append(h);
    items.forEach((t) => g.append(taskRow(t)));
    list.append(g);
  }
}

//builds one task row
function taskRow(t) {
  const row = document.createElement('div');
  row.className = `task status-${t.status}`;

  //ticks a task off or unticks it
  const check = document.createElement('button');
  check.className = 'check';
  check.title = t.status === 'completed' ? 'Mark not done' : 'Mark done';
  check.onclick = () => setStatus(t, t.status === 'completed' || t.status === 'cancelled' ? 'todo' : 'completed');

  //shows the task text
  const text = document.createElement('span');
  text.className = 'text';
  text.textContent = t.text;
  text.title = 'Double-click to edit';
  text.ondblclick = () => editText(t, text);

  //adds the small buttons that show on hover
  const actions = document.createElement('div');
  actions.className = 'actions';
  const act = (label, title, fn) => {
    const b = document.createElement('button');
    b.textContent = label; b.title = title; b.onclick = fn;
    actions.append(b);
  };
  if (t.status === 'todo') {
    //moves a task to pending
    act('‖', 'Move to pending', () => setStatus(t, 'pending'));
    //pushes a task to tomorrow or next week
    act('↷', t.scope === 'day' ? 'Move to tomorrow' : 'Move to next week', () => {
      t.date = shiftDay(t.date, t.scope === 'day' ? 1 : 7); save(); render();
    });
    //cancels a task
    act('×', 'Cancel', () => setStatus(t, 'cancelled'));
  } else if (t.status === 'pending') {
    //moves a task back to to-do
    act('↺', 'Back to to-do', () => setStatus(t, 'todo'));
    //cancels a task
    act('×', 'Cancel', () => setStatus(t, 'cancelled'));
  } else {
    //moves a task back to to-do
    act('↺', 'Back to to-do', () => setStatus(t, 'todo'));
    //deletes a task
    act('⌫', 'Delete', () => { state.tasks = state.tasks.filter((x) => x !== t); save(); render(); });
  }

  row.append(check, text, actions);
  return row;
}

//changes a task's status
function setStatus(t, status) {
  t.status = status;
  save(); render();
}

//lets you edit a task's text
function editText(t, el) {
  el.contentEditable = 'true';
  el.focus();
  document.getSelection().selectAllChildren(el);
  //saves or cancels the edit
  const finish = (keep) => {
    el.contentEditable = 'false';
    el.onblur = el.onkeydown = null;
    const v = el.textContent.trim();
    if (keep) {
      if (v) t.text = v;
      else state.tasks = state.tasks.filter((x) => x !== t);
      save();
    }
    render();
  };
  el.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
  };
  el.onblur = () => finish(true);
}

//adds a new task
addForm.onsubmit = (e) => {
  e.preventDefault();
  let text = addText.value.trim();
  if (!text) return;
  let cat = addCat.value;
  //lets you type #work, #study or #life to pick the category
  const m = text.match(/(^|\s)#(work|study|life)\b/i);
  if (m) {
    cat = m[2].toLowerCase();
    text = text.replace(m[0], ' ').replace(/\s+/g, ' ').trim();
    if (!text) return;
  }
  state.lastCat = cat;
  state.tasks.push({
    id: crypto.randomUUID(), text, cat, status: 'todo',
    scope: view === 'daily' ? 'day' : 'week',
    date: view === 'daily' ? viewDay : viewWeek,
  });
  addText.value = '';
  tab = 'todo';
  save(); render();
};
//remembers the category you picked
addCat.onchange = () => { state.lastCat = addCat.value; save(); };

//opens the panel
function open() {
  rollOver();
  viewDay = today;
  viewWeek = thisWeek;
  tab = 'todo';
  document.body.className = 'mode-panel';
  shell.setMode('panel');
  render();
  setTimeout(() => addText.focus(), 60);
}
//closes the panel back into the ball
function close() {
  document.body.className = 'mode-ball';
  shell.setMode('ball');
  render();
}

//closes the panel from the – button
$('close').onclick = close;
//goes back a day or a week
$('prev').onclick = () => { if (view === 'daily') viewDay = shiftDay(viewDay, -1); else viewWeek = shiftDay(viewWeek, -7); render(); };
//goes forward a day or a week
$('next').onclick = () => { if (view === 'daily') viewDay = shiftDay(viewDay, 1); else viewWeek = shiftDay(viewWeek, 7); render(); };
//jumps back to today or this week
dateLabel.onclick = () => { viewDay = today; viewWeek = thisWeek; render(); };
//switches between daily and weekly
document.querySelectorAll('#view-switch button').forEach((b) => {
  b.onclick = () => { view = b.dataset.view; tab = 'todo'; render(); };
});
//switches tabs
document.querySelectorAll('#tabs button').forEach((b) => {
  b.dataset.label = b.textContent;
  b.onclick = () => { tab = b.dataset.tab; render(); };
});

//closes the panel when you press esc
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('mode-panel')) close();
});

//closes the panel when you click somewhere else on your mac
shell.onBlur(() => {
  setTimeout(() => {
    if (!document.hasFocus() && document.activeElement !== addCat &&
        document.body.classList.contains('mode-panel')) close();
  }, 150);
});

//shows the menu when you right-click the ball
ball.addEventListener('contextmenu', (e) => { e.preventDefault(); shell.showMenu(); });

//lets you drag something to move the window, and click it if you didn't drag
function draggable(el, onClick) {
  let start = null, moved = false, raf = 0;
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || (el !== ball && e.target.closest('button'))) return;
    start = { sx: e.screenX, sy: e.screenY, wx: window.screenX, wy: window.screenY };
    moved = false;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.screenX - start.sx, dy = e.screenY - start.sy;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => shell.moveTo(start.wx + dx, start.wy + dy));
  });
  const end = (e) => {
    if (!start) return;
    start = null;
    if (!moved && onClick && e.type === 'pointerup') onClick();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
//drags the ball, or opens it on click
draggable(ball, open);
//drags the panel by its top bar
draggable($('panel-top'));
draggable($('panel-head'));

//checks every minute if it's a new day
setInterval(() => {
  if (dayKey() !== today) {
    rollOver();
    if (viewDay < today) viewDay = today;
    if (viewWeek < thisWeek) viewWeek = thisWeek;
    render();
  }
}, 60 * 1000);

//starts the app
rollOver();
render();
