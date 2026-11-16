/*
 * Genera datos de ejemplo realistas (y siempre iguales gracias a una semilla)
 * para poder probar la web sin tener una consola a mano.
 * Los nombres de los juegos son inventados.
 */
(function (W) {
  // Generador pseudoaleatorio con semilla (mulberry32)
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const GAMES = [
    { name: 'Dragones de Bolsillo', weight: 10 },
    { name: 'Kart Galáctico', weight: 8 },
    { name: 'Granja Feliz 3D', weight: 7 },
    { name: 'Aventura Pixel', weight: 6 },
    { name: 'Puzle Cúbico', weight: 4 },
    { name: 'Ritmo Estelar', weight: 3 },
    { name: 'Detective Nocturno', weight: 3 },
    { name: 'Isla de Pesca', weight: 2 },
    { name: 'Cazadores de Bestias', weight: 5 },
    { name: 'Laberinto Retro', weight: 1 },
  ];

  function pickGame(r, monthBias) {
    // Cada mes favorece un poco a un juego distinto (como cuando te "enganchas")
    const total = GAMES.reduce((s, g, i) => s + g.weight + (i === monthBias ? 12 : 0), 0);
    let x = r() * total;
    for (let i = 0; i < GAMES.length; i++) {
      x -= GAMES[i].weight + (i === monthBias ? 12 : 0);
      if (x <= 0) return GAMES[i].name;
    }
    return GAMES[0].name;
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
          // Horas típicas: tarde/noche, a veces madrugada
          const hour = r() < 0.12 ? Math.floor(r() * 3) : 15 + Math.floor(r() * 9);
          const when = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour % 24, Math.floor(r() * 60));
          const minutes = Math.round(10 + r() * r() * 150);
          sessions.push({ game: pickGame(r, bias), start: when, minutes });
        }
      }
    }
    return sessions;
  }

  W.SampleData = { generate };
})(window);
