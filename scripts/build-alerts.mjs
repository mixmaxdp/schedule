#!/usr/bin/env node
/* Генератор assets/alerts.js — історія повітряних тривог для Дніпропетровської
   області (м. Дніпро) за вікно семестру.

   Джерело: Vadimkin/ukrainian-air-raid-sirens-dataset (volunteer / eTryvoga),
   ліцензія MIT, оновлюється щодня. Дані — рівень області, час — UTC.

   Запуск:
     node scripts/build-alerts.mjs               # завантажити свіжий CSV
     node scripts/build-alerts.mjs --refresh     # ігнорувати кеш
     node scripts/build-alerts.mjs --input x.csv --out y.js
     node scripts/build-alerts.mjs --updated 2026-11-17T00:00:00Z

   Скрипт не має залежностей; CSV-кеш лежить у .cache/ і не комітиться. */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

export const SOURCE_URL =
  'https://raw.githubusercontent.com/Vadimkin/ukrainian-air-raid-sirens-dataset/main/datasets/volunteer_data_uk.csv';
export const REGION = 'Дніпропетровська область';
export const TZ = 'Europe/Kyiv';
export const SEMESTER = { start: '2026-10-05', end: '2026-12-27' };

/* Вікно доби, яке має сенс показувати: пари йдуть 08:00–17:20, беремо запас. */
export const DAY_FROM = 7 * 60;
export const DAY_TO = 18 * 60;
export const MERGE_GAP_MIN = 10;
export const MIN_MINUTES = 1;

const DAY_SECONDS = 86400;
const KYIV = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  hourCycle: 'h23'
});

/* ---------- чисті функції (тестуються окремо) ---------- */

export function parseCsv(text) {
  const rows = [];
  let field = '';
  let record = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      record.push(field);
      field = '';
    } else if (ch === '\n') {
      record.push(field);
      rows.push(record);
      record = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length || record.length) {
    record.push(field);
    rows.push(record);
  }

  if (!rows.length) return [];
  const header = rows.shift().map((name) => name.trim());
  return rows
    .filter((row) => row.length === header.length)
    .map((row) => Object.fromEntries(header.map((name, index) => [name, row[index]])));
}

function parseInstant(value) {
  if (!value) return null;
  const date = new Date(String(value).trim().replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

/* Переводить момент часу в «настінний» час Києва, закодований як UTC-мілісекунди.
   Так зручно різати інтервали по локальних добах. */
export function kyivWallMs(ms) {
  const parts = {};
  KYIV.formatToParts(new Date(ms)).forEach((part) => {
    if (part.type !== 'literal') parts[part.type] = part.value;
  });
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
}

function dayKey(wallMs) {
  return new Date(wallMs).toISOString().slice(0, 10);
}

function splitByDay(startMs, endMs) {
  const segments = [];
  let cursor = kyivWallMs(startMs);
  const end = kyivWallMs(endMs);
  if (end <= cursor) return segments;

  while (cursor < end) {
    const dayStart = Math.floor(cursor / (DAY_SECONDS * 1000)) * DAY_SECONDS * 1000;
    const dayEnd = dayStart + DAY_SECONDS * 1000;
    const segmentEnd = Math.min(end, dayEnd);
    segments.push({
      day: dayKey(dayStart),
      from: Math.floor((cursor - dayStart) / 1000),
      to: Math.ceil((segmentEnd - dayStart) / 1000)
    });
    cursor = segmentEnd;
  }
  return segments;
}

/* Склеює інтервали з паузою ≤ mergeGap хв і відкидає коротші за minMinutes. */
function mergeSegments(list, mergeGapSec, minSec) {
  const sorted = list.slice().sort((a, b) => a.from - b.from || a.to - b.to);
  const merged = [];
  sorted.forEach((segment) => {
    const last = merged[merged.length - 1];
    if (last && segment.from - last.to <= mergeGapSec) {
      last.to = Math.max(last.to, segment.to);
    } else {
      merged.push({ from: segment.from, to: segment.to });
    }
  });
  return merged.filter((segment) => segment.to - segment.from >= minSec);
}

export function buildAlerts(rows, options = {}) {
  const semester = options.semester || SEMESTER;
  const dayFrom = (options.dayFrom ?? DAY_FROM) * 60;
  const dayTo = (options.dayTo ?? DAY_TO) * 60;
  const mergeGapSec = (options.mergeGap ?? MERGE_GAP_MIN) * 60;
  const minSec = (options.minMinutes ?? MIN_MINUTES) * 60;
  const region = options.region || REGION;

  const byDay = new Map();
  let used = 0;
  let through = null;

  rows.forEach((row) => {
    if (row.region !== region) return;
    const start = parseInstant(row.started_at);
    const end = parseInstant(row.finished_at);
    if (!start || !end || end <= start) return;

    used += 1;
    if (!through || end > through) through = end;

    splitByDay(start.getTime(), end.getTime()).forEach((segment) => {
      const from = Math.max(segment.from, dayFrom);
      const to = Math.min(segment.to, dayTo);
      if (to <= from) return;
      if (segment.day < semester.start || segment.day > semester.end) return;
      if (!byDay.has(segment.day)) byDay.set(segment.day, []);
      byDay.get(segment.day).push({ from, to });
    });
  });

  const days = {};
  let intervals = 0;
  let minutes = 0;

  Array.from(byDay.keys()).sort().forEach((day) => {
    const merged = mergeSegments(byDay.get(day), mergeGapSec, minSec);
    if (!merged.length) return;
    days[day] = merged.map((segment) => {
      const from = Math.floor(segment.from / 60);
      const to = Math.ceil(segment.to / 60);
      intervals += 1;
      minutes += to - from;
      return [from, to];
    });
  });

  return {
    days,
    through: through ? through.toISOString() : null,
    stats: {
      rows: used,
      days: Object.keys(days).length,
      intervals,
      minutes
    }
  };
}

export function renderModule(result, meta = {}) {
  const payload = {
    city: 'Дніпро',
    scope: REGION,
    source: 'Vadimkin/ukrainian-air-raid-sirens-dataset (volunteer / eTryvoga)',
    sourceUrl: SOURCE_URL,
    license: 'MIT',
    updated: meta.updated || result.through || new Date().toISOString(),
    through: result.through,
    window: ['07:00', '18:00'],
    days: result.days
  };

  return [
    '/* Повітряні тривоги в Дніпропетровській області (м. Дніпро).',
    '   Історія за семестр 05.10–27.12.2026; час — київський, хвилини від 00:00.',
    '   Джерело: ' + payload.source + ' (MIT).',
    '   Згенеровано scripts/build-alerts.mjs — не редагувати вручну. */',
    'window.ALERTS = ' + JSON.stringify(payload, null, 2) + ';',
    ''
  ].join('\n');
}

/* ---------- CLI ---------- */

function argValue(args, name, fallback) {
  const index = args.indexOf(name);
  return index === -1 || index === args.length - 1 ? fallback : args[index + 1];
}

async function download(url, target) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error('Не вдалося завантажити ' + url + ': HTTP ' + response.status);
  }
  const text = await response.text();
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
  return text;
}

async function main() {
  const args = process.argv.slice(2);
  const cachePath = resolve(ROOT, '.cache/volunteer_data_uk.csv');
  const inputArg = argValue(args, '--input', null);
  const outPath = resolve(ROOT, argValue(args, '--out', 'assets/alerts.js'));
  const updated = argValue(args, '--updated', null);
  const refresh = args.includes('--refresh');

  let csv;
  if (inputArg) {
    csv = readFileSync(resolve(process.cwd(), inputArg), 'utf8');
  } else if (refresh || !existsSync(cachePath)) {
    csv = await download(SOURCE_URL, cachePath);
  } else {
    csv = readFileSync(cachePath, 'utf8');
  }

  const rows = parseCsv(csv);
  const result = buildAlerts(rows);
  writeFileSync(outPath, renderModule(result, { updated }));

  const size = readFileSync(outPath).length;
  console.log(
    'Тривоги: ' + result.stats.rows + ' інтервалів у джерелі, ' +
    result.stats.days + ' днів, ' + result.stats.intervals + ' склеєних інтервалів, ' +
    result.stats.minutes + ' хв у вікні занять. ' +
    'Запис: ' + outPath.replace(ROOT + '/', '') + ' (' + (size / 1024).toFixed(1) + ' КБ).'
  );
  if (result.through) console.log('Дані в джерелі — до ' + result.through + '.');
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
