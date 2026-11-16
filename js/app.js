(function () {
  const $ = sel => document.querySelector(sel);
  const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // box art from GameTDB, by product code ("AMKE"); the last letter is the region
  const COVER_URL = { '3ds': 'https://art.gametdb.com/3ds/box/', ds: 'https://art.gametdb.com/ds/coverS/' };
  const REGION_DIRS = { E: ['US', 'EN'], P: ['EN', 'US'], O: ['US', 'EN'], J: ['JA'], K: ['KO'], A: ['US', 'EN', 'JA'] };

  let sessions = [];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- motion helpers ----
  function reveal(node, delay = 0) {
    node.classList.add('reveal');
    node.style.setProperty('--d', `${delay}ms`);
    return node;
  }

  function countUp(node) {
    if (node.dataset.done) return;
    node.dataset.done = '1';
    const target = Number(node.dataset.count);
    const suffix = node.dataset.suffix || '';
    const fmt = v => Math.round(v).toLocaleString('es-ES') + suffix;
    if (reducedMotion) { node.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1400;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      node.textContent = fmt(target * (1 - Math.pow(2, -10 * p)));
      if (p < 1) requestAnimationFrame(step);
      else node.textContent = fmt(target);
    };
    requestAnimationFrame(step);
  }

  function counter(value, suffix = '') {
    return el('b', { 'data-count': value, 'data-suffix': suffix, text: '0' + suffix });
  }

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('in');
          e.target.querySelectorAll('[data-count]').forEach(countUp);
          if (e.target.matches('[data-count]')) countUp(e.target);
          io.unobserve(e.target);
        }
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    : null;

  function observeReveals() {
    document.querySelectorAll('#results .reveal:not(.in)').forEach(n => {
      if (io && !reducedMotion) io.observe(n);
      else { n.classList.add('in'); n.querySelectorAll('[data-count]').forEach(countUp); }
    });
  }

  // a fast jump can skip elements without them ever intersecting: show anything above the fold
  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      document.querySelectorAll('#results .reveal:not(.in)').forEach(n => {
        if (n.getBoundingClientRect().top < innerHeight) {
          n.classList.add('in');
          n.querySelectorAll('[data-count]').forEach(countUp);
          if (io) io.unobserve(n);
        }
      });
    });
  }, { passive: true });

  // re-run the entrance when the content changes (year switch)
  function resetReveals() {
    document.querySelectorAll('#results .reveal.in').forEach(n => n.classList.remove('in'));
  }

  // cards lean towards the pointer
  function addTilt(card) {
    if (reducedMotion || !window.matchMedia('(hover: hover)').matches) return;
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', `${x * 10}deg`);
      card.style.setProperty('--rx', `${-y * 10}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--rx', '0deg');
    });
  }

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

  function coverUrls(code, platform = '3ds') {
    if (!code) return [];
    const base = COVER_URL[platform] || COVER_URL['3ds'];
    const dirs = REGION_DIRS[code[3]] || ['US', 'EN', 'JA'];
    return [...new Set([...dirs, 'US', 'EN', 'JA'])].map(d => `${base}${d}/${code}.png`);
  }

  // <img> that walks through the region folders and ends in a placeholder
  function cover(game) {
    const urls = coverUrls(game.code, game.platform);
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
    $('#upload').hidden = true;
    $('#loading').hidden = false;
    try {
      const s = await QRData.toStats(QRData.decode(code));
      showResults([s.year]);
      renderStats(s);
    } catch (e) {
      $('#upload').hidden = false;
      showError(e.message);
    } finally {
      $('#loading').hidden = true;
    }
  }

  function render(year) {
    renderStats(Stats.compute(sessions, Number(year)));
  }

  // ---- DS games launched from TWiLight Menu++ / a flashcart ----
  // The console logs them without a game code, so the viewer can say which game it was.
  // Stored only in this browser.
  const TWL_KEY = '3dsw-twl-game';
  const isTwlBucket = g => g && g.platform === 'ds' && (!g.code || g.twl);

  function twlChoice() {
    try { return JSON.parse(localStorage.getItem(TWL_KEY)); } catch { return null; }
  }

  function applyTwlChoice(s) {
    const pick = twlChoice();
    for (const g of [...s.games, s.longestSession, s.firstSession, s.forgotten]) {
      if (!isTwlBucket(g)) continue;
      g.twl = true;
      if (pick) { g.game = `${pick.name} (vía TWiLight)`; g.code = pick.code; }
      else { g.game = 'Juegos de DS (TWiLight / flashcart)'; g.code = null; }
    }
  }

  let current = null;

  async function openPicker() {
    const box = $('#picker');
    const input = $('#picker-q');
    const list = $('#picker-list');
    box.hidden = false;
    input.value = '';
    list.replaceChildren(el('li', { class: 'muted', text: 'Cargando lista de juegos…' }));
    input.focus();
    const titles = Object.entries(await TitleDB.dsTitles());
    const norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    // one entry per game: keep the regional version that suits a Spanish speaker best
    // (last letter of the code: S Spain, P Europe, E USA, O worldwide…)
    const REGION_RANK = 'SPEOXYZVWDFIHUJKC';
    const rank = code => { const i = REGION_RANK.indexOf(code[3]); return i < 0 ? 99 : i; };
    const byName = new Map();
    for (const [code, raw] of titles) {
      const name = TitleDB.cleanDS(raw);
      const key = norm(name);
      const prev = byName.get(key);
      if (!prev || rank(code) < rank(prev[0])) byName.set(key, [code, name, key]);
    }
    const index = [...byName.values()];

    const show = () => {
      const q = norm(input.value.trim());
      if (q.length < 2) {
        list.replaceChildren(el('li', { class: 'muted', text: 'Escribe al menos 2 letras (por ejemplo «pokemon negro»).' }));
        return;
      }
      const words = q.split(/\s+/);
      // titles that start with the query first, then shorter titles
      const hits = index
        .filter(([, , n]) => words.every(w => n.includes(w)))
        .sort((a, b) => (b[2].startsWith(words[0]) - a[2].startsWith(words[0])) || a[1].length - b[1].length)
        .slice(0, 12);
      list.replaceChildren(...(hits.length ? hits.map(([code, name]) =>
        el('li', {}, el('button', { type: 'button', 'data-code': code }, [
          el('span', { class: 'pk-cover' }, cover({ game: name, code, platform: 'ds' })),
          el('span', { text: name }),
        ]))
      ) : [el('li', { class: 'muted', text: 'No hay resultados.' })]));
    };
    input.oninput = show;
    show();

    list.onclick = e => {
      const b = e.target.closest('button[data-code]');
      if (!b) return;
      const code = b.dataset.code;
      const name = index.find(([c]) => c === code)[1];
      try { localStorage.setItem(TWL_KEY, JSON.stringify({ code, name })); } catch { /* private mode */ }
      closePicker();
      if (current) renderStats(current);
    };
  }

  function closePicker() { $('#picker').hidden = true; }

  function forgetTwl() {
    try { localStorage.removeItem(TWL_KEY); } catch { /* ignore */ }
    if (current) renderStats(current);
  }

  function renderStats(s) {
    current = s;
    applyTwlChoice(s);
    resetReveals();
    renderHero(s);
    renderTiles(s);
    renderLibrary(s);
    renderMonth(s);
    renderWeek(s);
    renderHour(s);
    renderCalHead(s);
    renderHeatmap(s);
    renderAwards(s);
    renderChips(s);
    renderShareCard(s);
    requestAnimationFrame(observeReveals);
  }

  function renderHero(s) {
    const g = s.games[0];
    const hero = $('#hero');
    if (!g) { hero.replaceChildren(); return; }
    const bg = el('div', { class: 'hero-bg' });
    const url = coverUrls(g.code, g.platform)[0];
    if (url) bg.style.backgroundImage = `url("${url}")`;
    hero.replaceChildren(
      bg,
      el('div', { class: 'hero-in' }, [
        reveal(el('div', { class: 'hero-art' }, cover(g)), 0),
        el('div', {}, [
          reveal(el('div', { class: 'hero-label', text: `Tu juego de ${s.year}` }), 120),
          reveal(el('h2', { text: g.game }), 200),
          reveal(el('div', { class: 'hero-stats' }, [
            el('div', {}, [counter(Math.round(g.minutes / 60), ' h'), el('span', { text: 'jugadas' })]),
            el('div', {}, [counter(g.sessions), el('span', { text: 'partidas' })]),
            el('div', {}, [counter(Math.round((g.minutes / Math.max(1, s.totalMinutes)) * 100), '%'), el('span', { text: 'de tu tiempo' })]),
          ]), 300),
        ]),
      ])
    );
  }

  function renderTiles(s) {
    const items = [
      [Math.round(s.totalMinutes / 60), ' h', 'en total'],
      [s.gameCount, '', 'juegos'],
      [s.daysPlayed, '', 'días jugando'],
      [s.sessionCount, '', 'partidas'],
    ];
    $('#big-numbers').replaceChildren(...items.map(([v, suffix, l], i) =>
      reveal(el('div', { class: 'tile' }, [counter(v, suffix), el('span', { text: l })]), 80 * i)
    ));
  }

  function renderLibrary(s) {
    const top = s.games.slice(0, 10);
    const max = top.length ? top[0].minutes : 1;
    $('#top').replaceChildren(...top.map((g, i) =>
      reveal(el('div', { class: 'game', title: g.game }, [
        el('div', { class: 'art' }, [cover(g), el('span', { class: 'rank', text: i + 1 })]),
        el('div', { class: 'meta' }, [
          el('div', { class: 'name', text: g.game }),
          el('div', { class: 'hours' }, [`${hours(g.minutes)} h`, el('small', { text: `${g.sessions} partidas` })]),
          el('div', { class: 'bar' }, el('i', { style: `width:${(g.minutes / max) * 100}%` })),
          isTwlBucket(g) ? el('div', { class: 'twl-actions' }, [
            el('button', { type: 'button', class: 'twl-pick', text: g.code ? 'Cambiar juego' : '¿Qué juego es?' }),
            g.code ? el('button', { type: 'button', class: 'twl-reset', text: 'Quitar' }) : null,
          ]) : null,
        ]),
      ]), 70 * i)
    ));
    document.querySelectorAll('#top .game').forEach(addTilt);
  }

  // ---- "Tu ritmo": each chart leads with what it says about you ----
  const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const WEEKDAYS_PLURAL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];
  const PERIODS = [['madrugada', 0, 6], ['mañana', 6, 12], ['tarde', 12, 18], ['noche', 18, 24]];
  const capFirst = t => t.charAt(0).toUpperCase() + t.slice(1);
  const pct = (a, b) => Math.round((a / Math.max(1, b)) * 100);
  const sum = arr => arr.reduce((a, b) => a + b, 0);

  function chartHead(kicker, title, sub) {
    return [
      el('div', { class: 'ck', text: kicker }),
      el('h3', { class: 'ct', text: title }),
      el('p', { class: 'cs', text: sub }),
    ];
  }

  // vertical bars; the tallest one carries a label, optional dashed average line
  function bars(values, labels, tips, opts = {}) {
    const max = Math.max(1, ...values);
    const peak = values.indexOf(Math.max(...values));
    const box = el('div', { class: 'bars' });
    values.forEach((v, i) => {
      const h = (v / max) * 100;
      box.append(el('div', { class: 'col' + (i === peak && v > 0 ? ' top' : ''), 'data-tip': tips[i] }, [
        el('div', { class: 'track' }, [
          i === peak && v > 0 ? el('span', { class: 'bubble', text: opts.peakLabel, style: `bottom:calc(${h}% + 8px)` }) : null,
          el('i', { style: `height:${h}%;--d:${i * 45}ms` }),
        ]),
        el('small', { text: labels[i] }),
      ]));
    });
    if (opts.avg) {
      box.append(el('div', { class: 'avg', style: `bottom:calc(var(--lab) + (100% - var(--lab)) * ${(opts.avg / max).toFixed(3)})` },
        el('span', { text: 'tu media' })));
    }
    return box;
  }

  function renderMonth(s) {
    const m = s.byMonth;
    const active = m.filter(v => v > 0);
    const avg = sum(active) / Math.max(1, active.length);
    const best = s.bestMonth;
    const ratio = avg ? m[best] / avg : 0;
    const sub = ratio >= 1.15
      ? `${hours(m[best])} h · ${ratio.toFixed(1).replace('.', ',')}× tu media mensual`
      : `${hours(m[best])} h · un año muy regular`;
    $('#card-month').replaceChildren(
      ...chartHead('Tu mes', `${capFirst(MONTHS_LONG[best])} fue tu mes`, sub),
      bars(m, MONTHS, m.map((v, i) => `${capFirst(MONTHS_LONG[i])}: ${hours(v)} h`), { avg, peakLabel: `${hours(m[best])} h` })
    );
  }

  function weekdayTotals(s) {
    const w = new Array(7).fill(0);
    for (const [key, min] of s.byDay) w[(new Date(key + 'T12:00:00').getDay() + 6) % 7] += min;
    return w;
  }

  function renderWeek(s) {
    const w = weekdayTotals(s);
    const total = sum(w);
    const best = w.indexOf(Math.max(...w));
    $('#card-week').replaceChildren(
      ...chartHead('Tu día', `Los ${WEEKDAYS_PLURAL[best]} son tu día`,
        `${pct(w[best], total)} % de tus horas · ${pct(w[5] + w[6], total)} % en fin de semana`),
      bars(w, WEEKDAYS, w.map((v, i) => `${capFirst(WEEKDAYS_PLURAL[i])}: ${pct(v, total)} %`), { peakLabel: `${pct(w[best], total)} %` })
    );
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs = {}) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  }

  // 24-hour clock: one ray per hour, longer = more play
  function renderHour(s) {
    const h = s.byHour;
    const total = sum(h);
    const max = Math.max(1, ...h);
    const peak = h.indexOf(Math.max(...h));
    const shares = PERIODS.map(([name, a, b]) => [name, pct(sum(h.slice(a, b)), total)]);
    const main = shares.reduce((x, y) => (y[1] > x[1] ? y : x));

    const svg = svgEl('svg', { viewBox: '0 0 200 200', class: 'clock', role: 'img', 'aria-label': `Horas por hora del día; pico a las ${peak}:00` });
    svg.append(svgEl('circle', { cx: 100, cy: 100, r: 38, class: 'clock-face' }));
    h.forEach((v, i) => {
      const a = (i / 24) * 2 * Math.PI - Math.PI / 2;
      const r0 = 46, r1 = 52 + (v / max) * 44;
      const ray = svgEl('line', {
        x1: (100 + r0 * Math.cos(a)).toFixed(1), y1: (100 + r0 * Math.sin(a)).toFixed(1),
        x2: (100 + r1 * Math.cos(a)).toFixed(1), y2: (100 + r1 * Math.sin(a)).toFixed(1),
        class: 'ray' + (i === peak ? ' top' : ''), style: `--d:${i * 25}ms`,
      });
      ray.append(svgEl('title'));
      ray.firstChild.textContent = `${i}:00 · ${hours(v)} h`;
      svg.append(ray);
    });
    for (const [i, x, y] of [[0, 100, 74], [6, 127, 103], [12, 100, 132], [18, 73, 103]]) {
      const t = svgEl('text', { x, y, class: 'clock-tick' });
      t.textContent = i;
      svg.append(t);
    }
    const big = svgEl('text', { x: 100, y: 104, class: 'clock-peak' });
    big.textContent = `${peak}h`;
    svg.append(big);

    const split = el('div', { class: 'periods' }, shares.map(([name, p], i) =>
      el('i', { class: 'p' + i + (name === main[0] ? ' top' : ''), style: `flex-grow:${Math.max(p, 1)}`, title: `${capFirst(name)}: ${p} %` })));
    const legend = el('div', { class: 'period-legend' }, shares.map(([name, p], i) =>
      el('span', { class: name === main[0] ? 'top' : '' }, [el('i', { class: 'p' + i }), `${capFirst(name)} ${p} %`])));

    $('#card-hour').replaceChildren(
      ...chartHead('Tu hora', `Eres de ${main[0]}`, `${main[1]} % de tus horas · pico a las ${peak}:00`),
      el('div', { class: 'clock-wrap' }, svg),
      split,
      legend
    );
  }

  function renderCalHead(s) {
    const jan1 = new Date(s.year, 0, 1);
    const yearDays = new Date(s.year, 1, 29).getMonth() === 1 ? 366 : 365;
    const now = new Date();
    // the current year is not over yet: compare with the days elapsed
    const days = now.getFullYear() === s.year ? Math.floor((now - jan1) / 864e5) + 1 : yearDays;
    const stat = (k, v) => el('div', { class: 'cal-stat' }, [el('span', { text: k }), el('b', { text: v })]);
    $('#cal-head').replaceChildren(
      el('div', {}, chartHead('Día a día', `${s.daysPlayed} días jugando`,
        `${pct(s.daysPlayed, days)} % de los días ${now.getFullYear() === s.year ? 'de este año' : `de ${s.year}`}`)),
      el('div', { class: 'cal-stats' }, [
        s.streak.length ? stat('Racha', `${s.streak.length} días`) : null,
        s.bestDay ? stat('Mejor día', `${s.bestDay.date.getDate()} ${MONTHS_SHORT[s.bestDay.date.getMonth()].toLowerCase()} · ${fmtDuration(s.bestDay.minutes)}`) : null,
      ])
    );
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
      cells.push(el('i', { class: 'l' + level, title: label, style: `grid-row:${(i % 7) + 2};grid-column:${col};--c:${col + (i % 7)}` }));
    }
    $('#heatmap').replaceChildren(...cells);
  }

  // ---- Destacados ----
  // big cards with the cover for the moments tied to a game
  function renderAwards(s) {
    const items = [];
    const award = (g, label, value, note) => {
      const bg = el('div', { class: 'award-bg' });
      const url = coverUrls(g.code, g.platform)[0];
      if (url) bg.style.backgroundImage = `url("${url}")`;
      items.push(reveal(el('article', { class: 'award' }, [
        bg,
        el('div', { class: 'award-art' }, cover(g)),
        el('div', { class: 'award-txt' }, [
          el('div', { class: 'ck', text: label }),
          el('div', { class: 'award-value', text: value }),
          el('div', { class: 'award-game', text: g.game }),
          note ? el('div', { class: 'cs', text: note }) : null,
        ]),
      ]), 90 * items.length));
    };

    if (s.longestSession) award(s.longestSession, 'Partida más larga', fmtDuration(s.longestSession.minutes), `el ${fmtDate(s.longestSession.start)}`);
    if (s.firstSession) award(s.firstSession, 'Primer juego del año', fmtDate(s.firstSession.start), 'así empezó tu año');
    if (s.forgotten && s.games.length > 1) {
      const end = new Date(Math.min(Date.now(), new Date(s.year, 11, 31).getTime()));
      const days = Math.max(1, Math.round((end - s.forgotten.last) / 864e5));
      award(s.forgotten, 'El olvidado', `${days} días sin abrirlo`, `la última vez fue el ${fmtDate(s.forgotten.last)}`);
    }
    $('#awards').replaceChildren(...items);
  }

  // small line icons (drawn for this project)
  const ICONS = {
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cup: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
    flame: '<path d="M12 3c.8 3.6 5 5.2 5 10a5 5 0 0 1-10 0c0-2.3 1.2-3.8 2.4-4.8.2 1.6 1 2.7 2.3 3.1C11 8.5 11 5.6 12 3z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  };
  function icon(name) {
    const span = el('span', { class: 'chip-ico', 'aria-hidden': 'true' });
    span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
    return span;
  }

  function renderChips(s) {
    const items = [];
    const chip = (ico, label, value, note) =>
      items.push(reveal(el('div', { class: 'chip' }, [
        icon(ico),
        el('div', {}, [
          el('div', { class: 'ck', text: label }),
          el('div', { class: 'chip-value', text: value }),
          note ? el('div', { class: 'cs', text: note }) : null,
        ]),
      ]), 70 * items.length));

    const peak = s.personality.peakHour;
    chip(peak < 6 || peak >= 20 ? 'moon' : peak < 12 ? 'sun' : 'cup', 'Tu perfil', s.personality.name, s.personality.desc);
    if (s.streak.length) chip('flame', 'Racha más larga', `${s.streak.length} días seguidos`, `del ${fmtDate(s.streak.from)} al ${fmtDate(s.streak.to)}`);
    if (s.bestDay) chip('calendar', 'Día con más juego', fmtDate(s.bestDay.date), fmtDuration(s.bestDay.minutes));
    if (s.sessionCount) chip('timer', 'Partida media', fmtDuration(s.totalMinutes / s.sessionCount), `en ${s.sessionCount} partidas`);
    $('#highlights').replaceChildren(...items);
  }

  // ---- shareable card: "post" or vertical "story" ----
  let cardFormat = 'post';

  function renderShareCard(s) {
    const card = $('#share-card');
    card.classList.toggle('story', cardFormat === 'story');
    const months = s.byMonth;
    const mmax = Math.max(1, ...months);
    const g1 = s.games[0];

    card.replaceChildren(
      el('div', { class: 'sc-orb a' }),
      el('div', { class: 'sc-orb b' }),
      el('div', { class: 'sc-head' }, [
        el('img', { src: 'img/icon-180.png', alt: '', width: 34, height: 34 }),
        el('span', { text: '3DS Wrapped' }),
        el('b', { class: 'sc-year', text: s.year }),
      ]),
      el('div', { class: 'sc-hours' }, [hours(s.totalMinutes), el('small', { text: ' horas' })]),
      el('div', { class: 'sc-sub', text: `jugando a ${s.gameCount} juegos en ${s.daysPlayed} días` }),
      g1 ? el('div', { class: 'sc-goty story-only' }, [
        el('span', { text: 'Tu juego del año' }),
        el('b', { text: g1.game }),
        el('em', { text: `${hours(g1.minutes)} h · ${pct(g1.minutes, s.totalMinutes)} % de tu tiempo` }),
      ]) : null,
      el('ol', { class: 'sc-list' }, s.games.slice(0, 5).map((g, i) =>
        el('li', {}, [el('b', { text: i + 1 }), el('span', { class: 't', text: g.game }), el('span', { class: 'h', text: `${hours(g.minutes)} h` })])
      )),
      el('div', { class: 'sc-year-bars' }, [
        el('span', { text: 'Tu año' }),
        el('div', { class: 'sc-bars' }, months.map((v, i) =>
          el('i', { class: i === s.bestMonth ? 'top' : '', style: `height:${Math.max(6, (v / mmax) * 100)}%` }))),
      ]),
      el('div', { class: 'sc-tags' }, [
        el('span', { text: s.personality.name }),
        s.streak.length ? el('span', { text: `racha de ${s.streak.length} días` }) : null,
      ]),
      el('div', { class: 'sc-foot', text: 'p0tzz.github.io/3ds-wrapped' })
    );
  }

  function setFormat(fmt) {
    cardFormat = fmt;
    document.querySelectorAll('.fmt').forEach(b => b.classList.toggle('is-on', b.dataset.format === fmt));
    $('#share-card').classList.toggle('story', fmt === 'story');
  }

  async function cardCanvas() {
    if (!window.html2canvas) throw new Error('No se pudo cargar html2canvas (¿sin conexión?).');
    await document.fonts.ready;
    const card = $('#share-card');
    card.classList.add('capturing');
    try {
      return await html2canvas(card, { scale: 3, backgroundColor: null });
    } finally {
      card.classList.remove('capturing');
    }
  }

  const fileName = () => `3ds-wrapped-${$('#year').value}.png`;

  async function downloadCard() {
    try {
      const canvas = await cardCanvas();
      el('a', { href: canvas.toDataURL('image/png'), download: fileName() }).click();
    } catch (e) {
      showError(e.message);
    }
  }

  // native share sheet on phones (WhatsApp, Instagram…)
  async function shareCard() {
    try {
      const canvas = await cardCanvas();
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const file = new File([blob], fileName(), { type: 'image/png' });
      await navigator.share({ files: [file], title: '3DS Wrapped', text: `Mi año ${$('#year').value} en la 3DS` });
    } catch (e) {
      if (e.name !== 'AbortError') downloadCard();
    }
  }

  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' });
    $('#share').hidden = !(navigator.canShare && navigator.canShare({ files: [probe] }));
  } catch { /* no share support */ }

  $('#file').addEventListener('change', e => e.target.files[0] && loadFile(e.target.files[0]));
  $('#demo').addEventListener('click', () => start(SampleData.generate()));
  $('#year').addEventListener('change', e => render(e.target.value));
  $('#download').addEventListener('click', downloadCard);
  $('#share').addEventListener('click', shareCard);
  document.querySelectorAll('.fmt').forEach(b => b.addEventListener('click', () => setFormat(b.dataset.format)));
  $('#top').addEventListener('click', e => {
    if (e.target.closest('.twl-pick')) openPicker();
    else if (e.target.closest('.twl-reset')) forgetTwl();
  });
  $('#picker-close').addEventListener('click', closePicker);
  $('#picker').addEventListener('click', e => { if (e.target.id === 'picker') closePicker(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#picker').hidden) closePicker(); });
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
  else if (location.hash === '#demo') start(SampleData.generate());  // link from the README
})();
