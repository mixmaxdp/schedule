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

  /* Outlook зливає однотипні події в серію і губить опис у наступних
     повтореннях. Тому весь цикл занять експортуємо однією серією з RRULE,
     а не окремими VEVENT на кожну дату. */
  function weeklyStep(dates) {
    if (dates.length < 2) return 0;
    var step = Math.round((D.parseISO(dates[1]) - D.parseISO(dates[0])) / 86400000);
    if (step !== 7 && step !== 14) return 0;
    for (var i = 2; i < dates.length; i += 1) {
      var next = Math.round((D.parseISO(dates[i]) - D.parseISO(dates[i - 1])) / 86400000);
      if (next !== step) return 0;
    }
    return step;
  }

  function seriesRule(dates, step) {
    if (dates.length < 2 || !step) return '';
    return step === 14
      ? 'RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=' + dates.length
      : 'RRULE:FREQ=WEEKLY;COUNT=' + dates.length;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* HTML-версія опису: Outlook показує саме X-ALT-DESC, а простий
     DESCRIPTION у частині клієнтів ігнорує. */
  function htmlDescription(lesson, dates) {
    var body = lessonDescription(lesson, dates).split('\n').map(function (line) {
      if (!line) return '<div><br></div>';
      var link = /^([^:]+): (https?:\/\/\S+)$/.exec(line);
      if (link) {
        return '<div>' + escapeHtml(link[1]) + ': <a href="' + escapeHtml(link[2]) + '">' +
          escapeHtml(link[2]) + '</a></div>';
      }
      return '<div>' + escapeHtml(line) + '</div>';
    }).join('');
    return '<html><body>' + body + '</body></html>';
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

  function timezoneBlock() {
    return [
      'BEGIN:VTIMEZONE',
      'TZID:' + TIMEZONE,
      'X-LIC-LOCATION:' + TIMEZONE,
      'BEGIN:DAYLIGHT',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0300',
      'TZNAME:EEST',
      'DTSTART:19700329T030000',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:+0300',
      'TZOFFSETTO:+0200',
      'TZNAME:EET',
      'DTSTART:19701025T040000',
      'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
      'END:STANDARD',
      'END:VTIMEZONE'
    ];
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

    lines = lines.concat(timezoneBlock());

    events.forEach(function (event) {
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + event.uid);
      lines.push('DTSTAMP:' + event.stamp);
      /* TZID замість UTC — інакше серія, що перетинає перехід на зимовий
         час 25.10, зсувається на годину в наступних повтореннях. */
      lines.push('DTSTART;TZID=' + TIMEZONE + ':' + localStamp(event.date, event.start));
      lines.push('DTEND;TZID=' + TIMEZONE + ':' + localStamp(event.date, event.end));
      if (event.rrule) lines.push(event.rrule);
      lines.push('SUMMARY:' + escapeText(event.summary));
      lines.push('DESCRIPTION:' + escapeText(event.description));
      if (event.html) lines.push('X-ALT-DESC;FMTTYPE=text/html:' + event.html);
      lines.push('LOCATION:' + escapeText(event.location));
      if (event.url) lines.push('URL:' + event.url);
      lines.push('SEQUENCE:0');
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

  function eventFor(lesson, dates, stamp) {
    var step = weeklyStep(dates);
    var location = lesson.links && lesson.links[0] ? lesson.links[0].url : lesson.format;
    return {
      /* Один UID на цикл, щоб повторний імпорт оновлював серію, а не плодив копії. */
      uid: lesson.id + (dates.length > 1 ? '-series' : '-' + dates[0]) + '@udhtu-schedule',
      stamp: stamp,
      date: dates[0],
      start: lesson.start,
      end: lesson.end,
      summary: lessonTitle(lesson),
      description: lessonDescription(lesson, dates),
      html: htmlDescription(lesson, dates),
      location: location,
      url: lesson.links && lesson.links[0] ? lesson.links[0].url : '',
      rrule: seriesRule(dates, step)
    };
  }

  function eventsFor(lesson, dates, stamp, target) {
    var step = weeklyStep(dates);
    if (dates.length > 1 && !step) {
      dates.forEach(function (dateISO) {
        target.push(eventFor(lesson, [dateISO], stamp));
      });
      return;
    }
    target.push(eventFor(lesson, dates, stamp));
  }

  function lessonICS(lesson, dates) {
    var stamp = toUtcStamp(D.todayISO(), '12:00');
    var events = [];
    eventsFor(lesson, dates, stamp, events);
    return buildICS(events);
  }

  function scheduleICS(entries) {
    var stamp = toUtcStamp(D.todayISO(), '12:00');
    var events = [];
    entries.forEach(function (entry) {
      if (entry.dates.length) {
        eventsFor(entry.lesson, entry.dates, stamp, events);
      }
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
