/* Інтерфейс: вибір спеціальності, тижнева сітка, список, деталі та календарі. */
(function () {
  'use strict';

  var S = window.SCHEDULE;
  var D = window.ScheduleDates;
  var C = window.ScheduleCalendar;

  var TYPE_META = {
    lecture: { label: 'Лекція', cls: 'is-lecture' },
    practical: { label: 'Практичні', cls: 'is-practical' },
    seminar: { label: 'Семінар', cls: 'is-seminar' },
    lab: { label: 'Лабораторні', cls: 'is-lab' }
  };

  var CADENCE = {
    all: { label: 'Щотижня', short: 'щотиж.', cls: 'is-weekly' },
    numerator: { label: 'Чисельник', short: 'чис.', cls: 'is-odd' },
    denominator: { label: 'Знаменник', short: 'знам.', cls: 'is-even' }
  };

  var CYRILLIC_HOMOGLYPHS = {
    'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K',
    'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X', 'У': 'Y'
  };

  var state = {
    selection: null,
    dates: new Map(),
    modal: null
  };

  var el = {};

  /* ---------- утиліти ---------- */

  function normalizeCode(raw) {
    var value = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
    value = value.replace(/[А-ЯЁ]/g, function (letter) {
      return CYRILLIC_HOMOGLYPHS[letter] || letter;
    });
    if (value === 'H1') return 'N1-1';
    if (value === 'N1') return 'N1-1';
    return value;
  }

  function groupByCode(code) {
    for (var i = 0; i < S.GROUPS.length; i += 1) {
      if (S.GROUPS[i].code === code) return S.GROUPS[i];
    }
    return null;
  }

  function variantByKey(key) {
    for (var i = 0; i < S.GROUPS.length; i += 1) {
      var group = S.GROUPS[i];
      if (!group.variants) continue;
      for (var j = 0; j < group.variants.length; j += 1) {
        if (group.variants[j].key === key) {
          return { group: group, variant: group.variants[j] };
        }
      }
    }
    return null;
  }

  function resolveSelection(input) {
    var key = normalizeCode(input);
    if (!key) return null;

    var variant = variantByKey(key);
    if (variant) {
      return {
        key: variant.variant.key,
        code: variant.group.code,
        course: variant.variant.course,
        group: variant.group,
        variant: variant.variant
      };
    }

    var group = groupByCode(key);
    if (!group) return null;
    return {
      key: group.variants ? group.variants[0].key : group.code,
      code: group.code,
      course: group.variants ? group.variants[0].course : null,
      group: group,
      variant: group.variants ? group.variants[0] : null
    };
  }

  function displayLabel(selection) {
    return selection.variant ? selection.variant.label : selection.group.label;
  }

  function lessonMatches(lesson, selection) {
    if (lesson.groups.indexOf(selection.code) === -1) return false;
    if (!lesson.course) return true;
    var required = lesson.course[selection.code];
    if (required === undefined || required === null) return true;
    return required === (selection.course || 1);
  }

  function lessonsFor(selection) {
    return S.LESSONS
      .filter(function (lesson) { return lessonMatches(lesson, selection); })
      .sort(function (a, b) {
        if (a.day !== b.day) return a.day - b.day;
        return a.slot - b.slot;
      });
  }

  function datesFor(lesson) {
    if (!state.dates.has(lesson.id)) {
      state.dates.set(lesson.id, D.occurrences(lesson, S.SEMESTER));
    }
    return state.dates.get(lesson.id);
  }

  /* «Веліченко Олександр Борисович» → «Веліченко О. Б.» */
  function shortName(fullName) {
    var parts = fullName.split(' ');
    if (parts.length < 3) return fullName;
    return parts[0] + ' ' + parts[1].charAt(0) + '. ' + parts[2].charAt(0) + '.';
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function nowTime() {
    var now = new Date();
    return pad2(now.getHours()) + ':' + pad2(now.getMinutes());
  }

  function plural(number, one, few, many) {
    var mod10 = number % 10;
    var mod100 = number % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  function nextClass(lessons) {
    var today = D.todayISO();
    var clock = nowTime();
    var best = null;
    lessons.forEach(function (lesson) {
      datesFor(lesson).forEach(function (date) {
        if (date < today) return;
        if (date === today && lesson.start <= clock) return;
        if (!best || (date + lesson.start) < (best.date + best.lesson.start)) {
          best = { date: date, lesson: lesson };
        }
      });
    });
    return best;
  }

  /* ---------- картки ---------- */

  function typeBadge(type) {
    var meta = TYPE_META[type] || TYPE_META.lecture;
    return '<span class="badge ' + meta.cls + '">' + meta.label + '</span>';
  }

  function cadenceBadge(lesson, compact) {
    var meta = CADENCE[lesson.parity] || CADENCE.all;
    if (!compact) {
      return '<span class="badge badge--ghost ' + meta.cls + '">' + meta.label + '</span>';
    }
    return '<span class="badge badge--ghost badge--cadence ' + meta.cls +
      '" title="' + meta.label + '" aria-label="' + meta.label + '">' +
      meta.short + '</span>';
  }

  function makeCard(lesson, mode) {
    var card = document.createElement('article');
    card.className = 'card ' + (TYPE_META[lesson.type] || TYPE_META.lecture).cls;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', lesson.subject + ', ' + lesson.start + '–' + lesson.end);

    var dates = datesFor(lesson);
    var compact = mode === 'grid';

    card.innerHTML = [
      '<header class="card__head">',
      compact ? '' : '<span class="card__time">' + lesson.start + '–' + lesson.end + '</span>',
      typeBadge(lesson.type),
      compact ? '' : cadenceBadge(lesson),
      '</header>',
      '<h3 class="card__title">' + lesson.subject + '</h3>',
      '<p class="card__subtitle">' + lesson.subtitle + '</p>',
      '<p class="card__teacher">' + shortName(lesson.teacher) + '</p>',
      '<footer class="card__foot">',
      '<span class="card__meta">' + dates.length + ' ' +
        plural(dates.length, 'заняття', 'заняття', 'занять') + '</span>',
      compact
        ? '<span class="card__foot-end">' + cadenceBadge(lesson, true) +
          '<span class="card__cta">Деталі →</span></span>'
        : '<span class="card__cta">Деталі →</span>',
      '</footer>'
    ].join('');

    function open() { openModal(lesson); }
    card.addEventListener('click', open);
    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });

    return card;
  }

  /* ---------- тижнева сітка ---------- */

  function renderWeek(lessons, week) {
    var grid = document.createElement('div');
    grid.className = 'week';

    /* Показуємо лише ті пари, які реально є в цієї групи. */
    var used = [];
    S.SLOTS.forEach(function (slot, index) {
      var busy = lessons.some(function (lesson) {
        return index >= lesson.slot && index < lesson.slot + (lesson.span || 1);
      });
      if (busy) used.push({ index: index, slot: slot });
    });
    var positionOf = {};
    used.forEach(function (entry, position) {
      positionOf[entry.index] = position;
    });
    grid.style.gridTemplateRows = 'auto repeat(' + Math.max(used.length, 1) + ', minmax(136px, auto))';

    var corner = document.createElement('div');
    corner.className = 'week__corner';
    corner.textContent = 'Пара';
    grid.appendChild(corner);

    for (var day = 1; day <= 5; day += 1) {
      var head = document.createElement('div');
      head.className = 'week__day';
      var date = week && week.days[day];
      head.innerHTML = '<span>' + D.DAY_NAMES[day] + '</span><small>' +
        (date ? D.formatDayMonth(date) : D.DAY_SHORT[day]) + '</small>';
      grid.appendChild(head);
    }

    used.forEach(function (entry, position) {
      var label = document.createElement('div');
      label.className = 'week__slot';
      label.innerHTML = '<strong>' + entry.slot.start + '</strong><span>' + entry.slot.end + '</span>';
      label.style.gridColumn = '1';
      label.style.gridRow = String(position + 2);
      grid.appendChild(label);
    });

    lessons.forEach(function (lesson) {
      var card = makeCard(lesson, 'grid');
      card.style.gridColumn = String(lesson.day + 1);
      card.style.gridRow = (positionOf[lesson.slot] + 2) + ' / span ' + (lesson.span || 1);
      grid.appendChild(card);
    });

    return grid;
  }

  /* ---------- список (мобільний / детальний) ---------- */

  function renderAgenda(lessons, week) {
    var wrap = document.createElement('div');
    wrap.className = 'agenda';

    var byDay = new Map();
    lessons.forEach(function (lesson) {
      if (!byDay.has(lesson.day)) byDay.set(lesson.day, []);
      byDay.get(lesson.day).push(lesson);
    });

    [1, 2, 3, 4, 5].forEach(function (day) {
      var list = byDay.get(day) || [];
      var section = document.createElement('section');
      section.className = 'agenda__day' + (list.length ? '' : ' is-empty');

      var head = document.createElement('header');
      head.className = 'agenda__head';
      var date = week && week.days[day];
      head.innerHTML = '<h3>' + D.DAY_NAMES[day] +
        (date ? ' <small class="agenda__date">' + D.formatDayMonth(date) + '</small>' : '') +
        '</h3><span>' +
        (list.length ? list.length + ' ' + plural(list.length, 'заняття', 'заняття', 'занять') : 'вільно') +
        '</span>';
      section.appendChild(head);

      if (!list.length) {
        var empty = document.createElement('p');
        empty.className = 'agenda__empty';
        empty.textContent = 'Занять немає';
        section.appendChild(empty);
      } else {
        list.forEach(function (lesson) {
          section.appendChild(makeCard(lesson, 'list'));
        });
      }

      wrap.appendChild(section);
    });

    return wrap;
  }

  /* ---------- підсумок ---------- */

  function renderSummary(selection, lessons) {
    var subjects = new Set(lessons.map(function (lesson) { return lesson.subject; }));
    var students = selection.variant ? selection.variant.students : selection.group.students;
    var next = nextClass(lessons);
    var totalMeetings = lessons.reduce(function (sum, lesson) {
      return sum + datesFor(lesson).length;
    }, 0);

    var groupLabel = selection.variant ? selection.variant.label : selection.group.label;
    var specialty = selection.group.specialty;
    var specialtyHint = selection.variant && selection.variant.note
      ? specialty + ' · ' + selection.variant.note
      : specialty;

    el.summary.innerHTML = [
      '<div class="stat">',
      '<span class="stat__label">Спеціальність</span>',
      '<strong class="stat__value">' + groupLabel + '</strong>',
      '<span class="stat__hint">' + specialtyHint + '</span>',
      '</div>',
      '<div class="stat">',
      '<span class="stat__label">Аспірантів</span>',
      '<strong class="stat__value">' + (students || selection.group.students) + '</strong>',
      '<span class="stat__hint">денна форма</span>',
      '</div>',
      '<div class="stat">',
      '<span class="stat__label">Дисциплін</span>',
      '<strong class="stat__value">' + subjects.size + '</strong>',
      '<span class="stat__hint">' + totalMeetings + ' ' +
        plural(totalMeetings, 'заняття', 'заняття', 'занять') + ' за семестр</span>',
      '</div>',
      '<div class="stat stat--next">',
      '<span class="stat__label">Наступне заняття</span>',
      next
        ? '<strong class="stat__value">' + D.formatDate(next.date, { day: 'numeric', month: 'long' }) + '</strong>' +
          '<span class="stat__hint">' + next.lesson.start + ' · ' + next.lesson.subject + '</span>'
        : '<strong class="stat__value">—</strong><span class="stat__hint">Семестр завершено</span>',
      '</div>'
    ].join('');
  }

  /* ---------- модальне вікно ---------- */

  function calendarButtons(lesson, dates) {
    var wrap = document.createElement('div');
    wrap.className = 'cal';
    if (!dates.length) return wrap;

    var google = C.googleUrl(lesson, dates);
    var outlook = C.outlookUrl(lesson, dates[0], dates);

    wrap.innerHTML = [
      '<a class="btn btn--cal btn--google" target="_blank" rel="noopener" href="' + google + '">',
      '<span class="btn__dot"></span>Google Календар</a>',
      '<a class="btn btn--cal btn--outlook" target="_blank" rel="noopener" href="' + outlook + '">',
      '<span class="btn__dot"></span>Outlook</a>',
      '<button type="button" class="btn btn--cal btn--ics">',
      '<span class="btn__dot"></span>iCal / .ics</button>'
    ].join('');

    wrap.querySelector('.btn--ics').addEventListener('click', function () {
      var suffix = dates.length === 1 ? dates[0] : 'cycle';
      C.download('udhtu-' + lesson.id + '-' + suffix + '.ics', C.lessonICS(lesson, dates));
    });

    return wrap;
  }

  function renderModalBody(lesson, selectedDate) {
    var allDates = datesFor(lesson);
    var dates = selectedDate ? [selectedDate] : allDates;
    var target = selectedDate ? dates : allDates;

    var parts = [];
    parts.push('<div class="modal__badges">' + typeBadge(lesson.type) + cadenceBadge(lesson) + '</div>');
    parts.push('<h2 id="modalTitle">' + lesson.subject + '</h2>');
    parts.push('<p class="modal__subtitle">' + lesson.subtitle +
      (/годин/i.test(lesson.subtitle) ? '' : ' · ' + lesson.hours + ' години') + '</p>');

    parts.push('<dl class="detail">');
    parts.push('<div><dt>Коли</dt><dd>' + D.DAY_NAMES[lesson.day] + ', ' + lesson.start + '–' + lesson.end + '</dd></div>');
    parts.push('<div><dt>Викладач</dt><dd><strong>' + lesson.teacher + '</strong><br>' + lesson.teacherInfo + '</dd></div>');
    var cycleSpan = allDates.length
      ? D.formatDate(allDates[0], { day: 'numeric', month: 'short' }) + ' — ' +
        D.formatDate(allDates[allDates.length - 1], { day: 'numeric', month: 'short' })
      : D.formatRange(lesson);
    parts.push('<div><dt>Період</dt><dd>' + cycleSpan + ' · ' +
      (CADENCE[lesson.parity] || CADENCE.all).label.toLowerCase() + '</dd></div>');
    parts.push('<div><dt>Формат</dt><dd>' + lesson.format + '</dd></div>');
    parts.push('</dl>');

    if (lesson.links && lesson.links.length) {
      parts.push('<div class="modal__links">' + lesson.links.map(function (link) {
        return '<a class="link" href="' + link.url + '" target="_blank" rel="noopener">' +
          link.label + ' ↗</a>';
      }).join('') + '</div>');
    }

    if (lesson.note) {
      parts.push('<p class="note">' + lesson.note + '</p>');
    }

    parts.push('<p class="modal__hint">' + (selectedDate
      ? 'Обрано одне заняття — кнопки нижче додадуть лише його *'
      : 'Кнопки нижче додадуть увесь цикл (' + allDates.length + ' ' +
        plural(allDates.length, 'заняття', 'заняття', 'занять') + ') *') + '</p>');

    var holder = document.createElement('div');
    holder.innerHTML = parts.join('');
    holder.appendChild(calendarButtons(lesson, target));

    var dateSection = document.createElement('div');
    dateSection.className = 'modal__dates';
    dateSection.innerHTML = '<div class="modal__section-head"><h3>Дати занять</h3>' +
      (selectedDate ? '<button type="button" class="link link--reset" id="resetDate">увесь цикл</button>' : '') +
      '</div><div class="dates">' + allDates.map(function (date) {
        var active = selectedDate === date ? ' is-active' : '';
        return '<button type="button" class="date' + active + '" data-date="' + date + '">' +
          D.formatDate(date, { day: 'numeric', month: 'short' }) + '</button>';
      }).join('') + '</div>';
    holder.appendChild(dateSection);

    var note = document.createElement('p');
    note.className = 'modal__fineprint';
    note.textContent = '* Outlook-посилання додає найближче заняття. Щоб додати весь цикл у Outlook, ' +
      'скористайтеся файлом .ics — він відкривається і в Outlook, і в Apple Calendar.';
    holder.appendChild(note);

    return holder;
  }

  function openModal(lesson) {
    state.modal = { lesson: lesson, selectedDate: null };
    paintModal();
    el.modal.hidden = false;
    el.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    el.modal.querySelector('.modal__close').focus();
  }

  function paintModal() {
    if (!state.modal) return;
    var lesson = state.modal.lesson;
    var selected = state.modal.selectedDate;

    el.modalBody.innerHTML = '';
    el.modalBody.appendChild(renderModalBody(lesson, selected));

    Array.prototype.forEach.call(el.modalBody.querySelectorAll('.date'), function (button) {
      button.addEventListener('click', function () {
        var date = button.getAttribute('data-date');
        state.modal.selectedDate = state.modal.selectedDate === date ? null : date;
        paintModal();
      });
    });

    var reset = el.modalBody.querySelector('#resetDate');
    if (reset) {
      reset.addEventListener('click', function () {
        state.modal.selectedDate = null;
        paintModal();
      });
    }
  }

  function closeModal() {
    el.modal.hidden = true;
    el.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    state.modal = null;
  }

  /* ---------- вибір спеціальності ---------- */

  function renderChips() {
    el.chips.innerHTML = '';
    S.GROUPS.forEach(function (group) {
      if (group.variants) {
        group.variants.forEach(function (variant) {
          el.chips.appendChild(makeChip(
            variant.key,
            variant.label,
            group.specialty + (variant.note ? ' · ' + variant.note : ''),
            group
          ));
        });
        return;
      }
      el.chips.appendChild(makeChip(group.code, group.label, group.specialty, group));
    });
  }

  function makeChip(key, label, hint, group) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.key = key;
    button.innerHTML = '<span class="chip__code">' + label + '</span>' +
      '<span class="chip__hint">' + (hint || '') + '</span>';
    button.title = label + ' · ' + hint + (group && group.field ? ' · Галузь: ' + group.field : '');
    button.addEventListener('click', function () {
      applySelection(key, true);
    });
    return button;
  }

  function fillDatalist() {
    el.datalist.innerHTML = '';
    S.GROUPS.forEach(function (group) {
      var option = document.createElement('option');
      option.value = group.label;
      option.textContent = group.label + ' · ' + group.specialty;
      el.datalist.appendChild(option);
    });
  }

  /* ---------- головний рендер ---------- */

  function applySelection(input, shouldScroll) {
    var selection = resolveSelection(input);
    if (!selection) {
      el.hint.textContent = 'Невідомий код спеціальності. Доступні: ' +
        S.GROUPS.map(function (group) { return group.label; }).join(', ') + '.';
      el.hint.classList.add('is-error');
      el.result.hidden = true;
      el.empty.hidden = false;
      return;
    }

    state.selection = selection;
    el.hint.classList.remove('is-error');
    el.hint.textContent = selection.variant
      ? selection.variant.label + ' · ' + selection.group.specialty +
        (selection.variant.note ? ' · ' + selection.variant.note : '')
      : selection.group.label + ' · ' + selection.group.specialty;

    el.input.value = displayLabel(selection);

    Array.prototype.forEach.call(el.chips.querySelectorAll('.chip'), function (chip) {
      var active = chip.dataset.key === selection.key;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (window.location.hash !== '#' + selection.key) {
      history.replaceState(null, '', '#' + selection.key);
    }

    el.empty.hidden = true;
    renderResult(selection, shouldScroll !== false);
  }

  function renderResult(selection, shouldScroll) {
    var lessons = lessonsFor(selection);
    var week = D.currentWeek();
    el.result.hidden = false;

    el.weekTitle.textContent = 'Розклад на поточний тиждень ' +
      D.formatShortDate(week.start) + '-' + D.formatShortDate(week.end);

    renderSummary(selection, lessons);

    el.weekWrap.innerHTML = '';
    el.weekWrap.appendChild(renderWeek(lessons, week));

    el.agendaWrap.innerHTML = '';
    el.agendaWrap.appendChild(renderAgenda(lessons, week));

    el.allIcs.onclick = function () {
      var entries = lessons.map(function (lesson) {
        return { lesson: lesson, dates: datesFor(lesson) };
      });
      C.download('udhtu-rozklad-' + selection.key + '.ics', C.scheduleICS(entries));
    };

    if (shouldScroll) {
      scrollToResult();
    }
  }

  /* Прокручуємо до початку результату, але з відступом на висоту липкої
     шапки — інакше картки спеціальності ховаються під нею. */
  function scrollToResult() {
    var topbar = document.querySelector('.topbar');
    var offset = (topbar ? topbar.getBoundingClientRect().height : 0) + 12;
    var top = window.scrollY + el.result.getBoundingClientRect().top - offset;
    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: Math.max(0, Math.round(top)),
      behavior: reduce ? 'auto' : 'smooth'
    });
  }

  /* ---------- ініціалізація ---------- */

  function cacheElements() {
    el.input = document.getElementById('groupInput');
    el.datalist = document.getElementById('groupList');
    el.hint = document.getElementById('pickerHint');
    el.chips = document.getElementById('groupChips');
    el.result = document.getElementById('result');
    el.summary = document.getElementById('summary');
    el.weekWrap = document.getElementById('weekView');
    el.agendaWrap = document.getElementById('agendaView');
    el.weekTitle = document.getElementById('weekTitle');
    el.allIcs = document.getElementById('allIcs');
    el.modal = document.getElementById('modal');
    el.modalBody = document.getElementById('modalBody');
    el.empty = document.getElementById('empty');
  }

  function bindEvents() {
    document.getElementById('picker').addEventListener('submit', function (event) {
      event.preventDefault();
      applySelection(el.input.value.trim(), true);
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (node) {
      node.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && state.modal) closeModal();
    });

    window.addEventListener('hashchange', function () {
      if (window.location.hash.length > 1) {
        applySelection(window.location.hash.slice(1), true);
      }
    });
  }

  function init() {
    cacheElements();
    renderChips();
    fillDatalist();
    bindEvents();

    var stored = null;
    try {
      stored = localStorage.getItem('udhtu-group');
    } catch (error) {
      stored = null;
    }

    var initial = window.location.hash.length > 1
      ? window.location.hash.slice(1)
      : (stored || '');

    if (initial) {
      applySelection(initial, false);
    } else {
      el.hint.textContent = 'Введіть код спеціальності з шапки розкладу — наприклад G3, E3 або Н1.';
    }

    el.input.addEventListener('change', function () {
      var found = resolveSelection(el.input.value);
      if (!found) return;
      try {
        localStorage.setItem('udhtu-group', found.key);
      } catch (error) {
        /* приватний режим — просто ігноруємо */
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
