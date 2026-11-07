/* Генерація дат занять, тижнева сітка та форматування. */
(function (global) {
  'use strict';

  var DAY_MS = 86400000;
  var WEEK_MS = 7 * DAY_MS;

  var DAY_NAMES = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота'];
  var DAY_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  function parseISO(iso) {
    var parts = iso.split('-').map(Number);
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }

  function toISO(ms) {
    return new Date(ms).toISOString().slice(0, 10);
  }

  function addDays(ms, days) {
    return ms + days * DAY_MS;
  }

  /* 0 — перший тиждень семестру (знаменник), 1 — чисельник, 2 — знаменник ... */
  function weekIndex(ms, semesterStart) {
    return Math.floor((ms - parseISO(semesterStart)) / WEEK_MS);
  }

  function parityOf(ms, semester) {
    return weekIndex(ms, semester.start) % 2 === 0 ? 'denominator' : 'numerator';
  }

  function matchesParity(ms, semester, parity) {
    if (!parity || parity === 'all') return true;
    return parityOf(ms, semester) === parity;
  }

  function occurrences(lesson, semester) {
    var cursor = parseISO(lesson.from);
    var last = parseISO(lesson.to);
    var target = lesson.day % 7;
    var result = [];

    while (new Date(cursor).getUTCDay() !== target) {
      cursor = addDays(cursor, 1);
    }

    while (cursor <= last) {
      if (matchesParity(cursor, semester, lesson.parity)) {
        result.push(toISO(cursor));
      }
      cursor = addDays(cursor, 7);
    }

    return result;
  }

  function todayISO() {
    var now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');
  }

  /* Понеділок тижня, що містить дату (за замовчуванням — сьогодні). */
  function startOfWeekISO(iso) {
    var ms = parseISO(iso || todayISO());
    var offset = (new Date(ms).getUTCDay() + 6) % 7;
    return toISO(addDays(ms, -offset));
  }

  function weekOf(iso) {
    var start = startOfWeekISO(iso || todayISO());
    var days = {};
    for (var i = 0; i < 7; i += 1) {
      days[i + 1] = toISO(addDays(parseISO(start), i));
    }
    return { start: start, end: days[7], days: days };
  }

  function currentWeek() {
    return weekOf(todayISO());
  }

  function formatShortDate(iso) {
    var parts = iso.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0].slice(2);
  }

  function formatDayMonth(iso) {
    var parts = iso.split('-');
    return parts[2] + '.' + parts[1];
  }

  function formatDate(iso, opts) {
    var date = new Date(parseISO(iso));
    return new Intl.DateTimeFormat('uk-UA', Object.assign(
      { day: 'numeric', month: 'long', timeZone: 'UTC' },
      opts || {}
    )).format(date);
  }

  function formatRange(lesson) {
    var from = formatDate(lesson.from, { day: 'numeric', month: 'short' });
    var to = formatDate(lesson.to, { day: 'numeric', month: 'short' });
    return from + ' — ' + to;
  }

  global.ScheduleDates = {
    DAY_NAMES: DAY_NAMES,
    DAY_SHORT: DAY_SHORT,
    parseISO: parseISO,
    toISO: toISO,
    addDays: addDays,
    weekIndex: weekIndex,
    parityOf: parityOf,
    matchesParity: matchesParity,
    occurrences: occurrences,
    todayISO: todayISO,
    startOfWeekISO: startOfWeekISO,
    weekOf: weekOf,
    currentWeek: currentWeek,
    formatShortDate: formatShortDate,
    formatDayMonth: formatDayMonth,
    formatDate: formatDate,
    formatRange: formatRange
  };
})(window);
