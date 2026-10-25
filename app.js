import { START_DATE, PEOPLE, STAIRS_ORDER, BATHROOM_ORDER, person, addDays, nextWeekend, generateSchedule, scheduleThrough, calendarFile } from './schedule.js';

const $ = (selector) => document.querySelector(selector);
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const activeWeekend = nextWeekend(today);
const activeMonth = activeWeekend.slice(0, 7);
let visibleMonth = activeMonth;
let selectedPerson = 'all';
const dateFormat = (iso, options) => new Intl.DateTimeFormat('es-MX', { ...options, timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
const capitalize = (text) => text[0].toUpperCase() + text.slice(1);
const shortDate = (iso) => dateFormat(iso, { day: 'numeric', month: 'short' });
const avatar = (id, large = false) => `<span class="avatar ${person(id).color}${large ? ' large' : ''}" aria-hidden="true">${person(id).initials}</span>`;
const weekendRange = (iso) => {
  const sunday = addDays(iso, 1);
  if (iso.slice(0, 7) !== sunday.slice(0, 7)) return `${shortDate(iso)} – ${shortDate(sunday)}`;
  return `${Number(iso.slice(8))} y ${dateFormat(sunday, { day: 'numeric', month: 'long' })}`;
};
const stairsIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h6v-6h6V8h6M3 20v-5h6V9h6V3h6"/></svg>';
const bathIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3ZM5 12V5a2 2 0 0 1 4 0v1M7 6h4M6 20v2m12-2v2M2 12h20"/></svg>';

function swapExplanation(week) {
  const { swap } = week;
  if (!swap) return '';
  return week.date === swap.from
    ? `${person(swap.advanced).name} adelanta su turno de baño; ${person(swap.postponed).name} lo hará el ${shortDate(swap.to)}.`
    : `${person(swap.postponed).name} hace el baño pendiente del ${shortDate(swap.from)}; ${person(swap.advanced).name} ya lo hizo ese fin de semana.`;
}

function renderUpcoming() {
  const week = scheduleThrough(activeWeekend).at(-1);
  $('#weekend-label').textContent = today < START_DATE ? 'PRIMER FIN DE SEMANA' : 'ESTE FIN DE SEMANA';
  $('#upcoming-heading').textContent = `${weekendRange(week.date)} de ${addDays(week.date, 1).slice(0, 4)}`;
  $('#upcoming-tasks').innerHTML = [
    { id: week.stairs, title: 'Escaleras y pasillo', description: 'Barrer escaleras + trapear el pasillo de arriba', icon: stairsIcon, type: 'stairs' },
    { id: week.bathroom, title: 'Lavar el baño', description: 'Dejar el baño limpio para todos', icon: bathIcon, type: 'bath' },
  ].map((task) => `<article class="task-card"><div class="task-icon ${task.type}" aria-hidden="true">${task.icon}</div><div class="task-copy"><p class="task-title">${task.title}</p><div class="task-name">${person(task.id).name}</div><p class="task-description">${task.description}</p></div>${avatar(task.id, true)}</article>`).join('');
  if (week.swap) $('#upcoming-swap').textContent = swapExplanation(week);
}

function monthWeeks() {
  const [year, month] = visibleMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return scheduleThrough(lastDay)
    .filter((week) => week.date.startsWith(visibleMonth));
}

function personCell(id, task) {
  return `<div class="person-cell" role="group" aria-label="${task}: ${person(id).name}">${avatar(id)}<div><span class="mobile-task-label">${task}</span>${person(id).name}</div></div>`;
}

function renderCalendar() {
  $('#month-label').textContent = capitalize(dateFormat(`${visibleMonth}-01`, { month: 'long', year: 'numeric' }));
  $('#previous-month').disabled = visibleMonth <= START_DATE.slice(0, 7);
  $('#next-month').disabled = visibleMonth >= '2100-12';
  const weeks = monthWeeks();
  const filtered = weeks.filter((week) => selectedPerson === 'all' || week.stairs === selectedPerson || week.bathroom === selectedPerson);
  $('#calendar-rows').innerHTML = filtered.length ? filtered.map((week) => {
    const isCurrent = week.date === activeWeekend;
    const isPast = addDays(week.date, 1) < today;
    return `<article class="week-row${isCurrent ? ' current' : ''}${week.swap ? ' has-swap' : ''}" aria-label="Fin de semana del ${shortDate(week.date)}">
      <div class="week-date"><div class="date-tile" aria-hidden="true"><small>SÁB</small><strong>${Number(week.date.slice(8))}</strong></div><div class="date-copy"><strong>${shortDate(week.date)} – ${shortDate(addDays(week.date, 1))}</strong><small class="${isCurrent ? 'current-label' : ''}">${isCurrent ? 'Este fin de semana' : isPast ? 'Fin de semana pasado' : 'Sábado y domingo'}</small></div></div>
      ${personCell(week.stairs, 'Escaleras y pasillo')}${personCell(week.bathroom, 'Baño')}
      <div class="status-cell">${week.swap ? '<span class="status-badge"><span aria-hidden="true">⇄</span> Intercambio</span>' : 'Orden habitual'}</div>
      ${week.swap ? `<p class="swap-details">${swapExplanation(week)}</p>` : ''}</article>`;
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
  for (const [selector, order] of [['#stairs-rotation', STAIRS_ORDER], ['#bathroom-rotation', BATHROOM_ORDER]]) {
    $(selector).innerHTML = order.map((id) => `<span class="rotation-name">${person(id).name}</span>`).join('<span class="rotation-arrow" aria-hidden="true">→</span>');
  }
  const totals = Object.fromEntries(PEOPLE.map(({ id }) => [id, { stairs: 0, bathroom: 0 }]));
  for (const week of generateSchedule(30)) { totals[week.stairs].stairs++; totals[week.bathroom].bathroom++; }
  $('#balance-table').innerHTML = `<table class="balance-table"><thead><tr><th scope="col">Persona</th><th scope="col">Escaleras</th><th scope="col">Baño</th><th scope="col">Total</th></tr></thead><tbody>${PEOPLE.map(({ id, name }) => `<tr><th scope="row"><span class="person-cell">${avatar(id)}${name}</span></th><td>${totals[id].stairs}</td><td>${totals[id].bathroom}</td><td><strong>${totals[id].stairs + totals[id].bathroom}</strong></td></tr>`).join('')}</tbody></table>`;
}

for (const { id, name } of PEOPLE) $('#person-filter').add(new Option(name, id));
$('#person-filter').addEventListener('change', (event) => { selectedPerson = event.target.value; renderCalendar(); });
$('#previous-month').addEventListener('click', () => moveMonth(-1));
$('#next-month').addEventListener('click', () => moveMonth(1));
$('#today-button').addEventListener('click', () => { visibleMonth = activeMonth; renderCalendar(); });
$('#print-button').addEventListener('click', () => window.print());
$('#balance-button').addEventListener('click', () => $('#balance-dialog').showModal());
$('#close-dialog').addEventListener('click', () => $('#balance-dialog').close());
$('#balance-dialog').addEventListener('click', (event) => {
  if (event.target !== $('#balance-dialog')) return;
  const rect = event.target.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
});
$('#download-button').addEventListener('click', () => {
  const blob = new Blob([calendarFile(monthWeeks(), selectedPerson)], { type: 'text/calendar;charset=utf-8' });
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

renderUpcoming();
renderCalendar();
renderRotations();
