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
export const person = (id) => PEOPLE.find((item) => item.id === id);

export function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Se genera siempre desde el inicio, no desde el mes visible. Así los
// intercambios pendientes sobreviven a los cambios de mes y de año.
export function generateSchedule(count) {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('Número de semanas inválido');
  const bathroom = Array.from({ length: count + 1 }, (_, i) => ({
    id: BATHROOM_ORDER[i % BATHROOM_ORDER.length],
    originalWeek: i,
  }));
  const swaps = new Map();
  const result = [];
  for (let i = 0; i < count; i++) {
    const stairs = STAIRS_ORDER[i % STAIRS_ORDER.length];
    if (stairs === bathroom[i].id) {
      const swap = {
        from: addDays(START_DATE, i * 7),
        to: addDays(START_DATE, (i + 1) * 7),
        postponed: bathroom[i].id,
        advanced: bathroom[i + 1].id,
      };
      [bathroom[i], bathroom[i + 1]] = [bathroom[i + 1], bathroom[i]];
      swaps.set(i, swap);
      swaps.set(i + 1, swap);
    }
    result.push({
      date: addDays(START_DATE, i * 7),
      stairs,
      bathroom: bathroom[i].id,
      bathroomOriginalWeek: bathroom[i].originalWeek,
      swap: swaps.get(i) ?? null,
    });
  }
  return result;
}

export function nextWeekend(today) {
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  // El domingo sigue perteneciendo al fin de semana que comenzó el sábado.
  const saturday = addDays(today, day === 0 ? -1 : (6 - day + 7) % 7);
  return saturday < START_DATE ? START_DATE : saturday;
}

export function scheduleThrough(iso) {
  const weeks = Math.floor((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${START_DATE}T00:00:00Z`)) / 604800000) + 1;
  return generateSchedule(Math.max(0, weeks));
}

export function calendarFile(weeks, selectedPerson = 'all') {
  const compact = (date) => date.replaceAll('-', '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Casa en orden//Turnos//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Casa en orden'];
  for (const week of weeks) {
    for (const [task, title] of [['stairs', 'Escaleras y pasillo'], ['bathroom', 'Lavar el baño']]) {
      if (selectedPerson !== 'all' && week[task] !== selectedPerson) continue;
      lines.push('BEGIN:VEVENT', `UID:${week.date}-${task}@angixs-zz.github.io-tareashogar`,
        'DTSTAMP:20261024T000000Z', `DTSTART;VALUE=DATE:${compact(week.date)}`,
        `DTEND;VALUE=DATE:${compact(addDays(week.date, 2))}`,
        `SUMMARY:${title} · ${person(week[task]).name}`,
        `DESCRIPTION:${task === 'stairs' ? 'Barrer las escaleras y trapear el pasillo de arriba.' : 'Lavar el baño.'}${week.swap ? ' Turno de baño ajustado para evitar tareas dobles.' : ''}`,
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
