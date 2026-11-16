(function () {
  const $ = sel => document.querySelector(sel);
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  let sessions = [];
  const charts = {};

  const hours = min => Math.round(min / 60).toLocaleString('es-ES');
  const fmtDuration = min => (min >= 60 ? `${Math.floor(min / 60)} h ${Math.round(min % 60)} min` : `${Math.round(min)} min`);
  const fmtDate = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) node.append(c);
    return node;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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

  function start(data) {
    sessions = data;
    const ys = Stats.years(sessions);
    const select = $('#year');
    select.replaceChildren(...ys.map(y => el('option', { value: y, text: y })));
    $('#upload').hidden = true;
    $('#results').hidden = false;
    render(ys[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render(year) {
    const s = Stats.compute(sessions, Number(year));
    renderNumbers(s);
    renderCharts(s);
    renderHeatmap(s);
    renderHighlights(s);
    renderShareCard(s);
  }

  function renderNumbers(s) {
    const items = [
      [hours(s.totalMinutes), 'horas jugadas'],
      [s.gameCount, 'juegos distintos'],
      [s.daysPlayed, 'días con la consola'],
      [s.sessionCount, 'partidas'],
    ];
    $('#big-numbers').replaceChildren(...items.map(([v, l]) =>
      el('div', { class: 'stat' }, [el('div', { class: 'value', text: v }), el('div', { class: 'label', text: l })])
    ));
  }

  function renderCharts(s) {
    if (!window.Chart) {
      document.querySelectorAll('.chart-box').forEach(b => { b.textContent = 'No se pudo cargar Chart.js (¿sin conexión?).'; });
      return;
    }
    Chart.defaults.color = cssVar('--muted');
    Chart.defaults.borderColor = cssVar('--line');
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

    const common = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    };
    const toHours = arr => arr.map(m => +(m / 60).toFixed(1));

    const top = s.games.slice(0, 10);
    make('top', {
      type: 'bar',
      data: {
        labels: top.map(g => g.game),
        datasets: [{ data: toHours(top.map(g => g.minutes)), backgroundColor: cssVar('--accent'), borderRadius: 6 }],
      },
      options: {
        ...common,
        indexAxis: 'y',
        scales: { x: { title: { display: true, text: 'horas' } }, y: { grid: { display: false } } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.x} h` } } },
      },
    });

    make('month', {
      type: 'bar',
      data: { labels: MONTHS, datasets: [{ data: toHours(s.byMonth), backgroundColor: cssVar('--accent-2'), borderRadius: 6 }] },
      options: { ...common, scales: { x: { grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.y} h` } } } },
    });

    make('hour', {
      type: 'line',
      data: {
        labels: s.byHour.map((_, h) => `${h}h`),
        datasets: [{ data: toHours(s.byHour), borderColor: cssVar('--accent-3'), backgroundColor: 'rgba(255,200,61,.15)', fill: true, tension: 0.35, pointRadius: 0 }],
      },
      options: { ...common, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.y} h` } } } },
    });
  }

  function make(id, config) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($('#chart-' + id), config);
  }

  function renderHeatmap(s) {
    const cells = [];
    const jan1 = new Date(s.year, 0, 1);
    const offset = (jan1.getDay() + 6) % 7; // monday first
    for (let i = 0; i < offset; i++) cells.push(el('i', { class: 'empty' }));

    const max = Math.max(1, ...s.byDay.values());
    for (let d = new Date(jan1); d.getFullYear() === s.year; d.setDate(d.getDate() + 1)) {
      const min = s.byDay.get(Stats.dayKey(d)) || 0;
      const level = min === 0 ? 0 : Math.min(4, Math.ceil((min / max) * 4));
      const label = `${fmtDate(d)}: ${min ? fmtDuration(min) : 'sin jugar'}`;
      cells.push(el('i', { class: 'l' + level, title: label, 'aria-label': label }));
    }
    $('#heatmap').replaceChildren(...cells);
  }

  function renderHighlights(s) {
    const items = [];
    const add = (emoji, title, text, sub) =>
      items.push(el('div', { class: 'hl' }, [
        el('div', { class: 'emoji', text: emoji }),
        el('div', { class: 'title', text: title }),
        el('div', { class: 'text', text: text }),
        el('div', { class: 'sub', text: sub }),
      ]));

    const p = s.personality;
    add(p.emoji, 'Tu personalidad gamer', p.name, p.desc);
    if (s.games[0]) add('👑', 'Tu juego del año', s.games[0].game, `${hours(s.games[0].minutes)} horas en ${s.games[0].sessions} partidas`);
    if (s.streak.length) add('🔥', 'Racha más larga', `${s.streak.length} días seguidos`, `del ${fmtDate(s.streak.from)} al ${fmtDate(s.streak.to)}`);
    if (s.longestSession) add('⏱️', 'Partida más larga', fmtDuration(s.longestSession.minutes), `${s.longestSession.game}, el ${fmtDate(s.longestSession.start)}`);
    if (s.bestDay) add('📅', 'Tu día más intenso', fmtDate(s.bestDay.date), `${fmtDuration(s.bestDay.minutes)} de juego`);
    add('🗓️', 'Mes favorito', MONTHS_LONG[s.bestMonth], `${hours(s.byMonth[s.bestMonth])} horas`);
    if (s.firstSession) add('🎬', 'Primer juego del año', s.firstSession.game, `el ${fmtDate(s.firstSession.start)}`);
    if (s.forgotten && s.games.length > 1) add('🕸️', 'El olvidado', s.forgotten.game, `no lo abres desde el ${fmtDate(s.forgotten.last)}`);

    $('#highlights').replaceChildren(...items);
  }

  function renderShareCard(s) {
    const top = s.games.slice(0, 5).map(g => el('li', {}, [g.game + ' ', el('span', { text: `· ${hours(g.minutes)} h` })]));
    $('#share-card').replaceChildren(
      el('div', { class: 'sc-year', text: `Mi año ${s.year} en la 3DS` }),
      el('div', { class: 'sc-hours', text: `${hours(s.totalMinutes)} h` }),
      el('div', { class: 'sc-sub', text: `${s.gameCount} juegos · ${s.daysPlayed} días · racha de ${s.streak.length}` }),
      el('ol', {}, top),
      el('div', { class: 'sc-badge', text: `${s.personality.emoji} ${s.personality.name}` }),
      el('div', { class: 'sc-foot', text: '3DS Wrapped' })
    );
  }

  async function downloadCard() {
    if (!window.html2canvas) return showError('No se pudo cargar html2canvas (¿sin conexión?).');
    const canvas = await html2canvas($('#share-card'), { scale: 3, backgroundColor: null });
    const a = el('a', { href: canvas.toDataURL('image/png'), download: `3ds-wrapped-${$('#year').value}.png` });
    a.click();
  }

  $('#file').addEventListener('change', e => e.target.files[0] && loadFile(e.target.files[0]));
  $('#demo').addEventListener('click', () => start(SampleData.generate()));
  $('#year').addEventListener('change', e => render(e.target.value));
  $('#download').addEventListener('click', downloadCard);
  $('#reset').addEventListener('click', () => {
    $('#results').hidden = true;
    $('#upload').hidden = false;
    $('#file').value = '';
  });

  const dz = $('#dropzone');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => e.dataTransfer.files[0] && loadFile(e.dataTransfer.files[0]));
})();
