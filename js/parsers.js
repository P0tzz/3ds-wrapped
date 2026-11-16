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

  // TODO: https://www.3dbrew.org/wiki/Activity_Log
  function parsePld() {
    throw new Error('pld.dat todavía no está soportado, usa JSON o CSV.');
  }

  async function parseFile(file) {
    const name = file.name.toLowerCase();
    let sessions;
    if (name.endsWith('.json')) sessions = parseJSON(await file.text());
    else if (name.endsWith('.csv')) sessions = parseCSV(await file.text());
    else if (name.endsWith('.dat')) sessions = parsePld(await file.arrayBuffer());
    else throw new Error('Formato no reconocido. Usa un archivo .json o .csv.');

    if (!sessions.length) throw new Error('El archivo no contiene ninguna sesión de juego.');
    return sessions;
  }

  W.Parsers = { parseFile, parseJSON, parseCSV, parsePld };
})(window);
