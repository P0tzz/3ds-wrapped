// decodes the "#w=" summary produced by the 3DS app (see docs/QR.md)
(function (W) {
  function fromBase64url(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
  }

  function reader(bytes) {
    let o = 0;
    const u = n => {
      if (o + n > bytes.length) throw new Error('El código QR está incompleto.');
      let v = 0;
      for (let i = 0; i < n; i++) v += bytes[o++] * 2 ** (8 * i);
      return v;
    };
    const tid = () => {
      const hi = u(2), lo = u(4);
      return ('0004' + hi.toString(16).padStart(4, '0') + lo.toString(16).padStart(8, '0')).toUpperCase();
    };
    return { u, tid };
  }

  function decode(str) {
    let bytes;
    try { bytes = fromBase64url(str); } catch { throw new Error('El código QR no es válido.'); }
    const r = reader(bytes);
    const version = r.u(1);
    if (version !== 1) throw new Error('Versión de datos no soportada. Actualiza la app de la 3DS.');

    const p = {
      year: r.u(2),
      totalMinutes: r.u(4),
      sessions: r.u(2),
      games: r.u(2),
      daysPlayed: r.u(2),
      top: [],
    };
    const n = r.u(1);
    for (let i = 0; i < n; i++) p.top.push({ tid: r.tid(), minutes: r.u(3), sessions: r.u(2), lastDoy: r.u(2) });
    p.hours = Array.from({ length: 24 }, () => r.u(1));
    p.months = Array.from({ length: 12 }, () => r.u(2));
    p.best = { doy: r.u(2), minutes: r.u(2) };
    p.streak = { length: r.u(2), from: r.u(2) };
    p.longest = { tid: r.tid(), minutes: r.u(2), doy: r.u(2), hour: r.u(1) };
    p.first = { tid: r.tid(), doy: r.u(2), hour: r.u(1) };

    const days = new Date(p.year, 1, 29).getMonth() === 1 ? 366 : 365;
    p.dayLevels = [];
    for (let d = 0; d < days; d += 2) {
      const b = r.u(1);
      p.dayLevels.push(b & 15);
      if (d + 1 < days) p.dayLevels.push(b >> 4);
    }
    return p;
  }

  // build the same shape Stats.compute returns
  async function toStats(p) {
    const ids = new Set(p.top.map(t => t.tid));
    if (p.sessions) { ids.add(p.longest.tid); ids.add(p.first.tid); }
    const info = await TitleDB.info([...ids]);
    const name = tid => info.get(tid).name;
    const code = tid => info.get(tid).code;
    const date = (doy, hour = 12) => new Date(p.year, 0, 1 + doy, hour);

    const games = p.top.map(t => ({
      game: name(t.tid), code: code(t.tid), minutes: t.minutes, sessions: t.sessions, last: date(t.lastDoy),
    }));

    const byDay = new Map();
    let weekend = 0, played = 0;
    p.dayLevels.forEach((lvl, doy) => {
      if (!lvl) return;
      const d = date(doy);
      byDay.set(Stats.dayKey(d), lvl * 15);
      played += lvl;
      if (d.getDay() === 0 || d.getDay() === 6) weekend += lvl;
    });

    // hours come as 0-255 relative values; spread the total over them
    const hourSum = p.hours.reduce((a, b) => a + b, 0) || 1;
    const byHour = p.hours.map(v => (v / hourSum) * p.totalMinutes);

    const forgotten = games.reduce((acc, g) => (!acc || g.last < acc.last ? g : acc), null);

    return {
      year: p.year,
      totalMinutes: p.totalMinutes,
      sessionCount: p.sessions,
      gameCount: p.games,
      daysPlayed: p.daysPlayed,
      games,
      byMonth: p.months,
      byHour,
      byDay,
      bestMonth: p.months.indexOf(Math.max(...p.months)),
      bestDay: p.best.minutes ? { date: date(p.best.doy), minutes: p.best.minutes } : null,
      longestSession: p.sessions ? { game: name(p.longest.tid), code: code(p.longest.tid), minutes: p.longest.minutes, start: date(p.longest.doy, p.longest.hour) } : null,
      firstSession: p.sessions ? { game: name(p.first.tid), code: code(p.first.tid), start: date(p.first.doy, p.first.hour) } : null,
      forgotten,
      streak: { length: p.streak.length, from: date(p.streak.from), to: date(p.streak.from + p.streak.length - 1) },
      personality: Stats.personality(byHour, played ? weekend / played : 0),
    };
  }

  function fromHash(hash) {
    const m = /^#w=([A-Za-z0-9_-]+)/.exec(hash || '');
    return m ? m[1] : null;
  }

  W.QRData = { decode, toStats, fromHash };
})(window);
