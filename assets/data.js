/* Розклад занять аспірантів І курсу ННІ УДХТУ, І семестр 2026/2027.
   Джерело: «Розклад_занять_1_семестр_2026_2027_УДХТУ.pdf» (затверджено 29.09.2026). */
(function (global) {
  'use strict';

  var SEMESTER = {
    start: '2026-10-05',
    end: '2026-12-27',
    firstWeek: 'denominator'
  };

  var SLOTS = [
    { start: '08:00', end: '09:20' },
    { start: '09:30', end: '10:50' },
    { start: '11:00', end: '12:20' },
    { start: '13:00', end: '14:20' },
    { start: '14:30', end: '15:50' },
    { start: '16:00', end: '17:20' }
  ];

  /* Коди спеціальностей — як у шапці таблиці PDF. Назви й галузі знань —
     за переліком, затвердженим постановою КМУ від 30.08.2024 № 1021. */
  var GROUPS = [
    { code: 'A7', label: 'A7', specialty: 'Фізична культура і спорт', field: 'Освіта', students: 5 },
    { code: 'F3', label: 'F3', specialty: 'Комп’ютерні науки', field: 'Інформаційні технології', students: 3 },
    { code: 'C1', label: 'C1', specialty: 'Економіка', field: 'Соціальні науки, журналістика та інформація', students: 1 },
    { code: 'G1', label: 'G1', specialty: 'Хімічні технології та інженерія', field: 'Інженерія, виробництво та будівництво', students: 14 },
    { code: 'G8', label: 'G8', specialty: 'Матеріалознавство', field: 'Інженерія, виробництво та будівництво', students: 2 },
    { code: 'G11', label: 'G11', specialty: 'Машинобудування', field: 'Інженерія, виробництво та будівництво', students: 4 },
    { code: 'E3', label: 'E3', specialty: 'Хімія', field: 'Природничі науки, математика та статистика', students: 13 },
    { code: 'G3', label: 'G3', specialty: 'Електрична інженерія', field: 'Інженерія, виробництво та будівництво', students: 11 },
    {
      code: 'N1',
      label: 'Н1',
      specialty: 'Агрономія',
      field: 'Сільське, лісове, рибне господарство та ветеринарна медицина',
      students: 5,
      variants: [
        { key: 'N1-1', label: 'Н1 · І курс', course: 1 },
        { key: 'N1-2', label: 'Н1 · ІІ курс', course: 2 }
      ]
    }
  ];

  var ZOOM = {
    savchenko: 'https://udhtu-ukr-education.zoom.us/j/6829011997?pwd=cVdEa3NQZ09Tc3Z1TmxTZU96WEpUdz09',
    velichenko: 'https://udhtu-ukr-education.zoom.us/j/85280203453?pwd=G0H1BX8n96ZPoRTRd8jQxu9hauyqkq.1',
    gnatush: 'https://ust-edu-ua.zoom.us/j/82194047481?pwd=WkNXNzAxTEFMazg4V1NyazdOMDhhQT09',
    classroom: 'https://classroom.google.com/c/MTc5NTI4Njk1OTM1?cjc=k3np5m7',
    chychkov: 'https://us04web.zoom.us/j/8244151817?pwd=Mh1YT6xWDXVAtVNIwFt9H4mKDae9QL.1',
    khmil: 'https://ust-edu-ua.zoom.us/j/5409077331?pwd=Y0s1ZmpXY2lhendqbjdaK280TmQwdz09',
    beskaravainyi: 'https://udhtu-ukr-education.zoom.us/j/2062842474?pwd=U3RnaTVVN1ZYdzVmc0xFQnFYRWZnZz09&omn=81378838726',
    karmazina: 'https://udhtu-ukr-education.zoom.us/j/89496476720?pwd=a3JwdklPSFBIbXhYN09TY29vTzBrZz09'
  };

  var WEEK_ALL = 'all';
  var WEEK_NUM = 'numerator';
  var WEEK_DEN = 'denominator';

  var LESSONS = [
    {
      id: 'eng-a',
      day: 1,
      slot: 1,
      span: 1,
      start: '09:30',
      end: '10:50',
      subject: 'Іноземна мова в науковій діяльності',
      subtitle: 'Англійська мова',
      type: 'practical',
      hours: 2,
      teacher: 'Савченко Олександр Вікторович',
      teacherInfo: 'к. філол. н., доцент, завідувач кафедри філології та перекладу ННІ УДХТУ',
      groups: ['A7', 'F3', 'C1', 'G1', 'G8', 'G11'],
      from: '2026-10-05',
      to: '2026-12-27',
      parity: WEEK_ALL,
      format: 'Онлайн · Zoom',
      links: [{ label: 'Zoom', url: ZOOM.savchenko }]
    },
    {
      id: 'method-practice',
      day: 1,
      slot: 2,
      span: 1,
      start: '11:00',
      end: '12:20',
      subject: 'Методологія і планування наукових досліджень',
      subtitle: 'Практичні за спеціальностями',
      type: 'practical',
      hours: 2,
      teacher: 'Веліченко Олександр Борисович',
      teacherInfo: 'д. х. н., професор, завідувач кафедри фізичної хімії ННІ УДХТУ',
      groups: ['F3', 'C1', 'G1', 'G8', 'G11', 'E3', 'G3'],
      from: '2026-11-16',
      to: '2026-12-27',
      parity: WEEK_ALL,
      format: 'Онлайн · Zoom',
      links: [{ label: 'Zoom', url: ZOOM.velichenko }]
    },
    {
      id: 'method-lecture',
      day: 2,
      slot: 2,
      span: 2,
      start: '11:00',
      end: '14:20',
      subject: 'Методологія і планування наукових досліджень',
      subtitle: 'Лекції · 4 години (2 пари)',
      type: 'lecture',
      hours: 4,
      teacher: 'Веліченко Олександр Борисович',
      teacherInfo: 'д. х. н., професор, завідувач кафедри фізичної хімії ННІ УДХТУ',
      groups: ['F3', 'C1', 'G1', 'G8', 'G11', 'E3', 'G3'],
      from: '2026-10-05',
      to: '2026-11-15',
      parity: WEEK_ALL,
      format: 'Онлайн · Zoom',
      note: 'Дві пари поспіль: 11:00–12:20 і 13:00–14:20.',
      links: [{ label: 'Zoom', url: ZOOM.velichenko }]
    },
    {
      id: 'it-lecture',
      day: 2,
      slot: 4,
      span: 1,
      start: '14:30',
      end: '15:50',
      subject: 'Інформаційні технології в наукових дослідженнях',
      subtitle: 'Лекції · 2 години',
      type: 'lecture',
      hours: 2,
      teacher: 'Гнатушенко Вікторія Володимирівна',
      teacherInfo: 'д. т. н., професор, завідувач кафедри інформаційних технологій і систем ННІ ДМетІ',
      groups: ['F3', 'C1', 'G1', 'G8', 'G11', 'E3', 'G3'],
      from: '2026-10-05',
      to: '2026-12-27',
      parity: WEEK_ALL,
      format: 'Онлайн · Zoom + Google Classroom',
      note: 'Zoom: ідентифікатор 821 9404 7481, код доступу 047866. Classroom: код курсу k3np5m7.',
      links: [
        { label: 'Zoom', url: ZOOM.gnatush },
        { label: 'Classroom', url: ZOOM.classroom }
      ]
    },
    {
      id: 'it-lab',
      day: 2,
      slot: 5,
      span: 1,
      start: '16:00',
      end: '17:20',
      subject: 'Інформаційні технології в наукових дослідженнях',
      subtitle: 'Лабораторні · 2 години',
      type: 'lab',
      hours: 2,
      teacher: 'Гнатушенко Вікторія Володимирівна',
      teacherInfo: 'д. т. н., професор, завідувач кафедри інформаційних технологій і систем ННІ ДМетІ',
      groups: ['F3', 'C1', 'G1', 'G8', 'G11', 'E3', 'G3'],
      from: '2026-10-05',
      to: '2026-12-27',
      parity: WEEK_DEN,
      format: 'Онлайн',
      note: 'Лише знаменник (через тиждень). Перший тиждень семестру — знаменник.',
      links: [{ label: 'Zoom', url: ZOOM.gnatush }]
    },
    {
      id: 'phil-seminar-a',
      day: 3,
      slot: 2,
      span: 1,
      start: '11:00',
      end: '12:20',
      subject: 'Філософія науки',
      subtitle: 'Семінари · 2 години',
      type: 'seminar',
      hours: 2,
      teacher: 'Чичков Анатолій Григорович',
      teacherInfo: 'к. філос. н., доцент кафедри філософії та українознавства ННІ УДХТУ',
      groups: ['A7', 'F3', 'C1', 'G1', 'G8', 'G11'],
      from: '2026-10-05',
      to: '2026-12-27',
      parity: WEEK_ALL,
      format: 'Онлайн · Zoom',
      links: [{ label: 'Zoom', url: ZOOM.chychkov }]
    },
    {
      id: 'phil-lecture',
      day: 3,
      slot: 3,
      span: 1,
      start: '13:00',
      end: '14:20',
      subject: 'Філософія науки',
      subtitle: 'Лекції · 2 години',
      type: 'lecture',
      hours: 2,
      teacher: 'Хміль Володимир Васильович',
      teacherInfo: 'д. філос. н., професор, завідувач кафедри філософії і соціології ННІ ДІІТ',
      groups: ['A7', 'F3', 'C1', 'G1', 'G8', 'G11', 'E3', 'G3', 'N1'],
      course: { N1: 2 },
      from: '2026-10-05',
      to: '2026-12-27',
      parity: WEEK_ALL,
      format: 'Онлайн · Zoom',
      note: 'Спільна лекція для всіх груп.',
      links: [{ label: 'Zoom', url: ZOOM.khmil }]
    },
    {
      id: 'phil-seminar-b',
      day: 3,
      slot: 4,
      span: 1,
      start: '14:30',
      end: '15:50',
      subject: 'Філософія науки',
      subtitle: 'Семінари · 2 години',
      type: 'seminar',
      hours: 2,
      teacher: 'Бескаравайний Станіслав Сергійович',
      teacherInfo: 'к. філос. н., доцент, завідувач кафедри філософії та українознавства ННІ УДХТУ',
      groups: ['E3', 'G3', 'N1'],
      course: { N1: 2 },
      from: '2026-10-05',
      to: '2026-12-27',
      parity: WEEK_ALL,
      format: 'Онлайн · Zoom',
      links: [{ label: 'Zoom', url: ZOOM.beskaravainyi }]
    },
    {
      id: 'eng-b',
      day: 4,
      slot: 3,
      span: 1,
      start: '13:00',
      end: '14:20',
      subject: 'Іноземна мова в науковій діяльності',
      subtitle: 'Англійська мова',
      type: 'practical',
      hours: 2,
      teacher: 'Кармазіна Лілія Леонідівна',
      teacherInfo: 'к. т. н., доцент, доцент кафедри філології та перекладу ННІ УДХТУ',
      groups: ['E3', 'G3', 'N1'],
      course: { N1: 1 },
      from: '2026-10-05',
      to: '2026-12-27',
      parity: WEEK_ALL,
      format: 'Онлайн · Zoom',
      links: [{ label: 'Zoom', url: ZOOM.karmazina }]
    }
  ];

  global.SCHEDULE = {
    SEMESTER: SEMESTER,
    SLOTS: SLOTS,
    GROUPS: GROUPS,
    LESSONS: LESSONS,
    WEEK_ALL: WEEK_ALL,
    WEEK_NUM: WEEK_NUM,
    WEEK_DEN: WEEK_DEN
  };
})(window);
