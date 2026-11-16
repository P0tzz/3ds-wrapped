// title id -> name, using the eShop lists from hax0kartik/3dsdb (fetched at runtime)
(function (W) {
  const BASE = 'https://raw.githubusercontent.com/hax0kartik/3dsdb/master/jsons/';
  const REGIONS = ['US', 'GB', 'JP'];

  let cache = null;

  function clean(name) {
    return name
      .replace(/\s+Update Ver\.?.*$/i, '')
      .replace(/[™®]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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
        const prev = map.get(key);
        if (!prev || (isBase && !prev.isBase)) map.set(key, { name: clean(t.Name), isBase });
      }
    }
    cache = map;
    return map;
  }

  async function names(titleIds) {
    let map;
    try { map = await load(); } catch { map = new Map(); }
    const out = new Map();
    for (const id of titleIds) {
      const hit = map.get(id.slice(8));
      out.set(id, hit ? hit.name : fallback(id));
    }
    return out;
  }

  function fallback(id) {
    if (id.startsWith('00040010') || id.startsWith('00040030')) return `App del sistema (${id.slice(8)})`;
    return `Título ${id}`;
  }

  W.TitleDB = { names };
})(window);
