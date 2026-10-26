import test from 'node:test';
import assert from 'node:assert/strict';
import { START_DATE, PEOPLE, STAIRS_ORDER, BATHROOM_ORDER, HALLWAY_ORDER, TASKS, addDays, generateSchedule, nextWeekend, scheduleThrough, calendarFile, suggestOrder, validateTasks } from '../schedule.js';

test('las tres tareas empiezan con los turnos confirmados', () => {
  const weeks = generateSchedule(6, TASKS);
  assert.equal(weeks[0].date, '2026-10-24');
  assert.deepEqual(weeks.slice(0, 5).map((week) => week.tasks.stairs), ['angel', 'jessy', 'edgar', 'santiago', 'nubia']);
  assert.deepEqual(weeks.map((week) => week.tasks.bathroom), ['fredy', 'edgar', 'santiago', 'jessy', 'angel', 'nubia']);
  assert.deepEqual(weeks.map((week) => week.tasks.hallway), ['nubia', 'angel', 'jessy', 'edgar', 'fredy', 'santiago']);
  assert.deepEqual(STAIRS_ORDER, ['angel', 'jessy', 'edgar', 'santiago', 'nubia']);
  assert.equal(BATHROOM_ORDER.length, 6);
  assert.equal(HALLWAY_ORDER.length, 6);
});

test('en 100 años nadie hace dos tareas el mismo fin de semana', () => {
  const weeks = generateSchedule(5200, TASKS);
  for (const [index, week] of weeks.entries()) {
    const assigned = Object.values(week.tasks);
    assert.equal(assigned.length, TASKS.length);
    assert.equal(new Set(assigned).size, TASKS.length, week.date);
    assert.ok(assigned.every((id) => PEOPLE.some((person) => person.id === id)), week.date);
    assert.equal(week.date, addDays(START_DATE, index * 7));
    for (const task of TASKS) assert.ok(task.order.includes(week.tasks[task.id]), `${task.id} ${week.date}`);
  }
});

test('cada tarea mantiene su cuota justa a largo plazo', () => {
  const weeks = generateSchedule(3000, TASKS);
  for (let end = 60; end <= 3000; end += 60) {
    const selected = weeks.slice(0, end);
    for (const task of TASKS) {
      const expected = end / task.order.length;
      for (const id of task.order) {
        const count = selected.filter((week) => week.tasks[task.id] === id).length;
        assert.ok(Math.abs(count - expected) <= 1, `${task.id}/${id}: ${count} vs ${expected}`);
      }
    }
  }
});

test('los turnos son estables al ampliar el calendario, incluso con ajustes', () => {
  const full = generateSchedule(300, TASKS);
  for (let count = 0; count < 200; count++) {
    assert.deepEqual(generateSchedule(count, TASKS), full.slice(0, count));
  }
});

test('un choque aplaza a una persona y adelanta a la siguiente', () => {
  const weeks = generateSchedule(400, TASKS);
  let found = 0;
  for (const week of weeks.slice(0, 300)) {
    for (const item of week.adjustments) {
      found++;
      assert.equal(week.tasks[item.task], item.advanced);
      assert.notEqual(item.postponed, item.advanced);
      assert.ok(item.to, 'el turno aplazado debe tener fecha de recuperación');
      assert.ok(item.to > week.date);
      const target = weeks.find((candidate) => candidate.date === item.to);
      assert.equal(target.tasks[item.task], item.postponed);
      assert.ok(target.completions.some((completion) => completion.from === item.from && completion.postponed === item.postponed));
    }
    for (const item of week.completions) {
      assert.equal(week.tasks[item.task], item.postponed);
      assert.ok(item.from < week.date);
    }
  }
  assert.ok(found > 0, 'debe existir al menos un ajuste');
});

test('se pueden añadir tareas nuevas sin duplicar personas', () => {
  const kitchen = { id: 'kitchen', name: 'Barrer la cocina', short: 'Cocina', description: 'Barrer y trapear la cocina', icon: 'kitchen', order: suggestOrder(PEOPLE.map(({ id }) => id), 3) };
  const allTasks = [...TASKS, kitchen];
  const weeks = generateSchedule(500, allTasks);
  for (const week of weeks) {
    const assigned = Object.values(week.tasks);
    assert.equal(assigned.length, 4);
    assert.equal(new Set(assigned).size, 4, week.date);
    assert.ok(kitchen.order.includes(week.tasks.kitchen));
  }
  for (const task of allTasks) {
    const expected = 500 / task.order.length;
    for (const id of task.order) {
      const count = weeks.filter((week) => week.tasks[task.id] === id).length;
      assert.ok(Math.abs(count - expected) <= 2, `${task.id}/${id}: ${count} vs ${expected}`);
    }
  }
});

test('valida tareas imposibles antes de calcular', () => {
  assert.throws(() => validateTasks([]), /al menos una tarea/);
  assert.throws(() => validateTasks([...TASKS, { ...TASKS[0], id: 'extra1', name: 'Extra 1' }, { ...TASKS[0], id: 'extra2', name: 'Extra 2' }, { ...TASKS[0], id: 'extra3', name: 'Extra 3' }, { ...TASKS[0], id: 'extra4', name: 'Extra 4' }]), /sobraría alguna tarea/);
  assert.throws(() => validateTasks([...TASKS, { id: 'short', name: 'Corta', order: ['angel', 'jessy'] }]), /al menos 4 personas/);
  assert.throws(() => validateTasks([...TASKS, { id: 'repeat', name: 'Repetida', order: ['angel', 'angel', 'jessy', 'edgar'] }]), /repite a la misma persona/);
  assert.throws(() => validateTasks([...TASKS, { id: 'stranger', name: 'Ajena', order: ['angel', 'jessy', 'edgar', 'nadie'] }]), /no está en la casa/);
  assert.throws(() => generateSchedule(-1, TASKS), RangeError);
});

test('suggestOrder filtra, quita repetidos y rota el inicio', () => {
  assert.deepEqual(suggestOrder(['angel', 'jessy', 'edgar'], 1), ['jessy', 'edgar', 'angel']);
  assert.deepEqual(suggestOrder(['angel', 'angel', 'nadie']), ['angel']);
  assert.deepEqual(suggestOrder([], 2), []);
});

test('el fin de semana incluye el domingo y maneja límites de mes, año e inicio', () => {
  assert.equal(nextWeekend('2026-10-20'), START_DATE);
  assert.equal(nextWeekend('2026-10-24'), START_DATE);
  assert.equal(nextWeekend('2026-10-25'), START_DATE);
  assert.equal(nextWeekend('2026-10-26'), '2026-10-31');
  assert.equal(nextWeekend('2026-11-01'), '2026-10-31');
  assert.equal(nextWeekend('2026-12-31'), '2027-01-02');
  assert.equal(addDays('2028-02-26', 7), '2028-03-04');
  assert.deepEqual(scheduleThrough('2026-10-23', TASKS), []);
  assert.equal(scheduleThrough('2026-11-01', TASKS).length, 2);
});

test('exporta eventos de sábado a domingo, filtra personas y respeta UTF-8 en ICS', () => {
  const weeks = generateSchedule(30, TASKS);
  const all = calendarFile(weeks, 'all', TASKS);
  assert.equal(all.match(/BEGIN:VEVENT/g).length, 90);
  assert.ok(all.includes('DTSTART;VALUE=DATE:20261024\r\nDTEND;VALUE=DATE:20261026'));
  const fredy = calendarFile(weeks, 'fredy', TASKS);
  assert.equal(fredy.match(/BEGIN:VEVENT/g).length, weeks.filter((week) => Object.values(week.tasks).includes('fredy')).length);
  assert.ok(!fredy.includes('SUMMARY:Escaleras'));
  for (const line of all.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
  const unfolded = all.replaceAll('\r\n ', '');
  assert.ok(unfolded.includes('SUMMARY:Escaleras y pasillo · Ángel'));
  assert.ok(unfolded.includes('SUMMARY:Barrer el corredor · Nubia'));
  const uids = [...all.matchAll(/^UID:(.*)$/gm)].map((match) => match[1]);
  assert.equal(new Set(uids).size, 90);
});

test('escapa comas, punto y coma y saltos de línea en el ICS', () => {
  const custom = { id: 'custom-patio', name: 'Barrer, patio; frente', short: 'Patio', description: 'Línea uno\nLínea dos', icon: 'broom', order: suggestOrder(PEOPLE.map(({ id }) => id), 4) };
  const allTasks = [...TASKS, custom];
  const file = calendarFile(generateSchedule(1, allTasks), 'all', allTasks).replaceAll('\r\n ', '');
  assert.ok(file.includes('SUMMARY:Barrer\\, patio\\; frente ·'));
  assert.ok(file.includes('Línea uno\\nLínea dos'));
});
