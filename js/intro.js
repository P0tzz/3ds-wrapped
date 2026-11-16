// Full-screen intro that reveals the game of the year.
// Each theme plays a short original scene (shapes, light, particles) before showing the game's cover.
(function (W) {
  const D = document;

  // ---------- themes ----------
  // lines can be functions so they are built at play time
  const T = (id, test, colors, fx, lines, setup, run) => ({ id, test, colors, fx, lines, setup, run });

  const THEMES = [
    T('countdown', /majora/i, ['#ffb35c', '#ff6a3d', '#f3c58a'], 'ash',
      ['Todo tiene un final…'], setupCountdown, runCountdown),
    T('haunted', /luigi.?s mansion|ghost|fantasma/i, ['#a8ffbf', '#5fe08f', '#eafff0'], 'dust',
      ['Se apagan las luces…', 'No estabas solo ahí dentro.'], setupHaunted, runHaunted),
    T('race', /kart|racing|carrera|f-zero|ridge racer|asphalt|burnout/i, ['#ff4040', '#ffd23f', '#ffffff'], 'speed',
      ['Motores encendidos.', 'Una vuelta más. Siempre una más.'], null, runRace),
    T('tactics', /fire emblem|advance wars|tactics|codename/i, ['#7fd1ff', '#ffd166', '#ffffff'], 'spark',
      ['Cada movimiento contaba…', 'y este juego se llevó todos los tuyos.'], null, runTactics),
    T('sky', /kid icarus|pilotwings|star ?fox/i, ['#ffffff', '#bfe6ff', '#ffe9a8'], 'feather',
      ['Arriba, entre las nubes…', 'pasaste muchas horas volando.'], setupSky, runSky),
    T('battle', /smash|monster hunter|bravely|xenoblade|street fighter|dead or alive|tekken|fighter/i, ['#ff5252', '#ffd166', '#ffffff'], 'spark',
      ['Un combate más…', 'y luego otro, y otro, y otro.'], null, runBattle),
    T('creatures', /pok[eé]mon|yo-?kai|digimon|nintendogs|monster/i, ['#ffd23f', '#ff5c8a', '#3ec7ff', '#7cff6b'], 'confetti',
      ['Algo se mueve entre la hierba…', '¡Un encuentro que duró todo el año!'], setupCreatures, runCreatures),
    T('cozy', /animal crossing|tomodachi|harvest moon|story of seasons|stardew|style savvy|cooking|happy home/i, ['#ffb7c5', '#ffd59e', '#b5e48c', '#a0e7e5'], 'leaf',
      [() => `Son las ${clockText()}…`, 'y siempre acababas volviendo a tu rincón.'], setupCozy, wait(1500)),
    T('platform', /mario|kirby|donkey kong|yoshi|wario|sonic|rayman|shovel knight|mega ?man|crash/i, ['#ffd23f', '#ff8a00', '#ffffff'], 'star',
      ['Salto…', 'tras salto, tras salto.'], setupPlatform, runPlatform),
    T('legend', /ocarina/i, ['#ffd86b', '#fff3c4', '#7fd4ff'], 'twinkle',
      ['Hace mucho tiempo, en tu consola…'], setupLegend, runLegend),
    T('dawn', /zelda|dragon quest|final fantasy|layton|metroid|castlevania|link/i, ['#ffe08a', '#ffc94a', '#9be7ff'], 'twinkle',
      ['Toda gran aventura empieza de noche…', 'y la tuya duró hasta el amanecer.'], setupDawn, runDawn),
  ];
  const DEFAULT = T('default', null, ['#3ea6ff', '#00aaff', '#ffffff'], 'spark',
    ['Este año jugaste mucho…', 'pero hubo un juego que destacó.'], setupDefault, wait(600));

  const pickTheme = name => THEMES.find(t => t.test.test(name || '')) || DEFAULT;

  function clockText() {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  }

  // ---------- scene helpers ----------
  function layer(S, cls, html) {
    const d = D.createElement('div');
    d.className = 'fx-layer ' + cls;
    if (html) d.innerHTML = html;  // static markup only
    S.scene.append(d);
    return d;
  }
  function wait(ms) { return S => S.wait(ms); }
  function restartClass(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  // countdown: a short film. A town at dusk, a sphere that sinks a little more each day,
  // the windows go out, title cards between cuts, and a white-out before the reveal.
  function townSilhouette() {
    const r = Math.random;
    let d = 'M0 200', x = 0, tower = null;
    const windows = [];
    while (x < 1200) {
      let w = 34 + r() * 56, h = 34 + r() * 62;
      const isTower = !tower && x + w > 560;
      if (isTower) { w = 76; h = 168; tower = { cx: x + w / 2, cy: 200 - h + 34 }; }
      d += ` V${(200 - h).toFixed(0)}`;
      if (isTower) {
        d += ` H${(x + 20).toFixed(0)} L${(x + w / 2).toFixed(0)} ${(200 - h - 52).toFixed(0)} L${(x + w - 20).toFixed(0)} ${(200 - h).toFixed(0)} H${(x + w).toFixed(0)}`;
      } else if (r() < 0.55) {
        d += ` L${(x + w / 2).toFixed(0)} ${(200 - h - 14 - r() * 16).toFixed(0)} L${(x + w).toFixed(0)} ${(200 - h).toFixed(0)}`;
      } else {
        d += ` H${(x + w).toFixed(0)}`;
      }
      if (!isTower) {
        for (let k = 0; k < 2; k++) {
          if (r() < 0.7) windows.push(`<rect x="${(x + 8 + r() * (w - 20)).toFixed(0)}" y="${(200 - h + 10 + r() * (h - 24)).toFixed(0)}" width="5" height="7" rx="1"/>`);
        }
      }
      x += w;
    }
    d += ' V200 Z';
    return { d, tower, windows: windows.join('') };
  }

  function setupCountdown(S) {
    const town = townSilhouette();
    layer(S, 'mm-world',
      '<div class="mm-sky"></div><div class="mm-tint"></div>' +
      '<div class="mm-orb"><svg viewBox="0 0 200 200"><defs>' +
      '<radialGradient id="mmGlow" cx="42%" cy="38%" r="65%"><stop offset="0" stop-color="#ffe9c2"/><stop offset=".42" stop-color="#e8955a"/>' +
      '<stop offset=".78" stop-color="#8a3d24"/><stop offset="1" stop-color="#2e0f0a"/></radialGradient>' +
      '<filter id="mmSurface" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".028" numOctaves="5" seed="11"/>' +
      '<feColorMatrix values="0 0 0 0 .22  0 0 0 0 .08  0 0 0 0 .04  0 0 0 1.1 -.35"/><feComposite in2="SourceGraphic" operator="in"/></filter>' +
      '<radialGradient id="mmShade" cx="35%" cy="30%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".65"/></radialGradient>' +
      '</defs><circle cx="100" cy="100" r="97" fill="url(#mmGlow)"/>' +
      '<circle cx="100" cy="100" r="97" fill="#000" filter="url(#mmSurface)"/>' +
      '<circle cx="100" cy="100" r="97" fill="url(#mmShade)"/></svg></div>' +
      '<div class="mm-haze"></div>' +
      `<svg class="mm-town" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax slice"><path class="town" d="${town.d}"/>` +
      `<g class="win">${town.windows}</g><circle class="bell" cx="${town.tower.cx.toFixed(0)}" cy="${town.tower.cy.toFixed(0)}" r="9"/></svg>`);
    layer(S, 'mm-vignette');
    layer(S, 'mm-grain');
    layer(S, 'mm-bars', '<i></i><i></i>');
    layer(S, 'mm-card', '<span class="k"></span><b></b><span class="h"></span>');
    layer(S, 'mm-dip');
    layer(S, 'mm-bloom');
    requestAnimationFrame(() => S.root.classList.add('mm-on'));
  }

  async function runCountdown(S) {
    const card = S.scene.querySelector('.mm-card');
    const DAYS = [['· I ·', 'Primer día', '72 horas'], ['· II ·', 'Segundo día', '48 horas'], ['· III ·', 'Último día', '24 horas']];
    for (let i = 0; i < DAYS.length && !S.skipped(); i++) {
      S.root.classList.add('mm-cut');          // quick cut to black
      await S.wait(170);
      S.root.dataset.day = i + 1;
      card.querySelector('.k').textContent = DAYS[i][0];
      card.querySelector('b').textContent = DAYS[i][1];
      card.querySelector('.h').textContent = `— ${DAYS[i][2]} —`;
      S.root.classList.remove('mm-cut');
      restartClass(card, 'show');
      S.fx.setRate(0.6 + i * 1.3);
      await S.wait(1800);
    }
    // the end: the sphere fills the sky and everything goes white
    S.root.classList.add('mm-end');
    S.fx.setRate(5);
    await S.wait(1500);
    S.root.classList.add('mm-white');
    await S.wait(1300);
  }

  // Zelda: night over the hills, then sunrise and rising notes
  function setupDawn(S) {
    layer(S, 'fx-daylight');
    layer(S, 'fx-sun');
    layer(S, 'fx-hills',
      '<svg viewBox="0 0 1200 300" preserveAspectRatio="none">' +
      '<path class="h1" d="M0 300V185C140 120 280 205 430 160S700 95 860 150 1100 175 1200 135V300Z"/>' +
      '<path class="h2" d="M0 300V238C190 200 360 262 560 222S900 246 1200 205V300Z"/></svg>');
  }
  async function runDawn(S) {
    S.root.classList.add('sunrise');
    S.fx.setRate(0.25);
    for (let i = 0; i < 10 && !S.skipped(); i++) {
      const n = layer(S, 'fx-note clear');
      n.textContent = i % 3 ? '♪' : '♫';
      n.style.left = `${12 + Math.random() * 76}%`;
      n.style.setProperty('--sway', `${(Math.random() * 60 - 30).toFixed(0)}px`);
      await S.wait(160);
    }
    await S.wait(1200);
  }

  // legend: low-poly field at night, a day/night time-lapse, an instrument, a treasure chest.
  // All shapes are generated here; the melody is random, not taken from any game.
  function lowPolyField() {
    const layers = [
      { base: 0.5, amp: 0.2, shades: ['#22355e', '#1b2b4f', '#2a3f6b'] },
      { base: 0.66, amp: 0.15, shades: ['#1c3b4a', '#163240', '#21455a'] },
      { base: 0.82, amp: 0.1, shades: ['#173a26', '#11301e', '#1c4530'] },
    ];
    let polys = '';
    for (const L of layers) {
      const pts = [];
      for (let x = 0; x < 1200; x += 55 + Math.random() * 70) pts.push([x, 300 * (L.base - Math.random() * L.amp)]);
      pts.push([1200, 300 * (L.base - Math.random() * L.amp)]);
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        const mx = (x1 + x2) / 2 + Math.random() * 24 - 12, my = Math.max(y1, y2) + 25 + Math.random() * 45;
        const c = k => L.shades[(i + k) % L.shades.length];
        const f = n => n.toFixed(0);
        polys += `<polygon points="${f(x1)},${f(y1)} ${f(x2)},${f(y2)} ${f(mx)},${f(my)}" fill="${c(0)}"/>`;
        polys += `<polygon points="${f(x1)},${f(y1)} ${f(mx)},${f(my)} ${f(x1)},300 ${f(mx)},300" fill="${c(1)}"/>`;
        polys += `<polygon points="${f(x2)},${f(y2)} ${f(mx)},${f(my)} ${f(mx)},300 ${f(x2)},300" fill="${c(2)}"/>`;
      }
    }
    return polys;
  }

  function setupLegend(S) {
    layer(S, 'lg-sky');
    layer(S, 'lg-wheel', '<i class="sun"></i><i class="moon"></i>');
    layer(S, 'lg-field', `<svg viewBox="0 0 1200 300" preserveAspectRatio="none">${lowPolyField()}</svg>`);
    layer(S, 'lg-fog');
  }

  async function runLegend(S) {
    // 1) a day passes over the field, counting the days actually played
    const days = (S.stats && S.stats.daysPlayed) || 100;
    const year = (S.stats && S.stats.year) || '';
    const counter = layer(S, 'lg-count clear', `<b>0</b><span>amaneceres jugando${year ? ' en ' + year : ''}</span>`);
    S.root.classList.add('lg-cycle');
    S.fx.setRate(0.6);
    await S.animate(2900, p => { counter.firstChild.textContent = Math.round(days * (1 - Math.pow(1 - p, 3))); });
    counter.firstChild.textContent = days;
    await S.wait(500);
    counter.classList.add('away');

    // 2) the instrument and six notes on a staff
    S.root.classList.add('lg-song');
    layer(S, 'lg-staff clear', '<i></i><i></i><i></i><i></i><i></i>');
    layer(S, 'lg-ocarina clear',
      '<svg viewBox="0 0 160 110"><defs><linearGradient id="lgClay" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#f6e7c8"/><stop offset=".6" stop-color="#d9b98a"/><stop offset="1" stop-color="#a87f4e"/></linearGradient></defs>' +
      '<path d="M18 58C18 30 56 14 92 18c30 3 52 18 50 38-2 24-34 40-70 38C40 92 18 80 18 58Z" fill="url(#lgClay)" stroke="#e7b75a" stroke-width="3"/>' +
      '<path d="M120 26l28-10 6 12-26 14Z" fill="url(#lgClay)" stroke="#e7b75a" stroke-width="3"/>' +
      '<path d="M30 60c20 8 60 10 96-4" fill="none" stroke="#e7b75a" stroke-width="2" opacity=".7"/>' +
      '<circle cx="58" cy="44" r="6" fill="#5a3c22"/><circle cx="80" cy="40" r="6" fill="#5a3c22"/>' +
      '<circle cx="100" cy="44" r="5" fill="#5a3c22"/><circle cx="72" cy="66" r="5" fill="#5a3c22"/></svg>');
    await S.wait(800);
    const glyphs = ['♪', '♫', '♪', '♩', '♫', '♪'];
    for (let i = 0; i < glyphs.length && !S.skipped(); i++) {
      const n = layer(S, 'lg-note clear', glyphs[i]);
      n.style.left = `${18 + i * 12.8}%`;
      n.style.top = `${30 + Math.floor(Math.random() * 5) * 3.2}%`;
      S.fx.burst(10);
      await S.wait(330);
    }
    await S.wait(450);

    // 3) a chest opens and the light pours out
    S.root.classList.add('lg-treasure');
    const chest = layer(S, 'lg-chest',
      '<svg viewBox="0 0 200 150"><defs><linearGradient id="lgWood" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#8a5a2e"/><stop offset="1" stop-color="#5a3518"/></linearGradient></defs>' +
      '<rect x="22" y="66" width="156" height="74" rx="6" fill="url(#lgWood)" stroke="#e7b75a" stroke-width="4"/>' +
      '<rect x="22" y="94" width="156" height="8" fill="#e7b75a" opacity=".8"/>' +
      '<rect x="90" y="84" width="20" height="26" rx="3" fill="#ffd86b"/><circle cx="100" cy="96" r="3.5" fill="#5a3518"/>' +
      '<g class="lid"><path d="M22 66V54c0-22 34-36 78-36s78 14 78 36v12Z" fill="url(#lgWood)" stroke="#e7b75a" stroke-width="4"/>' +
      '<path d="M60 26v40M140 26v40" stroke="#e7b75a" stroke-width="5" opacity=".8"/></g></svg>');
    layer(S, 'lg-rays');
    await S.wait(650);
    chest.classList.add('open');
    S.fx.setRate(2.5);
    await S.wait(700);
  }

  // Luigi's Mansion: mist, a flashlight and lightning
  function setupHaunted(S) {
    layer(S, 'fx-mist a');
    layer(S, 'fx-mist b');
  }
  async function runHaunted(S) {
    S.$('.fx-spot').classList.add('on');
    await S.wait(600);
    restartClass(S.root, 'lightning');
    await S.wait(750);
    restartClass(S.root, 'lightning');
    await S.wait(650);
  }

  // racing: starting lights and a chequered flag
  async function runRace(S) {
    const lights = layer(S, 'fx-lights clear', '<i></i><i></i><i></i>');
    S.fx.setRate(0.2);
    for (const l of lights.children) { await S.wait(520); l.classList.add('on'); }
    await S.wait(520);
    lights.classList.add('go');
    S.fx.setRate(4);
    layer(S, 'fx-flag clear');
    await S.wait(560);
  }

  // tactics: a board appears and a cursor picks a tile
  async function runTactics(S) {
    const cols = 7, rows = 5;
    const g = layer(S, 'fx-grid clear');
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = D.createElement('i');
        t.style.setProperty('--d', `${(r + c) * 45}ms`);
        g.append(t);
      }
    }
    const cur = D.createElement('b');
    cur.className = 'cursor';
    g.append(cur);
    await S.wait(750);
    for (const [c, r] of [[0, 4], [1, 3], [2, 3], [3, 2]]) {
      cur.style.setProperty('--c', c);
      cur.style.setProperty('--r', r);
      await S.wait(230);
    }
    g.children[2 * cols + 3].classList.add('sel');
    cur.classList.add('lock');
    await S.wait(550);
  }

  // Kid Icarus: flying up through clouds
  function setupSky(S) {
    for (let i = 0; i < 9; i++) {
      const c = layer(S, 'fx-cloud');
      c.style.left = `${Math.random() * 90 - 5}%`;
      c.style.setProperty('--w', `${30 + Math.random() * 40}vmin`);
      c.style.animationDuration = `${5 + Math.random() * 4}s`;
      c.style.animationDelay = `${-Math.random() * 8}s`;
    }
  }
  async function runSky(S) {
    S.root.classList.add('soar');
    S.fx.setRate(2);
    await S.wait(1500);
  }

  // fighting: two slashes of light
  async function runBattle(S) {
    for (const k of ['a', 'b']) {
      if (S.skipped()) break;
      layer(S, `fx-slash ${k} clear`);
      restartClass(S.root, 'jolt');
      S.fx.burst(35);
      await S.wait(420);
    }
    await S.wait(250);
  }

  // creatures: tall grass rustles, "!", then a bar transition
  function setupCreatures(S) {
    let blades = '';
    for (let i = 0; i < 70; i++) {
      const x = (i / 70) * 1200 + Math.random() * 10;
      const h = 70 + Math.random() * 90;
      const lean = Math.random() * 30 - 15;
      const shade = ['#2f9e44', '#37b24d', '#2b8a3e', '#40c057'][i % 4];
      blades += `<path d="M${x.toFixed(0)} 200Q${(x + lean / 2).toFixed(0)} ${(200 - h * 0.6).toFixed(0)} ${(x + lean).toFixed(0)} ${(200 - h).toFixed(0)}" stroke="${shade}"/>`;
    }
    layer(S, 'fx-grass', `<svg viewBox="0 0 1200 200" preserveAspectRatio="none">${blades}</svg>`);
  }
  async function runCreatures(S) {
    S.root.classList.add('rustle');
    await S.wait(900);
    layer(S, 'fx-alert clear', '!');
    await S.wait(750);
    const w = layer(S, 'fx-wipe');
    for (let i = 0; i < 8; i++) {
      const bar = D.createElement('i');
      bar.style.setProperty('--d', `${i * 45}ms`);
      w.append(bar);
    }
    await S.wait(700);
  }

  // cozy: sunset and a small clock with the viewer's time
  function setupCozy(S) {
    const n = new Date();
    const h = (n.getHours() % 12) * 30 + n.getMinutes() * 0.5;
    const m = n.getMinutes() * 6;
    const s = n.getSeconds() * 6;
    const c = layer(S, 'fx-cozyclock',
      '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/>' +
      '<line x1="50" y1="50" x2="50" y2="26" class="hh"/><line x1="50" y1="50" x2="50" y2="15" class="mm"/>' +
      '<line x1="50" y1="54" x2="50" y2="12" class="ss"/><circle cx="50" cy="50" r="3"/></svg>');
    c.querySelector('.hh').style.transform = `rotate(${h}deg)`;
    c.querySelector('.mm').style.transform = `rotate(${m}deg)`;
    c.querySelector('.ss').style.setProperty('--s0', `${s}deg`);
    layer(S, 'fx-sunset');
  }

  // platforms: ground, "¡Salto!" pops
  function setupPlatform(S) {
    layer(S, 'fx-ground');
  }
  async function runPlatform(S) {
    for (const [x, y] of [[22, 58], [70, 42], [42, 30]]) {
      if (S.skipped()) break;
      const p = layer(S, 'fx-pop clear', '¡Salto!');
      p.style.left = `${x}%`;
      p.style.top = `${y}%`;
      S.fx.burst(18);
      await S.wait(420);
    }
    await S.wait(250);
  }

  function setupDefault(S) {
    layer(S, 'fx-aurora a');
    layer(S, 'fx-aurora b');
    layer(S, 'fx-aurora c');
  }

  // ---------- particles ----------
  const RATE = { ember: 2.2, ash: 1.6, spark: 1.4, confetti: 1, leaf: 0.35, speed: 2.4, dust: 0.7, star: 0.8, feather: 0.45, twinkle: 3 };

  function particles(canvas, theme) {
    const ctx = canvas.getContext('2d');
    const list = [];
    let w = 0, h = 0, raf = 0, rate = 1, tick = 0;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = a => a[Math.floor(Math.random() * a.length)];

    function resize() {
      const dpr = Math.min(2, W.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(burst) {
      const t = theme.fx;
      const p = { x: rnd(0, w), y: h + 10, vx: rnd(-0.3, 0.3), vy: rnd(-1.6, -0.4), s: rnd(1.5, 3.5),
        life: 1, decay: rnd(0.003, 0.008), c: pick(theme.colors), rot: rnd(0, 6.28), vr: rnd(-0.06, 0.06), ph: rnd(0, 6.28) };
      if (t === 'leaf' || t === 'confetti' || t === 'feather') { p.y = -12; p.vy = rnd(0.6, 1.6); p.s = rnd(5, 9); }
      if (t === 'feather') { p.vy = rnd(0.5, 1.1); p.s = rnd(7, 12); p.decay = rnd(0.002, 0.004); }
      if (t === 'speed') { p.x = w + 20; p.y = rnd(0, h); p.vx = rnd(-26, -12); p.vy = 0; p.s = rnd(40, 160); p.decay = 0.012; }
      if (t === 'dust') { p.y = rnd(0, h); p.vx = rnd(-0.25, 0.25); p.vy = rnd(-0.25, 0.25); p.s = rnd(1, 2.5); p.decay = rnd(0.002, 0.005); }
      if (t === 'twinkle') { p.y = rnd(0, h * 0.7); p.vx = 0; p.vy = 0; p.s = rnd(0.6, 1.8); p.decay = rnd(0.002, 0.004); p.c = '#ffffff'; }
      if (t === 'star') { p.s = rnd(3, 6); }
      if (t === 'ember' || t === 'spark') { p.vy = rnd(-2.4, -0.8); p.decay = rnd(0.0018, 0.004); }
      // ash: carried sideways by the wind, rising slowly
      if (t === 'ash') { p.x = rnd(-w * 0.3, w * 0.9); p.y = rnd(h * 0.3, h + 10); p.vx = rnd(0.6, 2.2); p.vy = rnd(-0.9, -0.15); p.s = rnd(0.8, 2.4); p.decay = rnd(0.002, 0.005); }
      if (burst) {
        const a = rnd(0, 6.28), sp = rnd(3, 12);
        Object.assign(p, { x: w / 2, y: h * 0.42, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, decay: rnd(0.009, 0.018), burst: true, c: pick(theme.colors) });
        if (t !== 'speed') p.s = rnd(3, 7);
      }
      list.push(p);
    }

    function starShape(x, y, r) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283, rr = i % 2 ? r * 0.38 : r;
        ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    }

    function draw(p) {
      let alpha = Math.max(0, Math.min(1, p.life));
      if (theme.fx === 'twinkle' && !p.burst) alpha *= 0.5 + 0.5 * Math.sin(tick * 0.08 + p.ph);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.c; ctx.strokeStyle = p.c;
      const t = theme.fx;
      if (t === 'speed' && !p.burst) {
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.s, p.y); ctx.stroke();
      } else if (t === 'confetti') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      } else if (t === 'leaf') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s / 2.2, 0, 0, 6.283); ctx.fill(); ctx.restore();
      } else if (t === 'feather' && !p.burst) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s / 3.5, 0, 0, 6.283); ctx.fill();
        ctx.globalAlpha = alpha * 0.5; ctx.fillStyle = '#9fc9ff'; ctx.fillRect(-p.s, -0.5, p.s * 2, 1);
        ctx.restore();
      } else if (t === 'star' || t === 'twinkle') {
        starShape(p.x, p.y, p.s * (t === 'twinkle' ? 2 : 1));
      } else {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 3);
        g.addColorStop(0, p.c); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 3, 0, 6.283); ctx.fill();
      }
    }

    function frame() {
      tick++;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = ['confetti', 'leaf', 'feather'].includes(theme.fx) ? 'source-over' : 'lighter';
      let n = RATE[theme.fx] * rate;
      while (n > 0) { if (Math.random() < n) spawn(false); n -= 1; }
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if (p.burst) { p.vx *= 0.96; p.vy = p.vy * 0.96 + 0.12; }
        if (theme.fx === 'leaf' || theme.fx === 'feather') p.x += Math.sin(p.y / 40 + p.ph) * 0.9;
        if (theme.fx === 'ember') p.x += Math.sin(p.y / 25) * 0.4;
        if (theme.fx === 'ash') p.y += Math.sin((p.x + tick) / 60 + p.ph) * 0.35;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
        if (p.life <= 0 || p.y > h + 40 || p.y < -60 || p.x < -200 || p.x > w + 200) { list.splice(i, 1); continue; }
        draw(p);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    resize();
    W.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
    return {
      burst(n) { for (let i = 0; i < n; i++) spawn(true); },
      setRate(r) { rate = r; },
      stop() { cancelAnimationFrame(raf); W.removeEventListener('resize', resize); },
    };
  }

  // ---------- timeline ----------
  let playing = null;

  async function play(s, helpers) {
    const g = s.games[0];
    if (!g || W.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (playing) playing.skip();

    const theme = pickTheme(g.game);
    const root = D.getElementById('intro');
    const $ = sel => root.querySelector(sel);
    root.className = `intro-fx theme-${theme.id}`;
    delete root.dataset.day;
    theme.colors.forEach((c, i) => root.style.setProperty(`--fx${i + 1}`, c));
    $('.fx-line').textContent = '';
    $('.fx-line').classList.remove('on');
    $('.fx-hint').classList.remove('on');
    $('.fx-spot').classList.remove('on');
    $('.fx-scene').replaceChildren();
    $('.fx-cover').replaceChildren(helpers.cover(g));
    $('.fx-kicker').textContent = theme.id === 'legend' ? `La leyenda de tu ${s.year}` : `Tu juego de ${s.year}`;
    // title word by word
    $('.fx-title').replaceChildren(...g.game.split(/\s+/).flatMap((word, i) => {
      const sp = D.createElement('span');
      sp.textContent = word;
      sp.style.setProperty('--w', `${i * 70}ms`);
      return i ? [D.createTextNode(' '), sp] : [sp];  // real spaces between the animated words
    }));
    $('.fx-hours').textContent = '0 horas';
    $('.fx-sub').textContent = `${Math.round((g.minutes / Math.max(1, s.totalMinutes)) * 100)} % de tu tiempo este año`;
    root.hidden = false;
    D.body.classList.add('fx-open');

    const fx = particles($('canvas'), theme);
    const pending = new Set();
    let skipped = false;
    const waitFor = ms => new Promise(resolve => {
      if (skipped) return resolve();
      const t = setTimeout(done, ms);
      function done() { clearTimeout(t); pending.delete(done); resolve(); }
      pending.add(done);
    });
    const S = {
      root, scene: $('.fx-scene'), $, fx, stats: s,
      wait: waitFor,
      skipped: () => skipped,
      animate: (dur, fn) => new Promise(resolve => {
        const t0 = performance.now();
        const step = now => {
          const p = skipped ? 1 : Math.min(1, (now - t0) / dur);
          fn(p);
          if (p < 1) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
      }),
    };
    const skip = () => { skipped = true; [...pending].forEach(f => f()); };
    playing = { skip };
    const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip(); };
    $('.fx-skip').onclick = skip;
    D.addEventListener('keydown', onKey);

    try {
      if (theme.setup) theme.setup(S);
      await S.wait(300);
      for (const raw of theme.lines) {
        if (skipped) break;
        const el = $('.fx-line');
        el.textContent = typeof raw === 'function' ? raw() : raw;
        el.classList.add('on');
        await S.wait(1650);
        el.classList.remove('on');
        await S.wait(380);
      }
      if (!skipped && theme.run) await theme.run(S);

      root.classList.add('revealed');
      if (['battle', 'race', 'creatures'].includes(theme.id)) restartClass(root, 'shake');
      fx.burst(theme.fx === 'speed' ? 50 : 140);
      fx.setRate(1.6);
      countHours($('.fx-hours'), Math.round(g.minutes / 60), skipped);
      root.onclick = e => { if (!e.target.closest('.fx-skip')) skip(); };
      await S.wait(3600);
      $('.fx-hint').classList.add('on');
      await S.wait(2600);
    } finally {
      root.onclick = null;
      D.removeEventListener('keydown', onKey);
      root.classList.add('out');
      await new Promise(r => setTimeout(r, 550));
      fx.stop();
      root.hidden = true;
      root.className = 'intro-fx';
      $('.fx-scene').replaceChildren();
      D.body.classList.remove('fx-open');
      playing = null;
    }
  }

  function countHours(node, target, instant) {
    const fmt = v => `${Math.round(v).toLocaleString('es-ES')} horas`;
    if (instant) { node.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1500;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      node.textContent = fmt(target * (1 - Math.pow(2, -10 * p)));
      if (p < 1) requestAnimationFrame(step); else node.textContent = fmt(target);
    };
    requestAnimationFrame(step);
  }

  W.Intro = { play, pickTheme };
})(window);
