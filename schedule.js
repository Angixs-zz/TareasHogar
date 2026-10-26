// Configuración compartida: modificar aquí y publicar actualiza a toda la casa.
export const START_DATE = '2026-10-24';
export const PEOPLE = [
  { id: 'angel', name: 'Ángel', initials: 'Á', color: 'purple' },
  { id: 'jessy', name: 'Jessy', initials: 'J', color: 'pink' },
  { id: 'santiago', name: 'Santiago', initials: 'S', color: 'blue' },
  { id: 'edgar', name: 'Edgar', initials: 'E', color: 'orange' },
  { id: 'nubia', name: 'Nubia', initials: 'N', color: 'green' },
  { id: 'fredy', name: 'Fredy', initials: 'F', color: 'yellow' },
];
export const STAIRS_ORDER = ['angel', 'jessy', 'edgar', 'santiago', 'nubia'];
export const BATHROOM_ORDER = ['fredy', 'edgar', 'santiago', 'jessy', 'angel', 'nubia'];
// El corredor empieza con alguien libre en los primeros fines de semana.
export const HALLWAY_ORDER = ['nubia', 'angel', 'jessy', 'edgar', 'fredy', 'santiago'];

export const TASKS = [
  {
    id: 'stairs',
    name: 'Escaleras y pasillo',
    short: 'Escaleras',
    description: 'Barrer las escaleras y trapear el pasillo de arriba',
    icon: 'stairs',
    order: STAIRS_ORDER,
  },
  {
    id: 'bathroom',
    name: 'Lavar el baño',
    short: 'Baño',
    description: 'Dejar el baño limpio para todos',
    icon: 'bath',
    order: BATHROOM_ORDER,
  },
  {
    id: 'hallway',
    name: 'Barrer el corredor',
    short: 'Corredor',
    description: 'Barrer el corredor y dejar la entrada en orden',
    icon: 'broom',
    order: HALLWAY_ORDER,
  },
];

export const person = (id) => PEOPLE.find((item) => item.id === id);

export function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function suggestOrder(participantIds, offset = 0) {
  const ids = [...new Set(participantIds)].filter((id) => PEOPLE.some((item) => item.id === id));
  if (ids.length === 0) return [];
  const start = ((offset % ids.length) + ids.length) % ids.length;
  return [...ids.slice(start), ...ids.slice(0, start)];
}

export function validateTasks(tasks = TASKS, people = PEOPLE) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('Necesitamos al menos una tarea.');
  }
  if (tasks.length > people.length) {
    throw new Error(`Hay ${tasks.length} tareas para ${people.length} personas. Cada fin de semana sobraría alguna tarea.`);
  }
  const ids = new Set();
  for (const task of tasks) {
    if (!task || typeof task !== 'object' || !task.id || !task.name) {
      throw new Error('Hay una tarea con datos incompletos.');
    }
    if (ids.has(task.id)) throw new Error(`La tarea «${task.name}» está repetida.`);
    ids.add(task.id);
    if (!Array.isArray(task.order) || task.order.length < tasks.length) {
      const count = Array.isArray(task.order) ? task.order.length : 0;
      throw new Error(`La rotación de «${task.name}» tiene ${count} ${count === 1 ? 'persona' : 'personas'}; con ${tasks.length} tareas necesita al menos ${tasks.length} personas para evitar tareas dobles.`);
    }
    const seen = new Set();
    for (const personId of task.order) {
      if (!people.some((item) => item.id === personId)) {
        throw new Error(`La rotación de «${task.name}» incluye a alguien que no está en la casa.`);
      }
      if (seen.has(personId)) {
        throw new Error(`La rotación de «${task.name}» repite a la misma persona.`);
      }
      seen.add(personId);
    }
  }
  return tasks;
}

// Se genera siempre desde el inicio, no desde el mes visible. Así los
// intercambios pendientes sobreviven a los cambios de mes y de año.
//
// Cada tarea avanza su propia rotación como una cola. Si la persona que
// sigue ya tiene otra tarea ese fin de semana, se salta y queda al frente
// para el siguiente. La persona que la cubre se adelanta. Con rotaciones de
// al menos tantas personas como tareas, siempre hay alguien libre.
const LOOKAHEAD_WEEKS = 520;

export function generateSchedule(count, tasks = TASKS) {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('Número de semanas inválido');
  validateTasks(tasks);

  const total = count + LOOKAHEAD_WEEKS;
  const queues = tasks.map((task) => ({
    task,
    ids: task.order.slice(),
    cursor: task.order.length,
  }));
  const pending = new Map();
  const weeks = [];

  for (let weekIndex = 0; weekIndex < total; weekIndex++) {
    const date = addDays(START_DATE, weekIndex * 7);
    const assigned = new Map();
    const taskPeople = {};
    const adjustments = [];
    const completions = [];

    for (const queue of queues) {
      const { task } = queue;
      const size = task.order.length;
      let freeIndex = queue.ids.findIndex((id) => !assigned.has(id));
      while (freeIndex === -1) {
        queue.ids.push(task.order[queue.cursor % size]);
        queue.cursor += 1;
        freeIndex = queue.ids.findIndex((id) => !assigned.has(id));
      }

      const delayed = queue.ids.slice(0, freeIndex);
      const [personId] = queue.ids.splice(freeIndex, 1);
      assigned.set(personId, task.id);
      taskPeople[task.id] = personId;

      while (queue.ids.length < size) {
        queue.ids.push(task.order[queue.cursor % size]);
        queue.cursor += 1;
      }

      // Quien se quedó esperando conserva su turno para el siguiente hueco.
      for (const delayedId of delayed) {
        const key = `${task.id}:${delayedId}`;
        const records = pending.get(key) ?? [];
        const record = {
          task: task.id,
          postponed: delayedId,
          advanced: personId,
          from: date,
          to: null,
        };
        records.push(record);
        pending.set(key, records);
        adjustments.push(record);
      }

      // Quien recibe el turno puede estar recuperando uno que se aplazó.
      const key = `${task.id}:${personId}`;
      const records = pending.get(key);
      if (records?.length) {
        for (const record of records) {
          record.to = date;
          completions.push(record);
        }
        pending.delete(key);
      }
    }

    const week = {
      date,
      tasks: taskPeople,
      adjustments,
      completions,
    };
    if ('stairs' in taskPeople) week.stairs = taskPeople.stairs;
    if ('bathroom' in taskPeople) week.bathroom = taskPeople.bathroom;
    weeks.push(week);
  }

  return weeks.slice(0, count);
}

export function nextWeekend(today) {
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  // El domingo sigue perteneciendo al fin de semana que comenzó el sábado.
  const saturday = addDays(today, day === 0 ? -1 : (6 - day + 7) % 7);
  return saturday < START_DATE ? START_DATE : saturday;
}

export function scheduleThrough(iso, tasks = TASKS) {
  const weeks = Math.floor((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${START_DATE}T00:00:00Z`)) / 604800000) + 1;
  return generateSchedule(Math.max(0, weeks), tasks);
}

const escapeIcs = (value) => String(value)
  .replaceAll('\\', '\\\\')
  .replaceAll(';', '\\;')
  .replaceAll(',', '\\,')
  .replace(/\r?\n/g, '\\n');

export function calendarFile(weeks, selectedPerson = 'all', tasks = TASKS) {
  const compact = (date) => date.replaceAll('-', '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Casa en orden//Turnos//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Casa en orden'];
  for (const week of weeks) {
    for (const task of tasks) {
      const personId = week.tasks[task.id];
      if (!personId) continue;
      if (selectedPerson !== 'all' && personId !== selectedPerson) continue;
      const adjusted = week.adjustments.some((item) => item.task === task.id)
        || week.completions.some((item) => item.task === task.id);
      lines.push('BEGIN:VEVENT', `UID:${week.date}-${task.id}@angixs-zz.github.io-tareashogar`,
        'DTSTAMP:20261024T000000Z', `DTSTART;VALUE=DATE:${compact(week.date)}`,
        `DTEND;VALUE=DATE:${compact(addDays(week.date, 2))}`,
        `SUMMARY:${escapeIcs(`${task.name} · ${person(personId).name}`)}`,
        `DESCRIPTION:${escapeIcs(`${task.description}.${adjusted ? ' Turno ajustado para evitar tareas dobles.' : ''}`)}`,
        'END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  // RFC 5545: plegar las líneas a un máximo de 75 octetos UTF-8.
  const encoder = new TextEncoder();
  return lines.map((line) => {
    let folded = '';
    let bytes = 0;
    for (const char of line) {
      const size = encoder.encode(char).length;
      if (bytes + size > 75) { folded += '\r\n '; bytes = 1; }
      folded += char;
      bytes += size;
    }
    return folded;
  }).join('\r\n') + '\r\n';
}
