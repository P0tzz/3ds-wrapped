(function (W) {
  const DAY = 24 * 60 * 60 * 1000;

  function dayKey(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function years(sessions) {
    return [...new Set(sessions.map(s => s.start.getFullYear()))].sort((a, b) => b - a);
  }

  function longestStreak(dayKeys) {
    const days = [...dayKeys].sort().map(k => new Date(k + 'T12:00:00').getTime());
    let best = { length: 0, from: null, to: null };
    let runStart = 0;
    for (let i = 0; i < days.length; i++) {
      if (i > 0 && Math.round((days[i] - days[i - 1]) / DAY) !== 1) runStart = i;
      const len = i - runStart + 1;
      if (len > best.length) best = { length: len, from: new Date(days[runStart]), to: new Date(days[i]) };
    }
    return best;
  }

  function personality(byHour, weekendShare) {
    const peak = byHour.indexOf(Math.max(...byHour));
    let p;
    if (peak < 6) p = { emoji: '🦉', name: 'Búho nocturno', desc: 'Tus mejores partidas son de madrugada.' };
    else if (peak < 12) p = { emoji: '🌅', name: 'Madrugador', desc: 'Empiezas el día con la consola en la mano.' };
    else if (peak < 18) p = { emoji: '☕', name: 'Jugador de sobremesa', desc: 'La tarde es tu momento.' };
    else p = { emoji: '🌙', name: 'Gamer de prime time', desc: 'Las noches son para jugar.' };
    if (weekendShare > 0.5) p.desc += ' Y los fines de semana, a tope.';
    return { ...p, peakHour: peak };
  }

  function compute(allSessions, year) {
    const sessions = allSessions
      .filter(s => s.start.getFullYear() === year)
      .sort((a, b) => a.start - b.start);

    const byGame = new Map();
    const byMonth = new Array(12).fill(0);
    const byHour = new Array(24).fill(0);
    const byDay = new Map();
    let total = 0, weekend = 0, longest = null;

    for (const s of sessions) {
      total += s.minutes;
      byMonth[s.start.getMonth()] += s.minutes;
      byHour[s.start.getHours()] += s.minutes;
      const k = dayKey(s.start);
      byDay.set(k, (byDay.get(k) || 0) + s.minutes);
      const wd = s.start.getDay();
      if (wd === 0 || wd === 6) weekend += s.minutes;
      if (!longest || s.minutes > longest.minutes) longest = s;

      const g = byGame.get(s.game) || { game: s.game, code: s.code || null, platform: s.platform || '3ds', minutes: 0, sessions: 0, first: s.start, last: s.start };
      g.minutes += s.minutes;
      g.sessions += 1;
      g.last = s.start;
      byGame.set(s.game, g);
    }

    const games = [...byGame.values()].sort((a, b) => b.minutes - a.minutes);

    // top 10 game with the oldest last session
    const forgotten = games.slice(0, 10).reduce((acc, g) => (!acc || g.last < acc.last ? g : acc), null);
    const bestMonth = byMonth.indexOf(Math.max(...byMonth));

    let bestDay = null;
    for (const [k, m] of byDay) if (!bestDay || m > bestDay.minutes) bestDay = { date: new Date(k + 'T12:00:00'), minutes: m };

    return {
      year,
      sessions,
      totalMinutes: total,
      sessionCount: sessions.length,
      gameCount: games.length,
      daysPlayed: byDay.size,
      games,
      byMonth,
      byHour,
      byDay,
      bestMonth,
      bestDay,
      longestSession: longest && { ...longest, code: longest.code || null },
      firstSession: sessions[0] ? { ...sessions[0], code: sessions[0].code || null } : null,
      forgotten,
      streak: longestStreak(byDay.keys()),
      personality: personality(byHour, total ? weekend / total : 0),
    };
  }

  // one row per year: minutes, days played, distinct games
  function history(all) {
    const by = new Map();
    for (const s of all) {
      const y = s.start.getFullYear();
      const h = by.get(y) || { year: y, minutes: 0, days: new Set(), games: new Set() };
      h.minutes += s.minutes;
      h.days.add(dayKey(s.start));
      h.games.add(s.game);
      by.set(y, h);
    }
    return [...by.values()].sort((a, b) => a.year - b.year)
      .map(h => ({ year: h.year, minutes: h.minutes, days: h.days.size, games: h.games.size }));
  }

  // all-time totals when the console's own summary is not available
  function lifetime(all) {
    if (!all.length) return null;
    const games = new Map();
    let total = 0, since = all[0].start;
    for (const s of all) {
      total += s.minutes;
      if (s.start < since) since = s.start;
      const g = games.get(s.game) || { game: s.game, code: s.code || null, platform: s.platform || '3ds', minutes: 0, launches: 0 };
      g.minutes += s.minutes;
      g.launches++;
      games.set(s.game, g);
    }
    const top = [...games.values()].sort((a, b) => b.minutes - a.minutes)[0];
    return { totalMinutes: total, launches: all.length, titles: games.size, since, top };
  }

  W.Stats = { compute, years, dayKey, personality, history, lifetime };
})(window);
