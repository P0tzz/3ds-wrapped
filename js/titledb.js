// title id -> { name, code }, using the eShop lists from hax0kartik/3dsdb (fetched at runtime)
(function (W) {
  const BASE = 'https://raw.githubusercontent.com/hax0kartik/3dsdb/master/jsons/';
  const REGIONS = ['US', 'GB', 'JP'];

  let cache = null;

  function clean(name) {
    return name
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/\s+Update Ver\.?.*$/i, '')
      .replace(/[™®]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // "CTR-P-AMKE" -> "AMKE"
  function productCode(pc) {
    const m = /-([A-Z0-9]{4})$/.exec(pc || '');
    return m ? m[1] : null;
  }

  // keyed by the unique part of the id (low 32 bits), so base games and
  // their updates (0004000E...) map to the same entry
  async function load() {
    if (cache) return cache;
    const map = new Map();
    const lists = await Promise.allSettled(
      REGIONS.map(r => fetch(BASE + `list_${r}.json`).then(res => (res.ok ? res.json() : [])))
    );
    for (const l of lists) {
      if (l.status !== 'fulfilled' || !Array.isArray(l.value)) continue;
      for (const t of l.value) {
        if (!t.TitleID || !t.Name) continue;
        const id = t.TitleID.toUpperCase();
        const key = id.slice(8);
        const isBase = id.startsWith('00040000');
        const code = productCode(t['Product Code']);
        const prev = map.get(key);
        if (!prev || (isBase && !prev.isBase)) map.set(key, { name: clean(t.Name), code: code || (prev && prev.code), isBase });
        else if (!prev.code && code) prev.code = code;
      }
    }
    cache = map;
    return map;
  }

  // DS code -> name (data/ds-titles.json, from GameTDB), only loaded when there are DS titles
  let dsNames = null;
  async function loadDS() {
    if (dsNames) return dsNames;
    try {
      const res = await fetch('data/ds-titles.json');
      dsNames = res.ok ? await res.json() : {};
    } catch {
      dsNames = {};
    }
    return dsNames;
  }

  async function info(titleIds) {
    let map;
    try { map = await load(); } catch { map = new Map(); }
    const ds = titleIds.some(isDS) ? await loadDS() : {};
    const out = new Map();
    for (const id of titleIds) {
      if (isDS(id)) { out.set(id, dsInfo(id, ds)); continue; }
      const hit = map.get(id.slice(8));
      out.set(id, hit
        ? { name: hit.name, code: hit.code || null, platform: '3ds', found: true }
        : { name: fallback(id), code: null, platform: '3ds', found: false });
    }
    return out;
  }

  // DS / DSi titles: 00048004 + the 4-letter game code in ASCII ("AMCE" = Mario Kart DS)
  const isDS = id => id.startsWith('00048004');

  function dsInfo(id, names) {
    const hex = id.slice(8);
    let code = '';
    for (let i = 0; i < 8; i += 2) code += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    const valid = /^[A-Z0-9]{4}$/.test(code);
    // games launched from TWiLight Menu++ or a flashcart are logged without a game code
    if (!valid) return { name: 'Juegos de DS (TWiLight / flashcart)', code: null, platform: 'ds', found: true };
    const known = names[code];
    return {
      name: known ? cleanDS(known) : `Juego de DS (${code})`,
      code,
      platform: 'ds',
      found: !!known,
    };
  }

  // "Pokémon HeartGold Version" -> "Pokémon HeartGold"
  const cleanDS = n => n.replace(/\s+Version$/i, '').trim();

  function fallback(id) {
    if (id.startsWith('00040010') || id.startsWith('00040030')) return `App del sistema (${id.slice(8)})`;
    return `Título ${id}`;
  }

  W.TitleDB = { info };
})(window);
