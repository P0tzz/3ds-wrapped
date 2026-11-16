// file -> [{ game, start: Date, minutes }]
(function (W) {
  function pick(obj, keys) {
    for (const k of keys) if (obj[k] !== undefined && obj[k] !== '') return obj[k];
    return undefined;
  }

  function toSession(raw, index) {
    const game = pick(raw, ['game', 'juego', 'title', 'titulo', 'título']);
    const startRaw = pick(raw, ['start', 'inicio', 'date', 'fecha']);
    const minutesRaw = pick(raw, ['minutes', 'minutos', 'duration', 'duracion', 'duración']);

    const where = `fila ${index + 1}`;
    if (!game) throw new Error(`Falta el nombre del juego (${where}).`);
    // date-only strings parse as UTC midnight, use local noon instead
    const startText = String(startRaw).trim();
    const start = new Date(/^\d{4}-\d{2}-\d{2}$/.test(startText) ? startText + 'T12:00:00' : startText);
    if (isNaN(start)) throw new Error(`Fecha no válida "${startRaw}" (${where}).`);
    const minutes = Number(String(minutesRaw).replace(',', '.'));
    if (!isFinite(minutes) || minutes < 0) throw new Error(`Minutos no válidos "${minutesRaw}" (${where}).`);

    return { game: String(game).trim(), start, minutes };
  }

  function parseJSON(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('El archivo JSON no es válido: ' + e.message); }
    const list = Array.isArray(data) ? data : data.sesiones || data.sessions;
    if (!Array.isArray(list)) throw new Error('El JSON debe ser una lista o tener una propiedad "sesiones".');
    return list.map(toSession);
  }

  function splitCSVLine(line, sep) {
    const out = [];
    let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') quoted = false;
        else cur += c;
      } else if (c === '"') quoted = true;
      else if (c === sep) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  }

  function parseCSV(text) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) throw new Error('El CSV necesita una cabecera y al menos una fila.');
    const sep = lines[0].includes(';') ? ';' : ',';
    const header = splitCSVLine(lines[0], sep).map(h => h.toLowerCase());
    return lines.slice(1).map((line, i) => {
      const cells = splitCSVLine(line, sep);
      const obj = {};
      header.forEach((h, j) => { obj[h] = cells[j]; });
      return toSession(obj, i);
    });
  }

  // pld.dat (Activity Log system save)
  // layout: 0x10 header | 50000 x 16B hourly log | 256 x 24B per-title summary
  // https://github.com/HarshNarayanJha/3DS-ActivityLog/blob/main/docs/data-extraction/pld-structure.md
  const PLD_SIZE = 806160;
  const LOG_OFFSET = 0x10;
  const LOG_ENTRIES = 50000;
  const HOUR = 3600;

  function hex64(view, off) {
    const hi = view.getUint32(off + 4, true).toString(16).padStart(8, '0');
    const lo = view.getUint32(off, true).toString(16).padStart(8, '0');
    return (hi + lo).toUpperCase();
  }

  // timestamps count seconds since 2000-01-01 on the console's local clock
  const fromEpoch2000 = secs => new Date(2000, 0, 1, 0, 0, secs);

  function parsePld(buffer) {
    if (buffer.byteLength !== PLD_SIZE) {
      throw new Error(`Esto no parece un pld.dat (tamaño ${buffer.byteLength}, se esperaba ${PLD_SIZE}).`);
    }
    const view = new DataView(buffer);

    const chunks = [];
    for (let i = 0; i < LOG_ENTRIES; i++) {
      const off = LOG_OFFSET + i * 16;
      const titleId = hex64(view, off);
      if (titleId === '0000000000000000' || titleId === 'FFFFFFFFFFFFFFFF') continue;
      const ts = view.getUint32(off + 8, true);
      const secs = view.getUint32(off + 12, true);
      if (!secs || secs > HOUR) continue;
      chunks.push({ titleId, ts, secs });
    }
    // it's a ring buffer, so entries aren't in order
    chunks.sort((a, b) => a.ts - b.ts);

    // the log is bucketed per hour; glue consecutive hours of the same title into one session
    const sessions = [];
    const open = new Map();
    for (const c of chunks) {
      const s = open.get(c.titleId);
      if (s && c.ts === s.lastTs + HOUR) {
        s.secs += c.secs;
        s.lastTs = c.ts;
        if (!s.merged) { s.startTs = s.startTs + HOUR - s.firstSecs; s.merged = true; }
        continue;
      }
      const ns = { titleId: c.titleId, startTs: c.ts, lastTs: c.ts, secs: c.secs, firstSecs: c.secs, merged: false };
      open.set(c.titleId, ns);
      sessions.push(ns);
    }

    const out = sessions.map(s => ({
      game: s.titleId,
      titleId: s.titleId,
      start: fromEpoch2000(s.startTs),
      minutes: s.secs / 60,
    }));

    // software library summary: lifetime totals per title
    const LIB_OFFSET = 0xC3510;
    out.library = [];
    for (let i = 0; i < 256; i++) {
      const off = LIB_OFFSET + i * 24;
      const titleId = hex64(view, off);
      if (titleId === '0000000000000000' || titleId === 'FFFFFFFFFFFFFFFF') continue;
      const secs = view.getUint32(off + 8, true), launches = view.getUint16(off + 12, true);
      if (!secs && !launches) continue;
      out.library.push({ titleId, minutes: secs / 60, launches, firstDay: view.getUint16(off + 16, true) });
    }
    return out;
  }

  async function nameTitles(sessions) {
    const lib = sessions.library || [];
    const top = lib.reduce((a, b) => (!a || b.minutes > a.minutes ? b : a), null);
    const ids = [...new Set(sessions.map(s => s.titleId).concat(top ? [top.titleId] : []))];
    const info = await TitleDB.info(ids);
    for (const s of sessions) {
      const t = info.get(s.titleId);
      s.game = t.name;
      s.code = t.code;
      s.platform = t.platform;
    }
    if (top) {
      const t = info.get(top.titleId);
      const firsts = lib.map(l => l.firstDay).filter(Boolean);
      sessions.lifetime = {
        totalMinutes: lib.reduce((a, l) => a + l.minutes, 0),
        launches: lib.reduce((a, l) => a + l.launches, 0),
        titles: lib.length,
        since: firsts.length ? new Date(2000, 0, 1 + Math.min(...firsts)) : null,
        top: { game: t.name, code: t.code, platform: t.platform, minutes: top.minutes, launches: top.launches },
      };
    }
    return sessions;
  }

  async function parseFile(file, onStatus = () => {}) {
    const name = file.name.toLowerCase();
    let sessions;
    if (name.endsWith('.json')) sessions = parseJSON(await file.text());
    else if (name.endsWith('.csv')) sessions = parseCSV(await file.text());
    else if (name.endsWith('.dat')) {
      sessions = parsePld(await file.arrayBuffer());
      onStatus('Buscando los nombres de los juegos…');
      await nameTitles(sessions);
    }
    else throw new Error('Formato no reconocido. Usa pld.dat, .json o .csv.');

    if (!sessions.length) throw new Error('El archivo no contiene ninguna sesión de juego.');
    return sessions;
  }

  W.Parsers = { parseFile, parseJSON, parseCSV, parsePld };
})(window);
