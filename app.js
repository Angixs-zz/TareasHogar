import { START_DATE, PEOPLE, TASKS as DEFAULT_TASKS, person, addDays, nextWeekend, generateSchedule, scheduleThrough, calendarFile, suggestOrder, validateTasks } from './schedule.js?v=20261026-3t';

const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = 'tareas-hogar-tareas';
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const activeWeekend = nextWeekend(today);
const activeMonth = activeWeekend.slice(0, 7);
let visibleMonth = activeMonth;
let selectedPerson = 'all';
let theme = document.documentElement.dataset.theme;

const ICONS = {
  stairs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h6v-6h6V8h6M3 20v-5h6V9h6V3h6"/></svg>',
  bath: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3ZM5 12V5a2 2 0 0 1 4 0v1M7 6h4M6 20v2m12-2v2M2 12h20"/></svg>',
  broom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3 10.5 11"/><path d="M7 11h6l2 6H5l2-6Z"/><path d="M8 17v3m4-3v3m4-3v3"/></svg>',
  kitchen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-5ZM7 10V7a5 5 0 0 1 10 0v3M2 10h20M9 3v2m6-2v2"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3m-8 0 1 14h8l1-14M10 11v6m4-6v6"/></svg>',
  laundry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="14" r="4"/><path d="M8 7h.01M12 7h.01M16 7h.01"/></svg>',
  dishes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="2"/><path d="M4 21c3-1 5-3 6-6"/></svg>',
  plants: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-8m0 2c-5 0-7-3-7-7 5 0 7 3 7 7Zm0-2c5 0 7-3 7-7-5 0-7 3-7 7Zm0-8V3"/></svg>',
  generic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.6 4.9L18.5 9.5l-4.9 1.6L12 16l-1.6-4.9L5.5 9.5l4.9-1.6L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></svg>',
};
const ICON_NAMES = Object.keys(ICONS);
const EMOJIS = { stairs: '🧹', bath: '🛁', broom: '🧹', kitchen: '🍳', trash: '🗑️', laundry: '🧺', dishes: '🍽️', plants: '🪴', generic: '✓' };

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const dateFormat = (iso, options) => new Intl.DateTimeFormat('es-MX', { ...options, timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
const capitalize = (text) => text[0].toUpperCase() + text.slice(1);
const shortDate = (iso) => dateFormat(iso, { day: 'numeric', month: 'short' });
const avatar = (id, large = false) => `<span class="avatar ${person(id).color}${large ? ' large' : ''}" aria-hidden="true">${person(id).initials}</span>`;
const weekendRange = (iso) => {
  const sunday = addDays(iso, 1);
  if (iso.slice(0, 7) !== sunday.slice(0, 7)) return `${shortDate(iso)} – ${shortDate(sunday)}`;
  return `${Number(iso.slice(8))} y ${dateFormat(sunday, { day: 'numeric', month: 'long' })}`;
};
const taskIcon = (task) => ICONS[task.icon] ?? ICONS.generic;
const taskEmoji = (task) => EMOJIS[task.icon] ?? EMOJIS.generic;
const findTask = (id) => tasks.find((task) => task.id === id);

let customTasks = readCustomTasks();
let tasks = buildTasks();
let upcomingWeeks = [];

function readCustomTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveCustomTasks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(customTasks)); } catch {}
}

function normalizeCustomTask(task) {
  if (!task || typeof task !== 'object' || typeof task.id !== 'string' || typeof task.name !== 'string') return null;
  const order = Array.isArray(task.order) ? [...new Set(task.order)].filter((id) => PEOPLE.some((item) => item.id === id)) : [];
  if (order.length === 0) return null;
  return {
    id: task.id,
    name: task.name.slice(0, 60),
    short: String(task.short || task.name).slice(0, 40),
    description: String(task.description || 'Tarea de la casa').slice(0, 140),
    icon: ICON_NAMES.includes(task.icon) ? task.icon : 'generic',
    order,
    custom: true,
  };
}

function buildTasks() {
  const accepted = [];
  for (const candidate of customTasks) {
    const task = normalizeCustomTask(candidate);
    if (!task) continue;
    if (DEFAULT_TASKS.some((item) => item.id === task.id)) continue;
    if (DEFAULT_TASKS.some((item) => item.name.toLowerCase() === task.name.toLowerCase())) continue;
    if (accepted.some((item) => item.id === task.id)) continue;
    if (accepted.some((item) => item.name.toLowerCase() === task.name.toLowerCase())) continue;
    try {
      validateTasks([...DEFAULT_TASKS, ...accepted, task]);
    } catch {
      continue;
    }
    accepted.push(task);
  }
  customTasks = accepted;
  return [...DEFAULT_TASKS, ...accepted];
}

function refreshUpcomingWeeks() {
  upcomingWeeks = scheduleThrough(addDays(activeWeekend, 7 * 7), tasks).slice(-8);
}

function notesForWeek(week) {
  const notes = [];
  for (const item of week.adjustments) {
    const name = person(item.postponed).name;
    const cover = person(item.advanced).name;
    const taskName = findTask(item.task)?.name ?? item.task;
    notes.push(item.to
      ? `${cover} cubre «${taskName}» por ${name}; ${name} lo hará el ${shortDate(item.to)}.`
      : `${cover} cubre «${taskName}» por ${name}; ${name} lo hará en el próximo fin de semana libre.`);
  }
  for (const item of week.completions) {
    const name = person(item.postponed).name;
    const taskName = findTask(item.task)?.name ?? item.task;
    notes.push(`${name} recupera «${taskName}» del ${shortDate(item.from)}.`);
  }
  return notes;
}

function renderUpcoming() {
  const week = scheduleThrough(activeWeekend, tasks).at(-1);
  $('#weekend-label').textContent = today < START_DATE ? 'PRIMER FIN DE SEMANA' : 'ESTE FIN DE SEMANA';
  $('#upcoming-heading').textContent = `${weekendRange(week.date)} de ${addDays(week.date, 1).slice(0, 4)}`;
  $('#upcoming-tasks').innerHTML = tasks.map((task) => {
    const personId = week.tasks[task.id];
    return `<article class="task-card"><div class="task-icon ${task.icon}" aria-hidden="true">${taskIcon(task)}</div><div class="task-copy"><p class="task-title">${escapeHtml(task.name)}</p><div class="task-name">${escapeHtml(person(personId).name)}</div><p class="task-description">${escapeHtml(task.description)}</p></div>${avatar(personId, true)}</article>`;
  }).join('');
  const notes = notesForWeek(week);
  $('#upcoming-swap').textContent = notes.length ? notes.join(' ') : 'Los turnos se actualizan automáticamente.';
}

function monthWeeks() {
  const [year, month] = visibleMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return scheduleThrough(lastDay, tasks).filter((week) => week.date.startsWith(visibleMonth));
}

function personCell(id, label, span = false) {
  return `<div class="person-cell${span ? ' span-2' : ''}" role="group" aria-label="${escapeHtml(label)}: ${escapeHtml(person(id).name)}">${avatar(id)}<div><span class="mobile-task-label">${escapeHtml(label)}</span>${escapeHtml(person(id).name)}</div></div>`;
}

function renderCalendar() {
  $('#month-label').textContent = capitalize(dateFormat(`${visibleMonth}-01`, { month: 'long', year: 'numeric' }));
  $('#previous-month').disabled = visibleMonth <= START_DATE.slice(0, 7);
  $('#next-month').disabled = visibleMonth >= '2100-12';
  $('#calendar-panel').style.setProperty('--task-cols', `repeat(${tasks.length}, minmax(0, 1fr))`);
  $('#calendar-head').innerHTML = [
    '<span>FIN DE SEMANA</span>',
    ...tasks.map((task) => `<span>${escapeHtml(task.short.toUpperCase())}</span>`),
    '<span>TURNO</span>',
  ].join('');
  const weeks = monthWeeks();
  const filtered = weeks.filter((week) => selectedPerson === 'all' || Object.values(week.tasks).includes(selectedPerson));
  $('#calendar-rows').innerHTML = filtered.length ? filtered.map((week) => {
    const isCurrent = week.date === activeWeekend;
    const isPast = addDays(week.date, 1) < today;
    const notes = notesForWeek(week);
    const cells = tasks.map((task, index) => personCell(week.tasks[task.id], task.short, tasks.length % 2 === 1 && index === tasks.length - 1)).join('');
    return `<article class="week-row${isCurrent ? ' current' : ''}${notes.length ? ' has-swap' : ''}" aria-label="Fin de semana del ${shortDate(week.date)}">
      <div class="week-date"><div class="date-tile" aria-hidden="true"><small>SÁB</small><strong>${Number(week.date.slice(8))}</strong></div><div class="date-copy"><strong>${shortDate(week.date)} – ${shortDate(addDays(week.date, 1))}</strong><small class="${isCurrent ? 'current-label' : ''}">${isCurrent ? 'Este fin de semana' : isPast ? 'Fin de semana pasado' : 'Sábado y domingo'}</small></div></div>
      ${cells}
      <div class="status-cell">${notes.length ? '<span class="status-badge"><span aria-hidden="true">⇄</span> Ajuste</span>' : 'Orden habitual'}</div>
      ${notes.length ? `<p class="swap-details">${notes.map(escapeHtml).join('<br>')}</p>` : ''}</article>`;
  }).join('') : '<p class="empty-state">No hay turnos para esta persona en este mes.</p>';
  $('#month-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'fin de semana' : 'fines de semana'}`;
  $('#download-button').disabled = filtered.length === 0;
  $('#download-status').textContent = '';
}

function moveMonth(delta) {
  const [year, month] = visibleMonth.split('-').map(Number);
  visibleMonth = new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7);
  renderCalendar();
}

function renderRotations() {
  $('#rotation-list').innerHTML = tasks.map((task) => `<p><strong>${escapeHtml(task.name)}</strong><br>${escapeHtml(task.description)}.</p><div class="rotation">${task.order.map((id) => `<span class="rotation-name">${escapeHtml(person(id).name)}</span>`).join('<span class="rotation-arrow" aria-hidden="true">→</span>')}</div>`).join('');
  $('#rules-note').textContent = `${PEOPLE.length} personas · ${tasks.length} ${tasks.length === 1 ? 'tarea' : 'tareas'} · cada fin de semana`;
  const frequencies = tasks.map((task) => `${task.name}: ${task.order.length} ${task.order.length === 1 ? 'persona' : 'personas'}`).join(' · ');
  $('#fairness-copy').textContent = `Cada tarea rota solo entre quienes participan (${frequencies}). El reparto se mide por tarea, no por suma total.`;

  const totals = Object.fromEntries(PEOPLE.map(({ id }) => [id, Object.fromEntries(tasks.map((task) => [task.id, 0]))]));
  for (const week of generateSchedule(30, tasks)) {
    for (const task of tasks) totals[week.tasks[task.id]][task.id] += 1;
  }
  const head = `<thead><tr><th scope="col">Persona</th>${tasks.map((task) => `<th scope="col">${escapeHtml(task.short)}</th>`).join('')}<th scope="col">Total</th></tr></thead>`;
  const body = `<tbody>${PEOPLE.map(({ id, name }) => {
    const total = tasks.reduce((sum, task) => sum + totals[id][task.id], 0);
    return `<tr><th scope="row"><span class="person-cell">${avatar(id)}${escapeHtml(name)}</span></th>${tasks.map((task) => `<td>${totals[id][task.id]}</td>`).join('')}<td><strong>${total}</strong></td></tr>`;
  }).join('')}</tbody>`;
  $('#balance-table').innerHTML = `<div class="balance-scroll"><table class="balance-table">${head}${body}</table></div>`;
}

function renderReminder() {
  const week = upcomingWeeks.find((item) => item.date === $('#share-weekend').value) ?? upcomingWeeks[0];
  const parts = [
    '🏡 Casa en orden',
    `Fin de semana: ${weekendRange(week.date)} de ${addDays(week.date, 1).slice(0, 4)}`,
    '',
  ];
  for (const task of tasks) {
    parts.push(`${taskEmoji(task)} ${task.name}: ${person(week.tasks[task.id]).name}`);
    parts.push(`${task.description}.`);
    parts.push('');
  }
  const notes = notesForWeek(week);
  if (notes.length) {
    parts.push(...notes.map((note) => `⇄ ${note}`));
    parts.push('');
  }
  parts.push('Pueden hacerlo el sábado o el domingo. ¡Gracias por cuidar la casa!', '', 'Todos los turnos: https://angixs-zz.github.io/TareasHogar/');
  const message = parts.join('\n');
  $('#reminder-text').value = message;
  $('#whatsapp-reminder').href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  $('#share-status').textContent = '';
}

function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

function renderNextTurns() {
  const grid = $('#next-turns-grid');
  grid.innerHTML = PEOPLE.map(({ id, name, color, initials }) => {
    const week = upcomingWeeks.find((item) => Object.values(item.tasks).includes(id));
    if (!week) return '';
    const taskId = Object.keys(week.tasks).find((key) => week.tasks[key] === id);
    const task = findTask(taskId);
    const days = daysBetween(today, week.date);
    const completion = week.completions.find((item) => item.task === taskId && item.postponed === id);
    const advanced = week.adjustments.find((item) => item.task === taskId && item.advanced === id);
    const hint = completion
      ? `Recupera su turno del ${shortDate(completion.from)}.`
      : advanced
        ? `Se adelanta para cubrir a ${person(advanced.postponed).name}.`
        : '';
    return `<article class="next-card"><span class="person-avatar ${color}" aria-hidden="true">${initials}</span>
      <span class="task-label">Próximo turno: ${escapeHtml(task.short)}</span>
      <h3>${escapeHtml(name)}</h3>
      <div class="date-big">${shortDate(week.date)}</div>
      <div class="date-copy">${days < 0 ? '¡Hoy, domingo!' : days === 0 ? '¡Hoy o mañana!' : days === 1 ? 'Mañana' : `En ${days} días`}</div>
      ${hint ? `<div class="swap-hint">${escapeHtml(hint)}</div>` : ''}
      <footer><span aria-hidden="true">${taskEmoji(task)}</span>${escapeHtml(task.name)}</footer>
    </article>`;
  }).join('');
}

function renderTaskPeopleOptions() {
  $('#task-people').innerHTML = PEOPLE.map(({ id, name }) => `<label class="person-check"><input type="checkbox" name="participants" value="${id}" checked>${avatar(id)}<span>${escapeHtml(name)}</span></label>`).join('');
}

function renderTaskList() {
  $('#task-list').innerHTML = tasks.map((task) => `<div class="task-list-row"><span class="task-icon task-icon-small ${task.icon}" aria-hidden="true">${taskIcon(task)}</span><div class="task-list-copy"><strong>${escapeHtml(task.name)}</strong><small>${escapeHtml(task.order.map((id) => person(id).name).join(' → '))}</small></div>${task.custom ? `<button type="button" class="remove-task" data-remove="${escapeHtml(task.id)}" aria-label="Quitar ${escapeHtml(task.name)}">Quitar</button>` : '<span class="default-tag">Original</span>'}</div>`).join('');
  $('#reset-tasks').hidden = customTasks.length === 0;
}

function setTaskMessage(text, kind = '') {
  const message = $('#task-message');
  message.textContent = text;
  message.dataset.kind = kind;
}

function slugify(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uniqueTaskId(name) {
  const base = `custom-${slugify(name) || 'tarea'}`;
  let id = base;
  let suffix = 2;
  while (tasks.some((task) => task.id === id)) id = `${base}-${suffix++}`;
  return id;
}

function renderAll() {
  refreshUpcomingWeeks();
  renderUpcoming();
  renderCalendar();
  renderReminder();
  renderNextTurns();
  renderRotations();
}

$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('#task-name').value.trim();
  const description = $('#task-description').value.trim();
  const icon = $('#task-icon').value;
  const participants = [...document.querySelectorAll('input[name="participants"]:checked')].map((input) => input.value);
  if (!name) return setTaskMessage('Escribe un nombre para la tarea.', 'error');
  if (tasks.some((task) => task.name.toLowerCase() === name.toLowerCase())) return setTaskMessage('Ya hay una tarea con ese nombre.', 'error');
  if (participants.length === 0) return setTaskMessage('Elige al menos una persona para la rotación.', 'error');
  const task = {
    id: uniqueTaskId(name),
    name,
    short: name,
    description: description || 'Tarea de la casa',
    icon,
    order: suggestOrder(participants, tasks.length),
    custom: true,
  };
  try {
    validateTasks([...tasks, task]);
  } catch (error) {
    return setTaskMessage(error.message, 'error');
  }
  tasks = [...tasks, task];
  customTasks = [...customTasks, task];
  saveCustomTasks();
  renderAll();
  renderTaskList();
  $('#task-form').reset();
  setTaskMessage(`«${name}» añadida. El calendario ya está recalculado.`, 'success');
});

$('#task-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  customTasks = customTasks.filter((task) => task.id !== button.dataset.remove);
  saveCustomTasks();
  tasks = buildTasks();
  renderAll();
  renderTaskList();
  setTaskMessage('Tarea quitada. El calendario ya está recalculado.', 'success');
});

$('#reset-tasks').addEventListener('click', () => {
  customTasks = [];
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  tasks = buildTasks();
  renderAll();
  renderTaskList();
  setTaskMessage('Tareas originales restauradas.', 'success');
});

for (const { id, name } of PEOPLE) $('#person-filter').add(new Option(name, id));
$('#person-filter').addEventListener('change', (event) => { selectedPerson = event.target.value; renderCalendar(); });
$('#previous-month').addEventListener('click', () => moveMonth(-1));
$('#next-month').addEventListener('click', () => moveMonth(1));
$('#today-button').addEventListener('click', () => { visibleMonth = activeMonth; renderCalendar(); });
$('#print-button').addEventListener('click', () => window.print());
$('#balance-button').addEventListener('click', () => $('#balance-dialog').showModal());
$('#tasks-button').addEventListener('click', () => {
  renderTaskList();
  setTaskMessage('');
  $('#tasks-dialog').showModal();
});
$('#close-dialog').addEventListener('click', () => $('#balance-dialog').close());
$('#close-tasks-dialog').addEventListener('click', () => $('#tasks-dialog').close());
for (const dialog of [$('#balance-dialog'), $('#tasks-dialog')]) {
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
$('#download-button').addEventListener('click', () => {
  const blob = new Blob([calendarFile(monthWeeks(), selectedPerson, tasks)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `casa-en-orden-${visibleMonth}${selectedPerson === 'all' ? '' : `-${selectedPerson}`}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('#download-status').textContent = 'Archivo preparado. Impórtalo en Google Calendar, Apple Calendar u Outlook. Es una copia de este mes, no una suscripción.';
});
$('#theme-toggle').addEventListener('click', () => {
  theme = theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('tareas-tema', theme); } catch {}
  applyTheme();
});
function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  $('#theme-toggle').querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
  $('#theme-toggle').setAttribute('aria-label', theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
  $('#theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
  $('meta[name="theme-color"]').content = theme === 'dark' ? '#1e231b' : '#f7f7f2';
}

renderTaskPeopleOptions();
refreshUpcomingWeeks();
for (const week of upcomingWeeks) {
  $('#share-weekend').add(new Option(`${weekendRange(week.date)} de ${addDays(week.date, 1).slice(0, 4)}`, week.date));
}
$('#share-weekend').addEventListener('change', renderReminder);
$('#copy-reminder').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#reminder-text').value);
    $('#share-status').textContent = '¡Copiado! Ya puedes pegarlo en el grupo.';
  } catch {
    $('#reminder-text').focus();
    $('#reminder-text').select();
    $('#share-status').textContent = 'Seleccionamos el aviso. Usa Copiar en tu dispositivo o Ctrl/Cmd + C.';
  }
});

applyTheme();
renderAll();
renderTaskList();
