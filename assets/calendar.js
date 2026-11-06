/* Побудова посилань Google Calendar / Outlook та файлів .ics (Europe/Kyiv). */
(function (global) {
  'use strict';

  var D = global.ScheduleDates;
  var TIMEZONE = 'Europe/Kyiv';

  function lastSunday(year, month) {
    var last = new Date(Date.UTC(year, month, 0));
    return last.getUTCDate() - last.getUTCDay();
  }

  function dstStart(year) {
    return Date.UTC(year, 2, lastSunday(year, 3));
  }

  function dstEnd(year) {
    return Date.UTC(year, 9, lastSunday(year, 10));
  }

  /* Зсув Києва в хвилинах: +180 (літо) або +120 (зима). */
  function kyivOffset(dateISO) {
    var year = Number(dateISO.slice(0, 4));
    var ms = D.parseISO(dateISO);
    return ms >= dstStart(year) && ms < dstEnd(year) ? 180 : 120;
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function localMinutes(time) {
    return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  }

  function toUtcStamp(dateISO, time) {
    var date = new Date(D.parseISO(dateISO));
    var minutes = localMinutes(time) - kyivOffset(dateISO);
    var ms = D.parseISO(dateISO) + minutes * 60000;
    var d = new Date(ms);
    return String(d.getUTCFullYear()) +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) + 'Z';
  }

  function localStamp(dateISO, time) {
    return dateISO.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
  }

  function isoWithOffset(dateISO, time) {
    var offset = kyivOffset(dateISO);
    var sign = offset > 0 ? '+' : '-';
    var abs = Math.abs(offset);
    return dateISO + 'T' + time + ':00' + sign + pad(Math.floor(abs / 60)) + ':' + pad(abs % 60);
  }

  function lessonTitle(lesson) {
    return lesson.subject + ' (' + lesson.subtitle.toLowerCase() + ')';
  }

  function lessonDescription(lesson, dates) {
    var lines = [
      lesson.teacher,
      lesson.teacherInfo,
      '',
      lesson.subtitle,
      'Період: ' + D.formatRange(lesson),
      'Занять у циклі: ' + dates.length,
      '',
      'Джерело: розклад занять аспірантів І курсу ННІ УДХТУ, І семестр 2026/2027.'
    ];
    if (lesson.note) {
      lines.splice(4, 0, lesson.note, '');
    }
    if (lesson.links && lesson.links.length) {
      lines.push('');
      lesson.links.forEach(function (link) {
        lines.push(link.label + ': ' + link.url);
      });
    }
    return lines.join('\n');
  }

  function recurrenceRule(lesson, count) {
    if (lesson.parity === 'numerator' || lesson.parity === 'denominator') {
      return 'RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=' + count;
    }
    return 'RRULE:FREQ=WEEKLY;COUNT=' + count;
  }

  function googleUrl(lesson, dates) {
    if (!dates.length) return null;
    var params = new URLSearchParams();
    params.set('action', 'TEMPLATE');
    params.set('text', lessonTitle(lesson));
    params.set('dates', localStamp(dates[0], lesson.start) + '/' + localStamp(dates[0], lesson.end));
    params.set('ctz', TIMEZONE);
    params.set('details', lessonDescription(lesson, dates));
    params.set('location', lesson.links && lesson.links[0] ? lesson.links[0].url : lesson.format);
    if (dates.length > 1) {
      params.set('recur', recurrenceRule(lesson, dates.length));
    }
    return 'https://calendar.google.com/calendar/render?' + params.toString();
  }

  function outlookUrl(lesson, dateISO, dates) {
    var params = new URLSearchParams();
    params.set('path', '/calendar/action/compose');
    params.set('rru', 'addevent');
    params.set('startdt', isoWithOffset(dateISO, lesson.start));
    params.set('enddt', isoWithOffset(dateISO, lesson.end));
    params.set('subject', lessonTitle(lesson));
    params.set('body', lessonDescription(lesson, dates));
    params.set('location', lesson.links && lesson.links[0] ? lesson.links[0].url : lesson.format);
    return 'https://outlook.live.com/calendar/0/deeplink/compose?' + params.toString();
  }

  function escapeText(value) {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  function foldLine(line) {
    var bytes = new TextEncoder().encode(line);
    if (bytes.length <= 75) return line;

    var out = [];
    var current = '';
    var currentBytes = 0;
    for (var i = 0; i < line.length; i += 1) {
      var chunk = line[i];
      var size = new TextEncoder().encode(chunk).length;
      if (currentBytes + size > 73) {
        out.push(current);
        current = '';
        currentBytes = 0;
      }
      current += chunk;
      currentBytes += size;
    }
    if (current) out.push(current);
    return out.join('\r\n ');
  }

  function buildICS(events) {
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//UDHTU//Aspirant Schedule 2026//UK',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Розклад занять · УДХТУ',
      'X-WR-TIMEZONE:' + TIMEZONE
    ];

    events.forEach(function (event) {
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + event.uid);
      lines.push('DTSTAMP:' + event.stamp);
      lines.push('DTSTART:' + toUtcStamp(event.date, event.start));
      lines.push('DTEND:' + toUtcStamp(event.date, event.end));
      lines.push('SUMMARY:' + escapeText(event.summary));
      lines.push('DESCRIPTION:' + escapeText(event.description));
      lines.push('LOCATION:' + escapeText(event.location));
      if (event.url) lines.push('URL:' + event.url);
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:OPAQUE');
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:' + escapeText(event.summary));
      lines.push('TRIGGER:-PT15M');
      lines.push('END:VALARM');
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join('\r\n') + '\r\n';
  }

  function eventFor(lesson, dateISO, dates, stamp) {
    return {
      uid: lesson.id + '-' + dateISO + '@udhtu-schedule',
      stamp: stamp,
      date: dateISO,
      start: lesson.start,
      end: lesson.end,
      summary: lessonTitle(lesson),
      description: lessonDescription(lesson, dates),
      location: lesson.links && lesson.links[0] ? lesson.links[0].url : lesson.format,
      url: lesson.links && lesson.links[0] ? lesson.links[0].url : ''
    };
  }

  function lessonICS(lesson, dates) {
    var stamp = toUtcStamp(D.todayISO(), '12:00');
    var events = dates.map(function (dateISO) {
      return eventFor(lesson, dateISO, dates, stamp);
    });
    return buildICS(events);
  }

  function scheduleICS(entries) {
    var stamp = toUtcStamp(D.todayISO(), '12:00');
    var events = [];
    entries.forEach(function (entry) {
      entry.dates.forEach(function (dateISO) {
        events.push(eventFor(entry.lesson, dateISO, entry.dates, stamp));
      });
    });
    events.sort(function (a, b) {
      return (a.date + a.start) < (b.date + b.start) ? -1 : 1;
    });
    return buildICS(events);
  }

  function download(filename, content) {
    var blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  global.ScheduleCalendar = {
    TIMEZONE: TIMEZONE,
    kyivOffset: kyivOffset,
    toUtcStamp: toUtcStamp,
    googleUrl: googleUrl,
    outlookUrl: outlookUrl,
    lessonICS: lessonICS,
    scheduleICS: scheduleICS,
    download: download,
    lessonTitle: lessonTitle,
    description: lessonDescription
  };
})(window);
