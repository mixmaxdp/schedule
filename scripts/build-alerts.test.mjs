import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseCsv,
  buildAlerts,
  kyivWallMs,
  renderModule,
  SEMESTER
} from './build-alerts.mjs';

/* Локальний час Києва в листопаді — UTC+2. */
function kyiv(day, time) {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCHours(hour - 2, minute, 0, 0);
  return date.toISOString().replace('.000Z', '+00:00');
}

function row(day, from, to, region = 'Дніпропетровська область') {
  return {
    region,
    started_at: kyiv(day, from),
    finished_at: kyiv(day, to),
    naive: 'False'
  };
}

test('parseCsv читає лапки, коми та CRLF', () => {
  const text = 'region,started_at,finished_at,naive\r\n' +
    '"Дніпропетровська область","2026-11-17 06:00:00+00:00","2026-11-17 06:10:00+00:00","False"\r\n' +
    '"Київ, місто","2026-11-17 06:00:00+00:00","2026-11-17 06:05:00+00:00","True"\r\n';
  const rows = parseCsv(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].region, 'Дніпропетровська область');
  assert.equal(rows[1].region, 'Київ, місто');
  assert.equal(rows[1].naive, 'True');
});

test('kyivWallMs переводить UTC у київський настінний час', () => {
  const wall = kyivWallMs(Date.parse('2026-11-17T06:58:53Z'));
  assert.equal(new Date(wall).toISOString(), '2026-11-17T08:58:53.000Z');
});

test('будує хвилини доби для інтервалу', () => {
  const result = buildAlerts([row('2026-11-17', '08:58', '09:10')]);
  assert.deepEqual(result.days['2026-11-17'], [[538, 550]]);
  assert.equal(result.stats.intervals, 1);
  assert.equal(result.stats.minutes, 12);
});

test('склеює паузу 5 хв і не склеює 15 хв', () => {
  const merged = buildAlerts([
    row('2026-11-17', '10:00', '10:10'),
    row('2026-11-17', '10:15', '10:20'),
    row('2026-11-17', '10:35', '10:40')
  ]);
  assert.deepEqual(merged.days['2026-11-17'], [[600, 620], [635, 640]]);
  assert.equal(merged.stats.intervals, 2);
});

test('обрізає інтервали до вікна 07:00–18:00', () => {
  const result = buildAlerts([row('2026-11-17', '05:00', '08:30')]);
  assert.deepEqual(result.days['2026-11-17'], [[420, 510]]);
});

test('відкидає тривоги коротші за хвилину', () => {
  const result = buildAlerts([
    {
      region: 'Дніпропетровська область',
      started_at: '2026-11-17T06:00:00+00:00',
      finished_at: '2026-11-17T06:00:30+00:00'
    }
  ]);
  assert.deepEqual(result.days, {});
  assert.equal(result.stats.intervals, 0);
});

test('ігнорує інші області', () => {
  const result = buildAlerts([row('2026-11-17', '10:00', '10:30', 'Київська область')]);
  assert.deepEqual(result.days, {});
});

test('ігнорує дати поза семестром', () => {
  const result = buildAlerts([row('2026-09-01', '10:00', '10:30')]);
  assert.deepEqual(result.days, {});
  assert.deepEqual(SEMESTER, { start: '2026-10-05', end: '2026-12-27' });
});

test('розрізає інтервал через північ', () => {
  const result = buildAlerts([
    {
      region: 'Дніпропетровська область',
      started_at: '2026-11-17T21:30:00+00:00',
      finished_at: '2026-11-17T22:30:00+00:00'
    }
  ], { dayFrom: 0, dayTo: 24 * 60 });
  assert.deepEqual(result.days['2026-11-17'], [[1410, 1440]]);
  assert.deepEqual(result.days['2026-11-18'], [[0, 30]]);
});

test('сортує дні та повертає ISO-мітку джерела', () => {
  const result = buildAlerts([
    row('2026-11-18', '10:00', '10:20'),
    row('2026-11-17', '11:00', '11:20')
  ]);
  assert.deepEqual(Object.keys(result.days), ['2026-11-17', '2026-11-18']);
  assert.equal(result.through, '2026-11-18T08:20:00.000Z');
});

test('renderModule віддає валідний window.ALERTS', () => {
  const result = buildAlerts([row('2026-11-17', '11:00', '11:40')]);
  const source = renderModule(result, { updated: '2026-11-17T12:00:00Z' });
  assert.match(source, /^\/\*/);
  assert.match(source, /window\.ALERTS = \{/);

  const sandbox = {};
  new Function('window', source)(sandbox);
  assert.equal(sandbox.ALERTS.city, 'Дніпро');
  assert.equal(sandbox.ALERTS.updated, '2026-11-17T12:00:00Z');
  assert.deepEqual(sandbox.ALERTS.days['2026-11-17'], [[660, 700]]);
  assert.deepEqual(sandbox.ALERTS.window, ['07:00', '18:00']);
});
