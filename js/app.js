(function () {
  const $ = sel => document.querySelector(sel);
  const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  let sessions = [];

  const hours = min => Math.round(min / 60).toLocaleString('es-ES');
  const fmtDuration = min => (min >= 60 ? `${Math.floor(min / 60)} h ${Math.round(min % 60)} min` : `${Math.round(min)} min`);
  const fmtDate = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') node.textContent = v;
      else if (k === 'style') node.style.cssText = v;
      else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c != null) node.append(c);
    return node;
  }

  function showError(msg) {
    const box = $('#error');
    box.textContent = msg;
    box.hidden = !msg;
  }

  async function loadFile(file) {
    showError('');
    const status = $('#status');
    const setStatus = msg => { status.textContent = msg; status.hidden = !msg; };
    setStatus('Leyendo archivo…');
    try {
      start(await Parsers.parseFile(file, setStatus));
    } catch (e) {
      showError(e.message);
    } finally {
      setStatus('');
    }
  }

  function showResults(years) {
    const select = $('#year');
    select.replaceChildren(...years.map(y => el('option', { value: y, text: y })));
    select.disabled = years.length < 2;
    $('#upload').hidden = true;
    $('#results').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function start(data) {
    sessions = data;
    const ys = Stats.years(sessions);
    showResults(ys);
    render(ys[0]);
  }

  // summary coming from the 3DS app QR code
  async function startFromQR(code) {
    try {
      const s = await QRData.toStats(QRData.decode(code));
      showResults([s.year]);
      renderStats(s);
    } catch (e) {
      showError(e.message);
    }
  }

  function render(year) {
    renderStats(Stats.compute(sessions, Number(year)));
  }

  function renderStats(s) {
    renderTotals(s);
    renderTop(s);
    renderCols($('#months'), s.byMonth, MONTHS, i => `${MONTHS_LONG[i]}: ${hours(s.byMonth[i])} h`);
    renderCols($('#hours'), s.byHour, s.byHour.map((_, h) => (h % 6 === 0 ? String(h) : '')), h => `${h}:00`);
    renderHeatmap(s);
    renderFacts(s);
    renderTicket(s);
  }

  function renderTotals(s) {
    const items = [
      ['Horas', hours(s.totalMinutes)],
      ['Juegos', s.gameCount],
      ['Días', s.daysPlayed, ` /${new Date(s.year, 1, 29).getMonth() === 1 ? 366 : 365}`],
      ['Partidas', s.sessionCount],
    ];
    $('#big-numbers').replaceChildren(...items.map(([label, value, extra]) =>
      el('div', {}, [el('dt', { text: label }), el('dd', {}, [String(value), extra ? el('small', { text: extra }) : null])])
    ));
  }

  function renderTop(s) {
    const top = s.games.slice(0, 10);
    const max = top.length ? top[0].minutes : 1;
    $('#top').replaceChildren(...top.map((g, i) =>
      el('li', {}, [
        el('span', { class: 'rank', text: String(i + 1).padStart(2, '0') }),
        el('span', { class: 'name', text: g.game, title: g.game }),
        el('span', { class: 'val', text: `${hours(g.minutes)} h` }),
        el('span', { class: 'bar' }, el('i', { style: `width:${(g.minutes / max) * 100}%` })),
      ])
    ));
  }

  function renderCols(box, values, labels, title) {
    const max = Math.max(1, ...values);
    const peak = values.indexOf(Math.max(...values));
    box.replaceChildren(...values.map((v, i) =>
      el('div', { class: 'col' + (i === peak && v > 0 ? ' top' : ''), title: title(i) }, [
        el('i', { style: `height:${(v / max) * 100}%` }),
        el('small', { text: labels[i] }),
      ])
    ));
  }

  function renderHeatmap(s) {
    const cells = [];
    const jan1 = new Date(s.year, 0, 1);
    const offset = (jan1.getDay() + 6) % 7; // monday first
    const max = Math.max(1, ...s.byDay.values());

    for (let d = new Date(jan1), i = offset; d.getFullYear() === s.year; d.setDate(d.getDate() + 1), i++) {
      const col = Math.floor(i / 7) + 1;
      if (d.getDate() === 1) {
        cells.push(el('span', { class: 'm', text: MONTHS_SHORT[d.getMonth()], style: `grid-row:1;grid-column:${col} / span 3` }));
      }
      const min = s.byDay.get(Stats.dayKey(d)) || 0;
      const level = min === 0 ? 0 : Math.min(4, Math.ceil((min / max) * 4));
      const label = `${fmtDate(d)}: ${min ? fmtDuration(min) : 'sin jugar'}`;
      cells.push(el('i', { class: 'l' + level, title: label, style: `grid-row:${(i % 7) + 2};grid-column:${col}` }));
    }
    $('#heatmap').replaceChildren(...cells);
  }

  function renderFacts(s) {
    const items = [];
    const add = (label, value, note) =>
      items.push(el('div', {}, [el('dt', { text: label }), el('dd', {}, [value, note ? el('small', { text: note }) : null])]));

    if (s.games[0]) add('Juego del año', s.games[0].game, `${hours(s.games[0].minutes)} h en ${s.games[0].sessions} partidas`);
    add('Perfil', s.personality.name, s.personality.desc);
    if (s.streak.length) add('Racha más larga', `${s.streak.length} días seguidos`, `del ${fmtDate(s.streak.from)} al ${fmtDate(s.streak.to)}`);
    if (s.longestSession) add('Partida más larga', fmtDuration(s.longestSession.minutes), `${s.longestSession.game}, ${fmtDate(s.longestSession.start)}`);
    if (s.bestDay) add('Día con más juego', fmtDate(s.bestDay.date), fmtDuration(s.bestDay.minutes));
    add('Mes con más juego', MONTHS_LONG[s.bestMonth], `${hours(s.byMonth[s.bestMonth])} h`);
    if (s.firstSession) add('Primer juego del año', s.firstSession.game, fmtDate(s.firstSession.start));
    if (s.forgotten && s.games.length > 1) add('El olvidado', s.forgotten.game, `sin abrir desde el ${fmtDate(s.forgotten.last)}`);

    $('#highlights').replaceChildren(...items);
  }

  function weeklyTotals(s) {
    const weeks = new Array(53).fill(0);
    for (const [key, min] of s.byDay) {
      const d = new Date(key + 'T12:00:00');
      const doy = Math.floor((d - new Date(s.year, 0, 1)) / 864e5);
      weeks[Math.min(52, Math.floor(doy / 7))] += min;
    }
    return weeks;
  }

  function renderTicket(s) {
    const row = (a, b) => el('div', { class: 'row' }, [el('span', { text: a }), el('span', { text: b })]);
    const weeks = weeklyTotals(s);
    const wmax = Math.max(1, ...weeks);

    $('#share-card').replaceChildren(
      row('3DS WRAPPED', String(s.year)),
      el('div', { class: 'big' }, [hours(s.totalMinutes), el('small', { text: ' h' })]),
      el('div', { text: 'jugadas este año' }),
      el('hr'),
      ...s.games.slice(0, 5).map((g, i) => row(`${String(i + 1).padStart(2, '0')} ${g.game}`, `${hours(g.minutes)} h`)),
      el('hr'),
      row('Juegos', String(s.gameCount)),
      row('Días jugados', String(s.daysPlayed)),
      row('Racha', `${s.streak.length} días`),
      row('Perfil', s.personality.name),
      el('hr'),
      el('div', { class: 'strip' }, weeks.map(w => el('i', { style: `height:${(w / wmax) * 100}%` }))),
      el('div', { class: 'foot', text: 'p0tzz.github.io/3ds-wrapped' })
    );
    $('#share-card').firstChild.classList.add('head');
  }

  async function downloadCard() {
    if (!window.html2canvas) return showError('No se pudo cargar html2canvas (¿sin conexión?).');
    await document.fonts.ready;
    const canvas = await html2canvas($('#share-card'), { scale: 3, backgroundColor: '#fbfaf6' });
    el('a', { href: canvas.toDataURL('image/png'), download: `3ds-wrapped-${$('#year').value}.png` }).click();
  }

  $('#file').addEventListener('change', e => e.target.files[0] && loadFile(e.target.files[0]));
  $('#demo').addEventListener('click', () => start(SampleData.generate()));
  $('#year').addEventListener('change', e => render(e.target.value));
  $('#download').addEventListener('click', downloadCard);
  $('#reset').addEventListener('click', () => {
    $('#results').hidden = true;
    $('#upload').hidden = false;
    $('#file').value = '';
    if (location.hash) history.replaceState(null, '', location.pathname);
  });

  const dz = $('#dropzone');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => e.dataTransfer.files[0] && loadFile(e.dataTransfer.files[0]));

  const code = QRData.fromHash(location.hash);
  if (code) startFromQR(code);
})();
