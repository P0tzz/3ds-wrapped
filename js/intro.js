// Full-screen intro that reveals the game of the year with a theme picked from its title.
// Everything here is original: abstract particles, colours and timing, plus the game's cover.
(function (W) {
  const THEMES = [
    { id: 'countdown', test: /majora/i, colors: ['#ffb347', '#ff6a3d', '#c45cff'], fx: 'ember', reveal: 'countdown',
      lines: ['Tic, tac…', 'El reloj corría y tú seguías volviendo.'] },
    { id: 'haunted', test: /luigi.?s mansion|ghost|fantasma/i, colors: ['#a8ffbf', '#5fe08f', '#eafff0'], fx: 'dust', reveal: 'spotlight',
      lines: ['Se apagan las luces…', 'Algo te estuvo esperando en la oscuridad.'] },
    { id: 'race', test: /kart|racing|carrera|f-zero|ridge racer|asphalt|burnout/i, colors: ['#ff4040', '#ffd23f', '#ffffff'], fx: 'speed', reveal: 'race',
      lines: ['Motores encendidos.', 'Hubo una pista que no dejaste de correr.'] },
    { id: 'battle', test: /smash|fire emblem|monster hunter|bravely|xenoblade|kid icarus|street fighter|dead or alive|tekken|fighter/i, colors: ['#ff5252', '#ffd166', '#ffffff'], fx: 'spark', reveal: 'impact',
      lines: ['Un combate más…', 'y luego otro, y otro, y otro.'] },
    { id: 'creatures', test: /pok[eé]mon|yo-?kai|digimon|nintendogs|monster/i, colors: ['#ffd23f', '#ff5c8a', '#3ec7ff', '#7cff6b'], fx: 'confetti', reveal: 'impact',
      lines: ['Hubo un viaje…', 'que te atrapó de verdad.'] },
    { id: 'cozy', test: /animal crossing|tomodachi|harvest moon|story of seasons|stardew|style savvy|cooking|happy home/i, colors: ['#ffb7c5', '#ffd59e', '#b5e48c', '#a0e7e5'], fx: 'leaf', reveal: 'rise',
      lines: ['Un sitio tranquilo…', 'al que siempre acababas volviendo.'] },
    { id: 'platform', test: /mario|kirby|donkey kong|yoshi|wario|sonic|rayman|shovel knight|mega ?man|crash/i, colors: ['#ffd23f', '#ff8a00', '#ffffff'], fx: 'star', reveal: 'bounce',
      lines: ['Salto…', 'tras salto, tras salto.'] },
    { id: 'adventure', test: /zelda|dragon quest|final fantasy|layton|metroid|castlevania|ocarina|link/i, colors: ['#ffe08a', '#ffc94a', '#9be7ff'], fx: 'spark', reveal: 'rise',
      lines: ['Toda gran historia empieza igual…', 'y la tuya tuvo una aventura favorita.'] },
  ];
  const DEFAULT = { id: 'default', colors: ['#3ea6ff', '#00aaff', '#ffffff'], fx: 'spark', reveal: 'rise',
    lines: ['Este año jugaste mucho…', 'pero hubo un juego que destacó.'] };

  const pickTheme = name => THEMES.find(t => t.test.test(name || '')) || DEFAULT;

  // ---- particles on a canvas ----
  const RATE = { ember: 2.2, spark: 1.4, confetti: 1, leaf: 0.35, speed: 2.4, dust: 0.7, star: 0.8 };

  function particles(canvas, theme) {
    const ctx = canvas.getContext('2d');
    const list = [];
    let w = 0, h = 0, raf = 0, rate = 1;
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
        life: 1, decay: rnd(0.003, 0.008), c: pick(theme.colors), rot: rnd(0, 6.28), vr: rnd(-0.06, 0.06) };
      if (t === 'leaf' || t === 'confetti') { p.y = -12; p.vy = rnd(0.6, 1.6); p.s = rnd(5, 9); }
      if (t === 'speed') { p.x = w + 20; p.y = rnd(0, h); p.vx = rnd(-26, -12); p.vy = 0; p.s = rnd(40, 160); p.decay = 0.012; }
      if (t === 'dust') { p.y = rnd(0, h); p.vx = rnd(-0.25, 0.25); p.vy = rnd(-0.25, 0.25); p.s = rnd(1, 2.5); p.decay = rnd(0.002, 0.005); }
      if (t === 'star') { p.s = rnd(3, 6); }
      // embers and sparks float up through the whole screen
      if (t === 'ember' || t === 'spark') { p.vy = rnd(-2.4, -0.8); p.decay = rnd(0.0018, 0.004); }
      if (burst) {
        const a = rnd(0, 6.28), sp = rnd(3, 12);
        Object.assign(p, { x: w / 2, y: h * 0.42, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, decay: rnd(0.009, 0.018), burst: true });
        if (t !== 'speed') p.s = rnd(3, 7);
      }
      list.push(p);
    }

    function star(x, y, r) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283, rr = i % 2 ? r * 0.38 : r;
        ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    }

    function draw(p) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.c; ctx.strokeStyle = p.c;
      const t = theme.fx;
      if (t === 'speed' && !p.burst) {
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.s, p.y); ctx.stroke();
      } else if (t === 'confetti') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      } else if (t === 'leaf') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s / 2.2, 0, 0, 6.283); ctx.fill(); ctx.restore();
      } else if (t === 'star') {
        star(p.x, p.y, p.s);
      } else {
        // glowing dot (ember, spark, dust)
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 3);
        g.addColorStop(0, p.c); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 3, 0, 6.283); ctx.fill();
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = theme.fx === 'confetti' || theme.fx === 'leaf' ? 'source-over' : 'lighter';
      let n = RATE[theme.fx] * rate;
      while (n > 0) { if (Math.random() < n) spawn(false); n -= 1; }
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if (p.burst) { p.vx *= 0.96; p.vy = p.vy * 0.96 + 0.12; }
        if (theme.fx === 'leaf') p.x += Math.sin(p.y / 40 + p.rot) * 0.9;
        if (theme.fx === 'ember') p.x += Math.sin(p.y / 25) * 0.4;
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

  // ---- timeline ----
  let playing = null;

  async function play(s, helpers) {
    const g = s.games[0];
    if (!g || W.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (playing) playing.skip();

    const theme = pickTheme(g.game);
    const root = document.getElementById('intro');
    const $ = sel => root.querySelector(sel);
    root.className = `intro-fx theme-${theme.id}`;
    theme.colors.forEach((c, i) => root.style.setProperty(`--fx${i + 1}`, c));
    $('.fx-line').textContent = '';
    $('.fx-line').classList.remove('on');
    $('.fx-hint').classList.remove('on');
    $('.fx-spot').classList.remove('on');
    $('.fx-pre').replaceChildren();
    $('.fx-cover').replaceChildren(helpers.cover(g));
    $('.fx-kicker').textContent = `Tu juego de ${s.year}`;
    $('.fx-title').textContent = g.game;
    $('.fx-hours').textContent = '0 horas';
    $('.fx-sub').textContent = `${Math.round((g.minutes / Math.max(1, s.totalMinutes)) * 100)} % de tu tiempo este año`;
    root.hidden = false;
    document.body.classList.add('fx-open');

    const fx = particles($('canvas'), theme);
    const pending = new Set();
    let skipped = false;
    const wait = ms => new Promise(resolve => {
      if (skipped) return resolve();
      const t = setTimeout(done, ms);
      function done() { clearTimeout(t); pending.delete(done); resolve(); }
      pending.add(done);
    });
    const skip = () => { skipped = true; [...pending].forEach(f => f()); };
    playing = { skip };
    const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip(); };
    $('.fx-skip').onclick = skip;
    document.addEventListener('keydown', onKey);

    try {
      await wait(250);
      for (const line of theme.lines) {
        if (skipped) break;
        const el = $('.fx-line');
        el.textContent = line; el.classList.add('on');
        await wait(1600);
        el.classList.remove('on');
        await wait(380);
      }
      if (!skipped) await preReveal(theme, $, fx, wait, () => skipped);

      root.classList.add('revealed');
      if (theme.reveal === 'impact' || theme.reveal === 'race') root.classList.add('shake');
      fx.burst(theme.fx === 'speed' ? 50 : 130);
      fx.setRate(1.6);
      countHours($('.fx-hours'), Math.round(g.minutes / 60), skipped);
      root.onclick = e => { if (!e.target.closest('.fx-skip')) skip(); };
      await wait(3400);
      $('.fx-hint').classList.add('on');
      await wait(2600);
    } finally {
      root.onclick = null;
      document.removeEventListener('keydown', onKey);
      root.classList.add('out');
      await new Promise(r => setTimeout(r, 550));
      fx.stop();
      root.hidden = true;
      root.className = 'intro-fx';
      document.body.classList.remove('fx-open');
      playing = null;
    }
  }

  async function preReveal(theme, $, fx, wait, isSkipped) {
    const pre = $('.fx-pre');
    if (theme.reveal === 'countdown') {
      // the hours run out fast; the reveal comes at zero
      const n = document.createElement('div');
      n.className = 'fx-clock';
      pre.append(n);
      const t0 = performance.now(), dur = 1700;
      await new Promise(resolve => {
        const step = now => {
          const p = Math.min(1, (now - t0) / dur);
          n.textContent = String(Math.round(72 * (1 - p * p))).padStart(2, '0');
          if (p < 1 && !isSkipped()) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
      });
      fx.setRate(3);
      await wait(250);
      pre.replaceChildren();
    } else if (theme.reveal === 'race') {
      const lights = document.createElement('div');
      lights.className = 'fx-lights';
      lights.innerHTML = '<i></i><i></i><i></i>';
      pre.append(lights);
      fx.setRate(0.2);
      for (const l of lights.children) { await wait(520); l.classList.add('on'); }
      await wait(520);
      lights.classList.add('go');
      fx.setRate(4);
      await wait(260);
      pre.replaceChildren();
    } else if (theme.reveal === 'spotlight') {
      $('.fx-spot').classList.add('on');
      await wait(1900);
    } else {
      fx.setRate(0.35);
      await wait(450);
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
