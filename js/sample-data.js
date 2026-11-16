// fake play history for the demo button
(function (W) {
  // mulberry32
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // code = product code, used for the cover art
  const GAMES = [
    { name: "The Legend of Zelda: Majora's Mask 3D", code: 'AJRE', weight: 14 },
    { name: 'Pokémon X', code: 'EKJA', weight: 6 },
    { name: 'Mario Kart 7', code: 'AMKE', weight: 8 },
    { name: 'Animal Crossing: New Leaf', code: 'EGDE', weight: 7 },
    { name: 'The Legend of Zelda: A Link Between Worlds', code: 'BZLE', weight: 6 },
    { name: 'Super Smash Bros. for Nintendo 3DS', code: 'AXCE', weight: 5 },
    { name: 'The Legend of Zelda: Ocarina of Time 3D', code: 'AQEE', weight: 4 },
    { name: 'Fire Emblem Awakening', code: 'AFEE', weight: 3 },
    { name: "Luigi's Mansion: Dark Moon", code: 'AGGE', weight: 3 },
    { name: 'Kid Icarus: Uprising', code: 'AKDE', weight: 1 },
  ];

  function pickGame(r, monthBias) {
    const total = GAMES.reduce((s, g, i) => s + g.weight + (i === monthBias ? 12 : 0), 0);
    let x = r() * total;
    for (let i = 0; i < GAMES.length; i++) {
      x -= GAMES[i].weight + (i === monthBias ? 12 : 0);
      if (x <= 0) return GAMES[i];
    }
    return GAMES[0];
  }

  function generate() {
    const r = rng(3);
    const sessions = [];
    for (const year of [2024, 2025, 2026]) {
      const start = new Date(year, 0, 1);
      const end = year === 2026 ? new Date(2026, 10, 15) : new Date(year, 11, 31);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const weekend = d.getDay() === 0 || d.getDay() === 6;
        const summer = d.getMonth() >= 6 && d.getMonth() <= 7;
        const chance = 0.35 + (weekend ? 0.25 : 0) + (summer ? 0.2 : 0);
        if (r() > chance) continue;

        const count = 1 + Math.floor(r() * (weekend ? 3 : 2));
        const bias = (d.getMonth() * 3 + year) % GAMES.length;
        for (let k = 0; k < count; k++) {
          const hour = r() < 0.12 ? Math.floor(r() * 3) : 15 + Math.floor(r() * 9);
          const when = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour % 24, Math.floor(r() * 60));
          const minutes = Math.round(10 + r() * r() * 150);
          const g = pickGame(r, bias);
          sessions.push({ game: g.name, code: g.code, start: when, minutes });
        }
      }
    }
    return sessions;
  }

  W.SampleData = { generate };
})(window);
