(function () {
  const $ = sel => document.querySelector(sel);
  const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // box art from GameTDB, by product code ("AMKE"); the last letter is the region
  const COVER_URL = 'https://art.gametdb.com/3ds/box/';
  const REGION_DIRS = { E: ['US', 'EN'], P: ['EN', 'US'], J: ['JA'], K: ['KO'], A: ['US', 'EN', 'JA'] };

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

  function initials(name) {
    const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(w => w.length > 2 || /\d/.test(w));
    return (words.slice(0, 2).map(w => w[0]).join('') || name.slice(0, 2)).toUpperCase();
  }

  function coverUrls(code) {
    if (!code) return [];
    const dirs = REGION_DIRS[code[3]] || ['US', 'EN', 'JA'];
    return [...new Set([...dirs, 'US', 'EN', 'JA'])].map(d => `${COVER_URL}${d}/${code}.png`);
  }

  // <img> that walks through the region folders and ends in a placeholder
  function cover(game) {
    const urls = coverUrls(game.code);
    const ph = () => el('div', { class: 'cover-ph', text: initials(game.game) });
    if (!urls.length) return ph();
    const img = el('img', { class: 'cover', alt: game.game, loading: 'lazy', referrerpolicy: 'no-referrer' });
    let i = 0;
    img.onerror = () => {
      i++;
      if (i < urls.length) img.src = urls[i];
      else img.replaceWith(ph());
    };
    img.src = urls[0];
    return img;
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
    renderHero(s);
    renderTiles(s);
    renderLibrary(s);
    renderCols($('#months'), s.byMonth, MONTHS, i => `${MONTHS_LONG[i]}: ${hours(s.byMonth[i])} h`);
    renderCols($('#hours'), s.byHour, s.byHour.map((_, h) => (h % 6 === 0 ? `${h}h` : '')), h => `${h}:00`);
    renderHeatmap(s);
    renderFacts(s);
    renderShareCard(s);
  }

  function renderHero(s) {
    const g = s.games[0];
    const hero = $('#hero');
    if (!g) { hero.replaceChildren(); return; }
    const bg = el('div', { class: 'hero-bg' });
    const url = coverUrls(g.code)[0];
    if (url) bg.style.backgroundImage = `url("${url}")`;
    hero.replaceChildren(
      bg,
      el('div', { class: 'hero-in' }, [
        cover(g),
        el('div', {}, [
          el('div', { class: 'hero-label', text: `Tu juego de ${s.year}` }),
          el('h2', { text: g.game }),
          el('div', { class: 'hero-stats' }, [
            el('div', {}, [el('b', { text: `${hours(g.minutes)} h` }), el('span', { text: 'jugadas' })]),
            el('div', {}, [el('b', { text: g.sessions }), el('span', { text: 'partidas' })]),
            el('div', {}, [el('b', { text: `${Math.round((g.minutes / Math.max(1, s.totalMinutes)) * 100)}%` }), el('span', { text: 'de tu tiempo' })]),
          ]),
        ]),
      ])
    );
  }

  function renderTiles(s) {
    const items = [
      [`${hours(s.totalMinutes)} h`, 'en total'],
      [s.gameCount, 'juegos'],
      [s.daysPlayed, 'días jugando'],
      [s.sessionCount, 'partidas'],
    ];
    $('#big-numbers').replaceChildren(...items.map(([v, l]) =>
      el('div', { class: 'tile' }, [el('b', { text: v }), el('span', { text: l })])
    ));
  }

  function renderLibrary(s) {
    const top = s.games.slice(0, 10);
    const max = top.length ? top[0].minutes : 1;
    $('#top').replaceChildren(...top.map((g, i) =>
      el('div', { class: 'game', title: g.game }, [
        el('div', { class: 'art' }, [cover(g), el('span', { class: 'rank', text: i + 1 })]),
        el('div', { class: 'meta' }, [
          el('div', { class: 'name', text: g.game }),
          el('div', { class: 'hours' }, [`${hours(g.minutes)} h`, el('small', { text: `${g.sessions} partidas` })]),
          el('div', { class: 'bar' }, el('i', { style: `width:${(g.minutes / max) * 100}%` })),
        ]),
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
    const add = (visual, label, value, note) =>
      items.push(el('div', { class: 'fact' }, [
        visual,
        el('div', {}, [
          el('div', { class: 'label', text: label }),
          el('div', { class: 'value', text: value }),
          note ? el('div', { class: 'note', text: note }) : null,
        ]),
      ]));
    const thumb = g => el('div', { class: 'thumb' }, cover(g));
    const badge = t => el('div', { class: 'badge', text: t });

    add(badge(s.personality.peakHour + 'h'), 'Tu perfil', s.personality.name, s.personality.desc);
    if (s.streak.length) add(badge(s.streak.length), 'Racha más larga', `${s.streak.length} días seguidos`, `del ${fmtDate(s.streak.from)} al ${fmtDate(s.streak.to)}`);
    if (s.longestSession) add(thumb(s.longestSession), 'Partida más larga', fmtDuration(s.longestSession.minutes), `${s.longestSession.game}, ${fmtDate(s.longestSession.start)}`);
    if (s.firstSession) add(thumb(s.firstSession), 'Primer juego del año', s.firstSession.game, fmtDate(s.firstSession.start));
    if (s.bestDay) add(badge(s.bestDay.date.getDate()), 'Día con más juego', fmtDate(s.bestDay.date), fmtDuration(s.bestDay.minutes));
    add(badge(MONTHS_SHORT[s.bestMonth]), 'Mes con más juego', MONTHS_LONG[s.bestMonth], `${hours(s.byMonth[s.bestMonth])} h`);
    if (s.forgotten && s.games.length > 1) add(thumb(s.forgotten), 'El olvidado', s.forgotten.game, `sin abrir desde el ${fmtDate(s.forgotten.last)}`);

    $('#highlights').replaceChildren(...items);
  }

  function renderShareCard(s) {
    $('#share-card').replaceChildren(
      el('div', { class: 'sc-top' }, [el('span', { text: '3DS Wrapped' }), el('span', { text: s.year })]),
      el('div', { class: 'sc-hours' }, [hours(s.totalMinutes), el('small', { text: ' h' })]),
      el('div', { class: 'sc-sub', text: `jugando a ${s.gameCount} juegos en ${s.daysPlayed} días` }),
      el('ol', { class: 'sc-list' }, s.games.slice(0, 5).map((g, i) =>
        el('li', {}, [el('b', { text: i + 1 }), el('span', { class: 't', text: g.game }), el('span', { text: `${hours(g.minutes)} h` })])
      )),
      el('div', { class: 'sc-tags' }, [
        el('span', { text: s.personality.name }),
        s.streak.length ? el('span', { text: `racha de ${s.streak.length} días` }) : null,
      ]),
      el('div', { class: 'sc-foot', text: 'p0tzz.github.io/3ds-wrapped' })
    );
  }

  async function downloadCard() {
    if (!window.html2canvas) return showError('No se pudo cargar html2canvas (¿sin conexión?).');
    await document.fonts.ready;
    const canvas = await html2canvas($('#share-card'), { scale: 3, backgroundColor: null });
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
