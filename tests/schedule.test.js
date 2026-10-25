import test from 'node:test';
import assert from 'node:assert/strict';
import { START_DATE, PEOPLE, STAIRS_ORDER, BATHROOM_ORDER, addDays, generateSchedule, nextWeekend, scheduleThrough, calendarFile } from '../schedule.js';

test('respeta los turnos confirmados y añade a Nubia al final de cada rotación', () => {
  const weeks = generateSchedule(6);
  assert.equal(weeks[0].date, '2026-10-24');
  assert.equal(weeks[0].stairs, 'angel');
  assert.equal(weeks[0].bathroom, 'fredy');
  assert.deepEqual(weeks.slice(0, 5).map((week) => week.stairs), ['angel', 'jessy', 'edgar', 'santiago', 'nubia']);
  assert.deepEqual(weeks.map((week) => week.bathroom), ['fredy', 'edgar', 'santiago', 'jessy', 'angel', 'nubia']);
});

test('en 100 años no hay tareas dobles, turnos perdidos ni desplazamientos mayores a una semana', () => {
  const weeks = generateSchedule(5200);
  const originalWeeks = new Set();
  for (const [index, week] of weeks.entries()) {
    assert.notEqual(week.stairs, week.bathroom, week.date);
    assert.equal(week.stairs, STAIRS_ORDER[index % 5]);
    assert.equal(week.bathroom, BATHROOM_ORDER[week.bathroomOriginalWeek % 6]);
    assert.ok(Math.abs(index - week.bathroomOriginalWeek) <= 1);
    assert.ok(!originalWeeks.has(week.bathroomOriginalWeek));
    originalWeeks.add(week.bathroomOriginalWeek);
    assert.equal(week.date, addDays(START_DATE, index * 7));
    if (week.swap) {
      assert.equal(addDays(week.swap.from, 7), week.swap.to);
      const first = week.date === week.swap.from;
      assert.equal(week.bathroom, first ? week.swap.advanced : week.swap.postponed);
    }
  }
  // Solo el último turno puede haberse intercambiado con la semana no generada.
  for (let i = 0; i < weeks.length - 1; i++) assert.ok(originalWeeks.has(i));
});

test('un choque intercambia solo dos turnos consecutivos de baño', () => {
  const weeks = generateSchedule(50);
  const first = weeks.findIndex((week) => week.swap);
  assert.ok(first > 0);
  assert.equal(weeks[first].stairs, BATHROOM_ORDER[first % 6]);
  assert.equal(weeks[first].bathroom, BATHROOM_ORDER[(first + 1) % 6]);
  assert.equal(weeks[first + 1].bathroom, BATHROOM_ORDER[first % 6]);
  assert.deepEqual(weeks[first].swap, weeks[first + 1].swap);
  assert.equal(weeks[first + 2].bathroom, BATHROOM_ORDER[(first + 2) % 6]);
});

test('los turnos son estables al ampliar el calendario, incluso en un intercambio', () => {
  const full = generateSchedule(160);
  for (let count = 1; count < full.length; count++) {
    assert.deepEqual(generateSchedule(count), full.slice(0, count));
  }
});

test('el reparto mantiene las cuotas por tarea y Fredy nunca hace escaleras', () => {
  const weeks = generateSchedule(3000);
  for (let end = 30; end <= 3000; end += 30) {
    const selected = weeks.slice(0, end);
    for (const { id } of PEOPLE) {
      assert.equal(selected.filter((week) => week.stairs === id).length, id === 'fredy' ? 0 : end / 5);
      assert.ok(Math.abs(selected.filter((week) => week.bathroom === id).length - end / 6) <= 1);
    }
  }
});

test('el fin de semana incluye el domingo y maneja límites de mes, año e inicio', () => {
  assert.equal(nextWeekend('2026-10-20'), START_DATE);
  assert.equal(nextWeekend('2026-10-24'), START_DATE);
  assert.equal(nextWeekend('2026-10-25'), START_DATE);
  assert.equal(nextWeekend('2026-10-26'), '2026-10-31');
  assert.equal(nextWeekend('2026-11-01'), '2026-10-31');
  assert.equal(nextWeekend('2026-12-31'), '2027-01-02');
  assert.equal(addDays('2028-02-26', 7), '2028-03-04');
  assert.deepEqual(scheduleThrough('2026-10-23'), []);
  assert.equal(scheduleThrough('2026-11-01').length, 2);
  assert.throws(() => generateSchedule(-1), RangeError);
});

test('exporta eventos de sábado a domingo, filtra personas y respeta UTF-8 en ICS', () => {
  const weeks = generateSchedule(30);
  const all = calendarFile(weeks);
  assert.equal(all.match(/BEGIN:VEVENT/g).length, 60);
  assert.ok(all.includes('DTSTART;VALUE=DATE:20261024\r\nDTEND;VALUE=DATE:20261026'));
  const fredy = calendarFile(weeks, 'fredy');
  assert.equal(fredy.match(/BEGIN:VEVENT/g).length, weeks.filter((week) => week.bathroom === 'fredy').length);
  assert.ok(!fredy.includes('SUMMARY:Escaleras'));
  for (const line of all.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
  const unfolded = all.replaceAll('\r\n ', '');
  assert.ok(unfolded.includes('SUMMARY:Escaleras y pasillo · Ángel'));
  const uids = [...all.matchAll(/^UID:(.*)$/gm)].map((match) => match[1]);
  assert.equal(new Set(uids).size, 60);
});
