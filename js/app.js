(function () {
  const $ = sel => document.querySelector(sel);
  const L = I18N;
  const loc = L.locale();

  // box art from GameTDB, by product code ("AMKE"); the last letter is the region
  const COVER_URL = { '3ds': 'https://art.gametdb.com/3ds/box/', ds: 'https://art.gametdb.com/ds/coverS/' };
  const REGION_DIRS = { E: ['US', 'EN'], P: ['EN', 'US'], O: ['US', 'EN'], J: ['JA'], K: ['KO'], A: ['US', 'EN', 'JA'] };

  let sessions = [];
  let current = null;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- formatting ----
  const num = v => Math.round(v).toLocaleString(loc);
  const hours = min => num(min / 60);
  const fmtDuration = min => (min >= 60 ? `${Math.floor(min / 60)} h ${Math.round(min % 60)} min` : `${Math.round(min)} min`);
  const fmtDate = d => d.toLocaleDateString(loc, { day: 'numeric', month: 'long' });
  const monthYear = d => (L.lang === 'en' ? `${L.months()[d.getMonth()]} ${d.getFullYear()}` : `${L.months()[d.getMonth()]} de ${d.getFullYear()}`);
  const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
  const pct = (a, b) => Math.round((a / Math.max(1, b)) * 100);
  const sum = arr => arr.reduce((a, b) => a + b, 0);

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
    const fmt = v => num(v) + suffix;
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
    box.textContent = msg ? t(msg) : '';
    box.hidden = !msg;
  }

  async function loadFile(file) {
    showError('');
    const status = $('#status');
    const setStatus = msg => { status.textContent = msg; status.hidden = !msg; };
    setStatus(t('Leyendo archivo…'));
    try {
      start(await Parsers.parseFile(file, msg => setStatus(t(msg))));
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
    playIntro();
  }

  // full-screen reveal of the game of the year (js/intro.js)
  function playIntro() {
    if (window.Intro && current) Intro.play(current, { cover });
  }

  // summary coming from the 3DS app QR code
  async function startFromQR(code) {
    $('#upload').hidden = true;
    $('#loading').hidden = false;
    try {
      const s = await QRData.toStats(QRData.decode(code));
      showResults([s.year]);
      renderStats(s);
      playIntro();
    } catch (e) {
      $('#upload').hidden = false;
      showError(e.message);
    } finally {
      $('#loading').hidden = true;
    }
  }

  function render(year) {
    const y = Number(year);
    const s = Stats.compute(sessions, y);
    s.history = Stats.history(sessions);
    s.lifetime = sessions.lifetime || Stats.lifetime(sessions);
    s.steps = sessions.steps ? { total: sessions.steps.total, year: sessions.steps.byYear[y] || 0 } : null;
    renderStats(s);
  }

  // ---- DS games launched from TWiLight Menu++ / a flashcart ----
  // The console logs them without a game code, so the viewer can say which game it was.
  const TWL_KEY = '3dsw-twl-game';
  const isTwlBucket = g => g && g.platform === 'ds' && (!g.code || g.twl);

  function twlChoice() {
    try { return JSON.parse(localStorage.getItem(TWL_KEY)); } catch { return null; }
  }

  function applyTwlChoice(s) {
    const pick = twlChoice();
    const all = [...s.games, s.longestSession, s.firstSession, s.forgotten, s.lifetime && s.lifetime.top];
    for (const g of all) {
      if (!isTwlBucket(g)) continue;
      g.twl = true;
      if (pick) { g.game = t('{g} (vía TWiLight)', { g: pick.name }); g.code = pick.code; }
      else { g.game = t('Juegos de DS (TWiLight / flashcart)'); g.code = null; }
    }
  }

  async function openPicker() {
    const box = $('#picker');
    const input = $('#picker-q');
    const list = $('#picker-list');
    box.hidden = false;
    input.value = '';
    list.replaceChildren(el('li', { class: 'muted', text: t('Cargando lista de juegos…') }));
    input.focus();
    const titles = Object.entries(await TitleDB.dsTitles());
    const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    // one entry per game, preferring the region that suits the viewer
    const REGION_RANK = L.lang === 'en' ? 'EPOSXYZVWDFIHUJKC' : 'SPEOXYZVWDFIHUJKC';
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
        list.replaceChildren(el('li', { class: 'muted', text: t('Escribe al menos 2 letras (por ejemplo «pokemon negro»).') }));
        return;
      }
      const words = q.split(/\s+/);
      const hits = index
        .filter(([, , n]) => words.every(w => n.includes(w)))
        .sort((a, b) => (b[2].startsWith(words[0]) - a[2].startsWith(words[0])) || a[1].length - b[1].length)
        .slice(0, 12);
      list.replaceChildren(...(hits.length ? hits.map(([code, name]) =>
        el('li', {}, el('button', { type: 'button', 'data-code': code }, [
          el('span', { class: 'pk-cover' }, cover({ game: name, code, platform: 'ds' })),
          el('span', { text: name }),
        ]))
      ) : [el('li', { class: 'muted', text: t('No hay resultados.') })]));
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
    renderCompare(s);
    renderMedals(s);
    renderAwards(s);
    renderChips(s);
    renderLife(s);
    renderShareCard(s);
    requestAnimationFrame(observeReveals);
  }

  // previous year with data, for comparisons
  function previousYear(s) {
    const h = (s.history || []).filter(x => x.minutes > 0);
    const i = h.findIndex(x => x.year === s.year);
    return i > 0 ? h[i - 1] : null;
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
          reveal(el('div', { class: 'hero-label', text: t('Tu juego de {y}', { y: s.year }) }), 120),
          reveal(el('h2', { text: g.game }), 200),
          reveal(el('div', { class: 'hero-stats' }, [
            el('div', {}, [counter(Math.round(g.minutes / 60), ' h'), el('span', { text: t('jugadas') })]),
            el('div', {}, [counter(g.sessions), el('span', { text: t('partidas') })]),
            el('div', {}, [counter(pct(g.minutes, s.totalMinutes), '%'), el('span', { text: t('de tu tiempo') })]),
          ]), 300),
          reveal(el('button', { type: 'button', class: 'replay-intro', text: t('▶ Ver la intro otra vez') }), 380),
        ]),
      ])
    );
  }

  function renderTiles(s) {
    const prev = previousYear(s);
    const delta = prev ? Math.round(((s.totalMinutes - prev.minutes) / Math.max(1, prev.minutes)) * 100) : null;
    const items = [
      [Math.round(s.totalMinutes / 60), ' h', t('en total'), delta],
      [s.gameCount, '', t('juegos')],
      [s.daysPlayed, '', t('días jugando')],
      [s.sessionCount, '', t('partidas')],
    ];
    $('#big-numbers').replaceChildren(...items.map(([v, suffix, label, d], i) =>
      reveal(el('div', { class: 'tile' }, [
        counter(v, suffix),
        el('span', { text: label }),
        d != null ? el('em', { class: 'delta ' + (d >= 0 ? 'up' : 'down'), text: `${d >= 0 ? '▲' : '▼'} ${Math.abs(d)} % ${t('vs {y}', { y: prev.year })}` }) : null,
      ]), 80 * i)
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
          el('div', { class: 'hours' }, [`${hours(g.minutes)} h`, el('small', { text: t('{n} partidas', { n: g.sessions }) })]),
          el('div', { class: 'bar' }, el('i', { style: `width:${(g.minutes / max) * 100}%` })),
          isTwlBucket(g) ? el('div', { class: 'twl-actions' }, [
            el('button', { type: 'button', class: 'twl-pick', text: g.code ? t('Cambiar juego') : t('¿Qué juego es?') }),
            g.code ? el('button', { type: 'button', class: 'twl-reset', text: t('Quitar') }) : null,
          ]) : null,
        ]),
      ]), 70 * i)
    ));
    document.querySelectorAll('#top .game').forEach(addTilt);
  }

  // ---- "Tu ritmo": each chart leads with what it says about you ----
  function chartHead(kicker, title, sub) {
    return [
      el('div', { class: 'ck', text: kicker }),
      el('h3', { class: 'ct', text: title }),
      el('p', { class: 'cs', text: sub }),
    ];
  }

  // vertical bars; the highlighted one carries a label, optional dashed average line
  function bars(values, labels, tips, opts = {}) {
    const max = Math.max(1, ...values);
    const hi = opts.highlight != null ? opts.highlight : values.indexOf(Math.max(...values));
    const box = el('div', { class: 'bars' });
    values.forEach((v, i) => {
      const h = (v / max) * 100;
      box.append(el('div', { class: 'col' + (i === hi && v > 0 ? ' top' : ''), 'data-tip': tips[i] }, [
        el('div', { class: 'track' }, [
          i === hi && v > 0 && opts.peakLabel ? el('span', { class: 'bubble', text: opts.peakLabel, style: `bottom:calc(${h}% + 8px)` }) : null,
          el('i', { style: `height:${h}%;--d:${i * 45}ms` }),
        ]),
        el('small', { text: labels[i] }),
      ]));
    });
    if (opts.avg) {
      box.append(el('div', { class: 'avg', style: `bottom:calc(var(--lab) + (100% - var(--lab)) * ${(opts.avg / max).toFixed(3)})` },
        el('span', { text: t('tu media') })));
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
      ? t('{h} h · {r}× tu media mensual', { h: hours(m[best]), r: ratio.toLocaleString(loc, { maximumFractionDigits: 1 }) })
      : t('{h} h · un año muy regular', { h: hours(m[best]) });
    $('#card-month').replaceChildren(
      ...chartHead(t('Tu mes'), t('{m} fue tu mes', { m: capFirst(L.months()[best]) }), sub),
      bars(m, L.monthLetters(), m.map((v, i) => `${capFirst(L.months()[i])}: ${hours(v)} h`), { avg, peakLabel: `${hours(m[best])} h` })
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
    const plural = L.weekdaysPlural();
    $('#card-week').replaceChildren(
      ...chartHead(t('Tu día'), t('Los {d} son tu día', { d: plural[best] }),
        t('{p} % de tus horas · {w} % en fin de semana', { p: pct(w[best], total), w: pct(w[5] + w[6], total) })),
      bars(w, L.weekdays(), w.map((v, i) => `${capFirst(plural[i])}: ${pct(v, total)} %`), { peakLabel: `${pct(w[best], total)} %` })
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
    const names = L.periods();
    const shares = [[0, 6], [6, 12], [12, 18], [18, 24]].map(([a, b], i) => [names[i], pct(sum(h.slice(a, b)), total)]);
    const main = shares.reduce((x, y) => (y[1] > x[1] ? y : x));
    const who = L.periodPeople()[shares.indexOf(main)];

    const svg = svgEl('svg', { viewBox: '0 0 200 200', class: 'clock', role: 'img', 'aria-label': `${peak}:00` });
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
      const tx = svgEl('text', { x, y, class: 'clock-tick' });
      tx.textContent = i;
      svg.append(tx);
    }
    const big = svgEl('text', { x: 100, y: 104, class: 'clock-peak' });
    big.textContent = `${peak}h`;
    svg.append(big);

    const split = el('div', { class: 'periods' }, shares.map(([name, p], i) =>
      el('i', { class: 'p' + i + (name === main[0] ? ' top' : ''), style: `flex-grow:${Math.max(p, 1)}`, title: `${capFirst(name)}: ${p} %` })));
    const legend = el('div', { class: 'period-legend' }, shares.map(([name, p], i) =>
      el('span', { class: name === main[0] ? 'top' : '' }, [el('i', { class: 'p' + i }), `${capFirst(name)} ${p} %`])));

    $('#card-hour').replaceChildren(
      ...chartHead(t('Tu hora'), t('Eres de {p}', { p: who }), t('{p} % de tus horas · pico a las {h}:00', { p: main[1], h: peak })),
      el('div', { class: 'clock-wrap' }, svg),
      split,
      legend
    );
  }

  function renderCalHead(s) {
    const jan1 = new Date(s.year, 0, 1);
    const yearDays = new Date(s.year, 1, 29).getMonth() === 1 ? 366 : 365;
    const now = new Date();
    const thisYear = now.getFullYear() === s.year;
    const days = thisYear ? Math.floor((now - jan1) / 864e5) + 1 : yearDays;
    const stat = (k, v) => el('div', { class: 'cal-stat' }, [el('span', { text: k }), el('b', { text: v })]);
    $('#cal-head').replaceChildren(
      el('div', {}, chartHead(t('Día a día'), t('{n} días jugando', { n: s.daysPlayed }),
        thisYear ? t('{p} % de los días de este año', { p: pct(s.daysPlayed, days) }) : t('{p} % de los días de {y}', { p: pct(s.daysPlayed, days), y: s.year }))),
      el('div', { class: 'cal-stats' }, [
        s.streak.length ? stat(t('Racha'), t('{n} días', { n: s.streak.length })) : null,
        s.bestDay ? stat(t('Mejor día'), `${s.bestDay.date.getDate()} ${L.monthsShort()[s.bestDay.date.getMonth()].toLowerCase()} · ${fmtDuration(s.bestDay.minutes)}`) : null,
      ])
    );
  }

  function renderHeatmap(s) {
    const cells = [];
    const jan1 = new Date(s.year, 0, 1);
    const offset = (jan1.getDay() + 6) % 7; // monday first
    const max = Math.max(1, ...s.byDay.values());
    const short = L.monthsShort();

    for (let d = new Date(jan1), i = offset; d.getFullYear() === s.year; d.setDate(d.getDate() + 1), i++) {
      const col = Math.floor(i / 7) + 1;
      if (d.getDate() === 1) {
        cells.push(el('span', { class: 'm', text: short[d.getMonth()], style: `grid-row:1;grid-column:${col} / span 3` }));
      }
      const min = s.byDay.get(Stats.dayKey(d)) || 0;
      const level = min === 0 ? 0 : Math.min(4, Math.ceil((min / max) * 4));
      const label = `${fmtDate(d)}: ${min ? fmtDuration(min) : '—'}`;
      cells.push(el('i', { class: 'l' + level, title: label, style: `grid-row:${(i % 7) + 2};grid-column:${col};--c:${col + (i % 7)}` }));
    }
    $('#heatmap').replaceChildren(...cells);
  }

  // ---- year vs year ----
  function renderCompare(s) {
    const section = $('#compare-section');
    const h = (s.history || []).filter(x => x.minutes > 0);
    if (h.length < 2) { section.hidden = true; return; }
    section.hidden = false;
    const prev = previousYear(s);
    let title, sub = '';
    if (prev) {
      const d = Math.round(((s.totalMinutes - prev.minutes) / Math.max(1, prev.minutes)) * 100);
      title = Math.abs(d) < 3 ? t('Casi lo mismo que en {y}', { y: prev.year })
        : d > 0 ? t('Jugaste un {p} % más que en {y}', { p: d, y: prev.year })
        : t('Jugaste un {p} % menos que en {y}', { p: -d, y: prev.year });
      sub = t('{a} h frente a {b} h · {c} días frente a {d}', { a: hours(s.totalMinutes), b: hours(prev.minutes), c: s.daysPlayed, d: prev.days });
    } else {
      title = t('{y} fue tu primer año registrado', { y: s.year });
    }
    const idx = h.findIndex(x => x.year === s.year);
    $('#compare').replaceChildren(
      ...chartHead(t('Año contra año'), title, sub),
      bars(h.map(x => x.minutes), h.map(x => String(x.year)), h.map(x => t('{h} h en {y}', { h: hours(x.minutes), y: x.year })),
        { highlight: idx, peakLabel: `${hours(s.totalMinutes)} h` })
    );
  }

  // ---- icons (drawn for this project) ----
  const ICONS = {
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    sunrise: '<path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 4v4M5.6 9.6l1.4 1.4M18.4 9.6 17 11M8 22h8"/>',
    cup: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
    flame: '<path d="M12 3c.8 3.6 5 5.2 5 10a5 5 0 0 1-10 0c0-2.3 1.2-3.8 2.4-4.8.2 1.6 1 2.7 2.3 3.1C11 8.5 11 5.6 12 3z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    sofa: '<path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4H3zM6 17v2M18 17v2"/>',
    steps: '<path d="M8 3c2 0 3 2 3 4.5S10 12 8 12s-3-2-3-4.5S6 3 8 3zM6 14h4v2a2 2 0 0 1-4 0zM16 8c2 0 3 2 3 4.5S18 17 16 17s-3-2-3-4.5S14 8 16 8zM14 19h4v.5a2 2 0 0 1-4 0z"/>',
    medal: '<circle cx="12" cy="14" r="6"/><path d="M8.5 9 6 3h4l2 4 2-4h4l-2.5 6M12 11.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"/>',
  };
  function icon(name, cls = 'chip-ico') {
    const span = el('span', { class: cls, 'aria-hidden': 'true' });
    span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
    return span;
  }

  // ---- medals ----
  const share = (arr, a, b) => sum(arr.slice(a, b)) / Math.max(1, sum(arr));
  const MEDALS = [
    { ico: 'moon', name: 'Noctámbulo', desc: 'Más del 15 % de tus horas, de madrugada', test: s => share(s.byHour, 0, 6) >= 0.15 },
    { ico: 'sunrise', name: 'Madrugador', desc: 'Más del 10 % de tus horas entre las 6 y las 10', test: s => share(s.byHour, 6, 10) >= 0.1 },
    { ico: 'timer', name: 'Maratón', desc: 'Una partida de 4 horas o más', test: s => s.longestSession && s.longestSession.minutes >= 240 },
    { ico: 'heart', name: 'Fiel', desc: 'Un solo juego ocupa la mitad de tu año', test: s => s.games[0] && s.games[0].minutes >= s.totalMinutes * 0.5 },
    { ico: 'grid', name: 'Coleccionista', desc: '20 juegos o más en el año', test: s => s.gameCount >= 20 },
    { ico: 'flame', name: 'Constante', desc: 'Una racha de 14 días o más', test: s => s.streak.length >= 14 },
    { ico: 'calendar', name: 'Todo el año', desc: 'Jugaste los 12 meses', test: s => s.byMonth.every(m => m > 0) },
    { ico: 'sofa', name: 'Finde', desc: 'La mitad de tus horas, en fin de semana', test: s => { const w = weekdayTotals(s); return (w[5] + w[6]) / Math.max(1, sum(w)) >= 0.5; } },
    { ico: 'steps', name: 'Caminante', desc: '500.000 pasos en el año', test: s => s.steps && s.steps.year >= 500000 },
    { ico: 'medal', name: 'Veterano', desc: '1.000 horas desde siempre', test: s => s.lifetime && s.lifetime.totalMinutes >= 60000 },
  ];
  const earnedMedals = s => MEDALS.filter(m => m.test(s));

  function renderMedals(s) {
    const won = new Set(earnedMedals(s));
    // earned first
    const list = [...MEDALS].sort((a, b) => won.has(b) - won.has(a));
    $('#medals-head').replaceChildren(el('p', { class: 'cs', text: t('Has ganado {n} de {t}', { n: won.size, t: MEDALS.length }) }));
    $('#medals').replaceChildren(...list.map((m, i) =>
      reveal(el('div', { class: 'medal' + (won.has(m) ? ' won' : '') }, [
        el('div', { class: 'medal-disc' }, icon(m.ico, 'medal-ico')),
        el('div', { class: 'medal-name', text: t(m.name) }),
        el('div', { class: 'medal-desc', text: t(m.desc) }),
      ]), 50 * i)
    ));
  }

  // ---- highlights ----
  // big cards with the cover for the moments tied to a game
  function awardCard(g, label, value, note, extraClass = '') {
    const bg = el('div', { class: 'award-bg' });
    const url = coverUrls(g.code, g.platform)[0];
    if (url) bg.style.backgroundImage = `url("${url}")`;
    return el('article', { class: 'award ' + extraClass }, [
      bg,
      el('div', { class: 'award-art' }, cover(g)),
      el('div', { class: 'award-txt' }, [
        el('div', { class: 'ck', text: label }),
        el('div', { class: 'award-value', text: value }),
        el('div', { class: 'award-game', text: g.game }),
        note ? el('div', { class: 'cs', text: note }) : null,
      ]),
    ]);
  }

  function renderAwards(s) {
    const items = [];
    const add = (...args) => items.push(reveal(awardCard(...args), 90 * items.length));
    if (s.longestSession) add(s.longestSession, t('Partida más larga'), fmtDuration(s.longestSession.minutes), t('el {d}', { d: fmtDate(s.longestSession.start) }));
    if (s.firstSession) add(s.firstSession, t('Primer juego del año'), fmtDate(s.firstSession.start), t('así empezó tu año'));
    if (s.forgotten && s.games.length > 1) {
      const end = new Date(Math.min(Date.now(), new Date(s.year, 11, 31).getTime()));
      const days = Math.max(1, Math.round((end - s.forgotten.last) / 864e5));
      add(s.forgotten, t('El olvidado'), t('{n} días sin abrirlo', { n: days }), t('la última vez fue el {d}', { d: fmtDate(s.forgotten.last) }));
    }
    $('#awards').replaceChildren(...items);
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
    chip(peak < 6 || peak >= 20 ? 'moon' : peak < 12 ? 'sun' : 'cup', t('Tu perfil'), t(s.personality.name), t(s.personality.desc));
    if (s.streak.length) chip('flame', t('Racha más larga'), t('{n} días seguidos', { n: s.streak.length }), t('del {a} al {b}', { a: fmtDate(s.streak.from), b: fmtDate(s.streak.to) }));
    if (s.bestDay) chip('calendar', t('Día con más juego'), fmtDate(s.bestDay.date), fmtDuration(s.bestDay.minutes));
    if (s.sessionCount) chip('timer', t('Partida media'), fmtDuration(s.totalMinutes / s.sessionCount), t('en {n} partidas', { n: s.sessionCount }));
    $('#highlights').replaceChildren(...items);
  }

  // ---- your whole 3DS ----
  function renderLife(s) {
    const section = $('#life-section');
    const life = s.lifetime;
    if (!life) { section.hidden = true; return; }
    section.hidden = false;
    const stat = (value, label) => el('div', { class: 'life-stat' }, [counter(value), el('span', { text: label })]);
    const items = [
      reveal(el('div', { class: 'panel life-main' }, [
        el('div', { class: 'ck', text: t('Toda tu 3DS') }),
        el('div', { class: 'life-hours' }, [counter(Math.round(life.totalMinutes / 60)), el('small', { text: ' ' + t('horas') })]),
        el('p', { class: 'cs', text: life.since ? t('jugadas desde {d}', { d: monthYear(life.since) }) : t('jugadas desde que tienes la consola') }),
        el('div', { class: 'life-stats' }, [
          stat(life.titles, t('títulos')),
          stat(life.launches, t('veces que abriste algo')),
        ]),
      ]), 0),
    ];
    if (life.top && life.top.game) {
      items.push(reveal(awardCard(life.top, t('Tu juego de siempre'), `${hours(life.top.minutes)} h`,
        life.top.launches ? t('abierto {n} veces', { n: num(life.top.launches) }) : null, 'life-top'), 120));
    }
    if (s.steps && s.steps.total) {
      const km = Math.round(s.steps.total * 0.00075);
      items.push(reveal(el('div', { class: 'panel life-steps' }, [
        icon('steps', 'chip-ico big'),
        el('div', {}, [
          el('div', { class: 'ck', text: t('Pasos') }),
          el('div', { class: 'life-steps-n' }, counter(s.steps.total)),
          el('p', { class: 'cs', text: t('≈ {k} km caminados con la consola', { k: num(km) }) }),
          s.steps.year ? el('p', { class: 'cs', text: t('{n} este año', { n: num(s.steps.year) }) }) : null,
        ]),
      ]), 220));
    }
    $('#life').replaceChildren(...items);
  }

  // ---- shareable card: "post" or vertical "story" ----
  let cardFormat = 'post';

  function renderShareCard(s) {
    const card = $('#share-card');
    card.classList.toggle('story', cardFormat === 'story');
    const months = s.byMonth;
    const mmax = Math.max(1, ...months);
    const g1 = s.games[0];
    const medals = earnedMedals(s).length;

    card.replaceChildren(
      el('div', { class: 'sc-orb a' }),
      el('div', { class: 'sc-orb b' }),
      el('div', { class: 'sc-head' }, [
        el('img', { src: 'img/icon-180.png', alt: '', width: 34, height: 34 }),
        el('span', { text: '3DS Wrapped' }),
        el('b', { class: 'sc-year', text: s.year }),
      ]),
      el('div', { class: 'sc-hours' }, [hours(s.totalMinutes), el('small', { text: ' ' + t('horas') })]),
      el('div', { class: 'sc-sub', text: t('jugando a {g} juegos en {d} días', { g: s.gameCount, d: s.daysPlayed }) }),
      g1 ? el('div', { class: 'sc-goty story-only' }, [
        el('span', { text: t('Tu juego del año') }),
        el('b', { text: g1.game }),
        el('em', { text: t('{h} h · {p} % de tu tiempo', { h: hours(g1.minutes), p: pct(g1.minutes, s.totalMinutes) }) }),
      ]) : null,
      el('ol', { class: 'sc-list' }, s.games.slice(0, 5).map((g, i) =>
        el('li', {}, [el('b', { text: i + 1 }), el('span', { class: 't', text: g.game }), el('span', { class: 'h', text: `${hours(g.minutes)} h` })])
      )),
      el('div', { class: 'sc-year-bars' }, [
        el('span', { text: t('Tu año') }),
        el('div', { class: 'sc-bars' }, months.map((v, i) =>
          el('i', { class: i === s.bestMonth ? 'top' : '', style: `height:${Math.max(6, (v / mmax) * 100)}%` }))),
      ]),
      el('div', { class: 'sc-tags' }, [
        el('span', { text: t(s.personality.name) }),
        s.streak.length ? el('span', { text: t('racha de {n} días', { n: s.streak.length }) }) : null,
        medals ? el('span', { text: t('{n} medallas', { n: medals }) }) : null,
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
    if (!window.html2canvas) throw new Error(t('No se pudo cargar html2canvas (¿sin conexión?).'));
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
      await navigator.share({ files: [file], title: '3DS Wrapped', text: t('Mi año {y} en la 3DS', { y: $('#year').value }) });
    } catch (e) {
      if (e.name !== 'AbortError') downloadCard();
    }
  }

  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' });
    $('#share').hidden = !(navigator.canShare && navigator.canShare({ files: [probe] }));
  } catch { /* no share support */ }

  // ---- static text, language switch, events ----
  L.applyStatic();
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('is-on', b.dataset.lang === L.lang);
    b.addEventListener('click', () => { if (b.dataset.lang !== L.lang) L.setLang(b.dataset.lang); });
  });

  $('#file').addEventListener('change', e => e.target.files[0] && loadFile(e.target.files[0]));
  $('#demo').addEventListener('click', () => start(SampleData.generate()));
  $('#year').addEventListener('change', e => render(e.target.value));
  $('#download').addEventListener('click', downloadCard);
  $('#share').addEventListener('click', shareCard);
  $('#hero').addEventListener('click', e => { if (e.target.closest('.replay-intro')) playIntro(); });
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
