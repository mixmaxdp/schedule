# Розклад занять · аспіранти І курсу · УДХТУ 2026/2027

An offline-first, zero-dependency web page that turns the official PDF timetable of
ННІ УДХТУ into a per-specialty schedule with one-click calendar export.

The codes in the table header (`A7`, `F3`, `C1`, `G1`, `G8`, `G11`, `E3`, `G3`, `Н1`) are
**specialty codes** from the official list, not student group numbers. A student picks
their code (for example `G3`) and gets:

- the weekly grid (desktop) or a day-by-day list (mobile);
- subject, class type, teacher, format and room/Zoom link for every class;
- the exact dates of every meeting, including alternating-week (чисельник/знаменник) classes;
- **Google Calendar**, **Outlook** and **iCal (.ics)** buttons per class, plus a whole-schedule `.ics`.

## Run it

No build step, no dependencies, no server required:

```bash
open index.html          # macOS
# or
xdg-open index.html      # Linux
```

It also works from `file://`, from a USB stick, or from any static host.
For a local server (optional):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Data source

`source/Розклад_занять_1_семестр_2026_2027_УДХТУ.pdf` — «Розклад занять аспірантів першого
курсу денної форми навчання на І семестр 2026-2027 навчального року», затверджено
29.09.2026. The signed PDF is kept in `source/` so the project is self-contained.

The PDF is a table with merged cells, so the specialty → class mapping was **not** taken from
plain text extraction. The mapping was recovered from the table's vector gridlines
(vertical/horizontal rules in `page.rects`) and cross-checked against word coordinates and
rendered page images. The recovered spans split the English streams into two clean
cohorts of 29 students each, which corroborates the reading:

| Stream 1 (29) | Stream 2 (29) |
| --- | --- |
| A7 = 5, F3 = 3, C1 = 1, G1 = 14, G8 = 2, G11 = 4 | E3 = 13, G3 = 11, Н1 = 5 |

## Specialties

The header codes are decoded per the list approved by Cabinet of Ministers resolution
№ 1021 of 30.08.2024 — [zakon.rada.gov.ua/laws/show/1021-2024-п](https://zakon.rada.gov.ua/laws/show/1021-2024-%D0%BF#Text).

| Code | Specialty (official name) | Field of knowledge | Students | Classes in this schedule |
| --- | --- | --- | --- | --- |
| `A7` | Фізична культура і спорт | Освіта | 5 | English (Mon), Philosophy seminar (Wed), Philosophy lecture (Wed) |
| `F3` | Комп’ютерні науки | Інформаційні технології | 3 | 7 classes (both streams' subjects) |
| `C1` | Економіка | Соціальні науки, журналістика та інформація | 1 | 7 |
| `G1` | Хімічні технології та інженерія | Інженерія, виробництво та будівництво | 14 | 7 |
| `G8` | Матеріалознавство | Інженерія, виробництво та будівництво | 2 | 7 |
| `G11` | Машинобудування | Інженерія, виробництво та будівництво | 4 | 7 |
| `E3` | Хімія | Природничі науки, математика та статистика | 13 | 7 |
| `G3` | Електрична інженерія | Інженерія, виробництво та будівництво | 11 | 7 |
| `Н1` | Агрономія | Сільське, лісове, рибне господарство та ветеринарна медицина | 5 + 5 | split into two cohorts, see below |

### Н1 is two cohorts

The header cell under `Н1` reads:

```
Агрономія-
I курс, 5 асп. (Іноземна мова)
II курс, 5 асп. (Філософія науки)
```

The page therefore exposes **Н1 · І курс** and **Н1 · ІІ курс** as separate chips.
The first cohort is modelled with the English class (Thu 13:00) only, the second with the
two Philosophy classes (Wed 13:00 lecture and Wed 14:30 seminar). The shared Philosophy
lecture is limited to the second cohort via `course: { N1: 2 }`.

## Assumptions and interpretations

These are the judgement calls made while digitising the PDF. They are deliberately
centralised in `assets/data.js` so they are easy to correct.

1. **Two-hour classes are one pair.** A cell that says `2 години` is rendered as a single
   80-minute pair. For example, Monday `Методологія (практичні, 2 години)` is `11:00–12:20`.
2. **The four-hour lecture is two pairs.** Tuesday `Методологія (лекції 4 години)` is
   `11:00–14:20`, i.e. `11:00–12:20` and `13:00–14:20` back to back.
3. **Parity weeks.** The semester starts on Monday **05.10.2026** and that week is
   **знаменник** (denominator). Weeks alternate: знаменник, чисельник, знаменник, …
   Only the IT lab is parity-bound (`знаменник`), so its dates are
   06.10, 20.10, 03.11, 17.11, 01.12, 15.12.
4. **Date ranges are inclusive and weekday-aligned.** Each lesson carries `from`/`to`
   dates; occurrences are generated on the lesson's weekday inside that range, filtered by
   parity. This is why the Methodology practical starts on 16.11 while the Methodology
   lecture ends on 15.11.
5. **Н1 course split** as described above. The source table has one `Н1` column covering
   both cohorts, so the split follows the parenthetical notes in the header rather than a
   separate column.
6. **Teacher names and academic titles** are copied from the PDF as written. Short names on
   cards are derived as `Прізвище І. Б.`.

## Interface notes

- The schedule always opens on the current week, and the heading follows the local
  date: «Розклад на поточний тиждень `dd.mm.yy-dd.mm.yy`» (Monday–Sunday). On any
  other week it reads «Розклад на тиждень `dd.mm.yy-dd.mm.yy`».
- A week switcher (`‹` / `Сьогодні` / `›`) walks through the semester weeks. The
  semester is sliced into Monday-based weeks from `SEMESTER.start` to `SEMESTER.end`
  (12 weeks for 2026/2027 autumn), the arrows are disabled at the first and last week,
  and «Сьогодні» returns to the current week and disables itself there. A meta line
  under the heading shows «Тиждень N із 12 · чисельник/знаменник».
- Only lessons that actually take place in the selected week are rendered: biweekly
  parity (`чис.`/`знам.`) and each lesson's `from`/`to` range are respected. Weeks
  without classes show «Цього тижня занять немає.». The summary statistics and the
  «Увесь розклад у .ics» export always cover the whole semester.
- Weekday columns and mobile agenda headings show the date next to the day name
  (`Понеділок 02.11`), so the current week is readable without opening the modal.
- Grid cards show the full class type (`Лекція`, `Практичні`, `Семінар`,
  `Лабораторні`) on one line, and a short cadence badge in the footer
  (`щотиж.`, `чис.`, `знам.`) with the full word in its tooltip. The agenda and
  modal keep the full badges (`Щотижня`, `Чисельник`, `Знаменник`).
- Choosing a chip scrolls to the result with an offset equal to the sticky header
  height, so the specialty summary cards stay fully visible instead of hiding under
  the header. Opening a link with `#CODE` deliberately does not scroll.
- The modal is compact and puts the calendar buttons above the date chips, so
  Google Calendar / Outlook / iCal are visible without scrolling at laptop heights.
- The hint above those buttons ends with `*`, and the fineprint below the date chips
  starts with `* Outlook-посилання додає найближче заняття…` — the asterisk pair marks
  the Outlook one-meeting limitation without repeating it inline.
- «ННІ УДХТУ» in the header links to <https://udhtu.edu.ua/>; the footer contains the
  source link and the author credit. It lives outside `#result`, so it is visible on
  the empty state too, before any specialty is selected.

## Calendar integration

All three exports are generated in the browser; nothing is uploaded anywhere.

- **Google Calendar** — a prefilled `action=TEMPLATE` link. Times are sent as floating local
  times with `ctz=Europe/Kyiv`, plus an `RRULE` that repeats weekly (every two weeks for
  lab classes) for the exact number of meetings.
- **Outlook** — an `outlook.live.com/calendar/0/deeplink/compose` link. Outlook deeplinks do
  not support recurrence, so this button adds **the next meeting only**. The modal says so.
- **iCal / .ics** — a generated RFC 5545 file with **one recurring `VEVENT` per class cycle**
  (`RRULE:FREQ=WEEKLY`, `INTERVAL=2` for the biweekly lab, `COUNT` = number of meetings),
  a `VTIMEZONE` block for `Europe/Kyiv` and `DTSTART;TZID` local times, so a series that
  crosses the 25.10.2026 DST switch keeps its wall-clock slot. Each event carries the
  teacher, the class type, the date range, the Zoom/Classroom link, a 15-minute `VALARM`,
  and **both** a plain `DESCRIPTION` and an HTML `X-ALT-DESC` — Outlook renders the HTML
  body, and some clients ignore the plain-text one.

Why a series instead of one `VEVENT` per date: exporting every meeting separately made
Outlook fold same-named events into one series on import and keep the description only on
the current week's occurrence; later occurrences showed just the title and the Zoom link.
A real `RRULE` master has a single body that every occurrence inherits.

The class-level `.ics` contains the whole cycle as a series; selecting a single date chip in
the modal exports a one-off `VEVENT` for that meeting. «Увесь розклад у .ics» exports one
series per class of the selected specialty.

Times are computed from the lesson's `start`/`end` plus a Kyiv DST helper in
`assets/calendar.js` (`kyivOffset`), rather than from a timezone database; the `.ics` writer
emits the matching `VTIMEZONE` rules.

## Files

```
Schedule/
├── index.html            page shell, picker, weekly/agenda containers, modal
├── assets/
│   ├── styles.css        design system, dark mode, responsive, print styles
│   ├── logo-udhtu.png    УДХТУ seal, white background keyed out for the header chip
│   ├── logo-udunt.png    УДУНТ seal, trimmed and scaled for the header chip
│   ├── data.js           SEMESTER, SLOTS, GROUPS, LESSONS, Zoom/Classroom links
│   ├── dates.js          occurrence generation, parity, Ukrainian date formatting
│   ├── calendar.js       Google/Outlook URLs, .ics builder, Kyiv DST handling
│   └── app.js            selection state, grid, agenda, modal, hash routing
├── source/
│   └── Розклад_занять_1_семестр_2026_2027_УДХТУ.pdf   original signed timetable
└── README.md
```

`assets/data.js` is the **single source of truth** for the schedule. Everything else is
presentation and date arithmetic.

## Updating the schedule

1. Edit `assets/data.js`. A lesson looks like this:

```js
{
  id: 'it-lab',                  // stable, used in UIDs and file names
  day: 2,                        // 1 = Monday … 5 = Friday
  slot: 5,                       // index into SLOTS (0 = 08:00)
  span: 1,                       // how many SLOTS rows the card covers
  start: '16:00', end: '17:20',
  subject: '…', subtitle: '…',    // subtitle is shown under the title
  type: 'lab',                   // lecture | practical | seminar | lab
  hours: 2,
  teacher: '…', teacherInfo: '…',
  groups: ['E3', 'G3'],           // specialty codes that attend this class
  course: { N1: 2 },             // optional: restrict a specialty to one cohort
  from: '2026-10-05', to: '2026-12-27',
  parity: 'numerator',           // 'all' | 'numerator' | 'denominator'
  format: 'Онлайн · Zoom',
  note: '…',                     // optional free text shown in the modal
  links: [{ label: 'Zoom', url: '…' }]
}
```

2. To roll over to a new semester, change only `SEMESTER.start`, `SEMESTER.end` and
   `SEMESTER.firstWeek` (`'numerator'` or `'denominator'`), then update each lesson's
   `from`/`to` and parity.
3. Reload the page. No rebuild needed.

## Known limitations

- This is an **unofficial** interactive copy. If it disagrees with the document from the
  відділ аспірантури та докторантури, the document wins.
- Outlook deeplinks cannot express recurrence, which is why the modal falls back to `.ics`
  for the whole cycle.
- The Н1 split and the "all groups" Philosophy lecture are interpretations of a merged
  table cell, not separate rows in the source.
- Calendar links assume the browser's locale can open the respective service; the `.ics`
  file is the most portable option.

## QA performed

- `node --check` passes on all four scripts.
- A Node smoke test validates every specialty's occurrences (weekday, range, parity) and
  confirms all lessons have at least one date.
- Browser checks: `G3`, `Н1 · І курс`, `Н1 · ІІ курс`, an invalid code, hash routing,
  keyboard-opened modal, date chips, Google/Outlook URLs, `.ics` download and unfolding,
  desktop grid, mobile agenda, dark mode and print styles.
- Week navigation is covered by a headless-browser run: first/last week bounds, all 12
  week headings and parity labels, in-week filtering (biweekly lab, lecture ending
  15.11, practical starting 16.11), «Сьогодні» reset, agenda on a 390 px viewport,
  dark mode, no horizontal overflow down to 390 px, and a whole-semester `.ics` export
  that stays unchanged while browsing weeks.
- The `.ics` builder is validated with `ical.js`: every cycle is one series with the exact
  `COUNT`, expansions reproduce the same dates, local times stay fixed across the DST
  switch, and every `VEVENT` has both `DESCRIPTION` and `X-ALT-DESC`.
