// Spanish is the source language: t('texto {x}', { x }) returns the English text when the page is in English.
(function (W) {
  const KEY = '3dsw-lang';
  let lang = 'es';
  try { lang = localStorage.getItem(KEY) || ''; } catch { /* private mode */ }
  if (lang !== 'es' && lang !== 'en') lang = (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';

  const EN = {
    // page
    'Tu año en la consola': 'Your year on the console',
    '¿A qué has jugado este año?': 'What did you play this year?',
    'Escanea el QR de la': 'Scan the QR from the',
    'app para 3DS': '3DS app',
    'o sube el': 'or upload the',
    'del Registro de actividad.': 'from the Activity Log.',
    'Arrastra tu archivo aquí': 'Drop your file here',
    'o haz clic para elegirlo · pld.dat, .json, .csv': 'or click to choose it · pld.dat, .json, .csv',
    'Ver un ejemplo': 'See an example',
    'Todo se procesa en tu navegador.': 'Everything runs in your browser.',
    'Cómo funciona': 'How it works',
    'Abre la app en tu 3DS': 'Open the app on your 3DS',
    'Cópiala a la tarjeta SD y ábrela desde el Homebrew Launcher. Solo lee el Registro de actividad, no cambia nada.':
      'Copy it to the SD card and open it from the Homebrew Launcher. It only reads the Activity Log and changes nothing.',
    'Escanea el QR': 'Scan the QR',
    'La consola calcula tu resumen y lo muestra como código QR. Elige el año con ◀ ▶.':
      'The console works out your summary and shows it as a QR code. Pick the year with ◀ ▶.',
    'Mira tu año': 'See your year',
    'Se abre esta web con tus juegos, horas y rachas. Los datos van en el enlace: no se guardan en ningún servidor.':
      'This site opens with your games, hours and streaks. The data travels in the link: nothing is stored on a server.',
    'Descargar la app': 'Download the app',
    'Cómo instalarla': 'How to install it',
    'Cargando tu año…': 'Loading your year…',
    'Año': 'Year',
    'Cargar otro': 'Load another',
    'Tu biblioteca': 'Your library',
    'Tu ritmo': 'Your rhythm',
    'Destacados': 'Highlights',
    'Compártelo': 'Share it',
    'Publicación': 'Post',
    'Historia': 'Story',
    'Compartir': 'Share',
    'Descargar imagen': 'Download image',
    'Menos': 'Less',
    'Más': 'More',
    'Código': 'Code',
    'Subir datos desde el PC': 'Upload data from a PC',
    'Proyecto de fans, no afiliado a Nintendo. Portadas de': 'Fan project, not affiliated with Nintendo. Box art from',
    '¿Qué juego de DS es?': 'Which DS game is it?',
    'Cerrar': 'Close',
    'Los juegos abiertos desde TWiLight Menu++ o un flashcart se guardan sin código, así que la consola no sabe cuál era. Elige el tuyo; se recuerda solo en este navegador.':
      'Games opened from TWiLight Menu++ or a flashcart are logged without a game code, so the console does not know which one it was. Pick yours; it is only remembered in this browser.',
    'Busca tu juego…': 'Search for your game…',
    'Saltar': 'Skip',
    'Toca para ver tu año': 'Tap to see your year',
    'Año contra año': 'Year vs year',
    'Medallas': 'Medals',
    'Toda tu 3DS': 'Your whole 3DS',

    // status and errors
    'Leyendo archivo…': 'Reading file…',
    'Buscando los nombres de los juegos…': 'Looking up game names…',
    'No se pudo cargar html2canvas (¿sin conexión?).': 'Could not load html2canvas (offline?).',

    // summary
    'Tu juego de {y}': 'Your game of {y}',
    'jugadas': 'played',
    'partidas': 'sessions',
    'de tu tiempo': 'of your time',
    '▶ Ver la intro otra vez': '▶ Watch the intro again',
    'en total': 'in total',
    'juegos': 'games',
    'días jugando': 'days played',
    '{n} partidas': '{n} sessions',
    'Cambiar juego': 'Change game',
    '¿Qué juego es?': 'Which game is it?',
    'Quitar': 'Remove',
    'Cargando lista de juegos…': 'Loading the game list…',
    'Escribe al menos 2 letras (por ejemplo «pokemon negro»).': 'Type at least 2 letters (for example "pokemon black").',
    'No hay resultados.': 'No results.',
    '{g} (vía TWiLight)': '{g} (via TWiLight)',
    'Juegos de DS (TWiLight / flashcart)': 'DS games (TWiLight / flashcart)',
    'vs {y}': 'vs {y}',

    // rhythm
    'Tu mes': 'Your month',
    '{m} fue tu mes': '{m} was your month',
    '{h} h · {r}× tu media mensual': '{h} h · {r}× your monthly average',
    '{h} h · un año muy regular': '{h} h · a very steady year',
    'tu media': 'your average',
    'Tu día': 'Your day',
    'Los {d} son tu día': '{d} are your day',
    '{p} % de tus horas · {w} % en fin de semana': '{p} % of your hours · {w} % at the weekend',
    'Tu hora': 'Your hour',
    'Eres de {p}': 'You are {p}',
    '{p} % de tus horas · pico a las {h}:00': '{p} % of your hours · peak at {h}:00',
    'Día a día': 'Day by day',
    '{n} días jugando': '{n} days played',
    '{p} % de los días de este año': '{p} % of the days this year',
    '{p} % de los días de {y}': '{p} % of the days in {y}',
    'Racha': 'Streak',
    'Mejor día': 'Best day',
    '{n} días': '{n} days',

    // compare
    'Jugaste un {p} % más que en {y}': 'You played {p} % more than in {y}',
    'Jugaste un {p} % menos que en {y}': 'You played {p} % less than in {y}',
    'Casi lo mismo que en {y}': 'Almost the same as in {y}',
    '{y} fue tu primer año registrado': '{y} was your first logged year',
    '{a} h frente a {b} h · {c} días frente a {d}': '{a} h vs {b} h · {c} days vs {d}',
    '{h} h en {y}': '{h} h in {y}',

    // lifetime
    'horas': 'hours',
    'jugadas desde {d}': 'played since {d}',
    'jugadas desde que tienes la consola': 'played since you got the console',
    'títulos': 'titles',
    'veces que abriste algo': 'times you opened something',
    'pasos con la consola': 'steps with the console',
    'Tu juego de siempre': 'Your all-time favourite',
    'abierto {n} veces': 'opened {n} times',
    'Pasos': 'Steps',
    '{n} pasos': '{n} steps',
    '≈ {k} km caminados con la consola': '≈ {k} km walked with the console',
    '{n} este año': '{n} this year',

    // highlights
    'Partida más larga': 'Longest session',
    'el {d}': 'on {d}',
    'Primer juego del año': 'First game of the year',
    'así empezó tu año': 'how your year started',
    'El olvidado': 'The forgotten one',
    '{n} días sin abrirlo': '{n} days without opening it',
    'la última vez fue el {d}': 'last opened on {d}',
    'Tu perfil': 'Your profile',
    'Racha más larga': 'Longest streak',
    '{n} días seguidos': '{n} days in a row',
    'del {a} al {b}': 'from {a} to {b}',
    'Día con más juego': 'Biggest day',
    'Partida media': 'Average session',
    'en {n} partidas': 'across {n} sessions',

    // medals
    'Has ganado {n} de {t}': 'You earned {n} of {t}',
    'Noctámbulo': 'Night owl',
    'Más del 15 % de tus horas, de madrugada': 'Over 15 % of your hours after midnight',
    'Madrugador': 'Early bird',
    'Más del 10 % de tus horas entre las 6 y las 10': 'Over 10 % of your hours between 6 and 10 am',
    'Maratón': 'Marathon',
    'Una partida de 4 horas o más': 'A session of 4 hours or more',
    'Fiel': 'Loyal',
    'Un solo juego ocupa la mitad de tu año': 'One game takes up half of your year',
    'Coleccionista': 'Collector',
    '20 juegos o más en el año': '20 or more games in the year',
    'Constante': 'Steady',
    'Una racha de 14 días o más': 'A streak of 14 days or more',
    'Todo el año': 'All year round',
    'Jugaste los 12 meses': 'You played every month',
    'Finde': 'Weekender',
    'La mitad de tus horas, en fin de semana': 'Half of your hours at the weekend',
    'Caminante': 'Walker',
    '500.000 pasos en el año': '500,000 steps in the year',
    'Veterano': 'Veteran',
    '1.000 horas desde siempre': '1,000 hours all time',

    // share card
    'jugando a {g} juegos en {d} días': 'playing {g} games over {d} days',
    'Tu juego del año': 'Your game of the year',
    '{h} h · {p} % de tu tiempo': '{h} h · {p} % of your time',
    'Tu año': 'Your year',
    'racha de {n} días': '{n}-day streak',
    '{n} medallas': '{n} medals',
    'Mi año {y} en la 3DS': 'My {y} on the 3DS',

    // personality (stats.js)
    'Búho nocturno': 'Night owl',
    'Tus mejores partidas son de madrugada.': 'Your best sessions happen after midnight.',
    'Empiezas el día con la consola en la mano.': 'You start the day with the console in your hands.',
    'Jugador de sobremesa': 'Afternoon player',
    'La tarde es tu momento.': 'Afternoons are your time.',
    'Gamer de prime time': 'Prime-time gamer',
    'Las noches son para jugar.': 'Evenings are for playing.',
    ' Y los fines de semana, a tope.': ' And weekends, all in.',

    // intro
    'Tu juego de {y} ': 'Your game of {y} ',
    'La leyenda de tu {y}': 'The legend of your {y}',
    '{n} horas': '{n} hours',
    '{p} % de tu tiempo este año': '{p} % of your time this year',
    'amaneceres jugando': 'dawns of play',
    'amaneceres jugando en {y}': 'dawns of play in {y}',
    'Primer día': 'First day',
    'Segundo día': 'Second day',
    'Último día': 'Final day',
    'Todo tiene un final…': 'Everything comes to an end…',
    'Se apagan las luces…': 'The lights go out…',
    'No estabas solo ahí dentro.': 'You were not alone in there.',
    'Motores encendidos.': 'Engines on.',
    'Una vuelta más. Siempre una más.': 'One more lap. Always one more.',
    'Cada movimiento contaba…': 'Every move counted…',
    'y este juego se llevó todos los tuyos.': 'and this game got all of yours.',
    'Arriba, entre las nubes…': 'Up above the clouds…',
    'pasaste muchas horas volando.': 'you spent many hours flying.',
    'Un combate más…': 'One more fight…',
    'y luego otro, y otro, y otro.': 'and then another, and another.',
    'Algo se mueve entre la hierba…': 'Something moves in the grass…',
    '¡Un encuentro que duró todo el año!': 'An encounter that lasted all year!',
    'Son las {h}…': 'It is {h}…',
    'y siempre acababas volviendo a tu rincón.': 'and you always came back to your little corner.',
    'Salto…': 'Jump…',
    'tras salto, tras salto.': 'after jump, after jump.',
    'Hace mucho tiempo, en tu consola…': 'Long ago, on your console…',
    'Toda gran aventura empieza de noche…': 'Every great adventure starts at night…',
    'y la tuya duró hasta el amanecer.': 'and yours lasted until dawn.',
    'Este año jugaste mucho…': 'You played a lot this year…',
    'pero hubo un juego que destacó.': 'but one game stood out.',

    // error messages
    'El código QR está incompleto.': 'The QR code is incomplete.',
    'El código QR no es válido.': 'The QR code is not valid.',
    'Versión de datos no soportada. Actualiza la web o la app de la 3DS.': 'Unsupported data version. Update the site or the 3DS app.',
    'Formato no reconocido. Usa pld.dat, .json o .csv.': 'Unrecognised format. Use pld.dat, .json or .csv.',
    'El archivo no contiene ninguna sesión de juego.': 'The file does not contain any play session.',
  };

  const MONTHS = {
    es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  };
  const MONTHS_SHORT = {
    es: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  };
  const MONTH_LETTERS = { es: 'EFMAMJJASOND'.split(''), en: 'JFMAMJJASOND'.split('') };
  const WEEKDAYS = { es: ['L', 'M', 'X', 'J', 'V', 'S', 'D'], en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] };
  const WEEKDAYS_PLURAL = {
    es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'],
    en: ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'],
  };
  const PERIODS = { es: ['madrugada', 'mañana', 'tarde', 'noche'], en: ['night', 'morning', 'afternoon', 'evening'] };
  // for the headline "Eres de {p}" / "You are {p}"
  const PERIOD_PEOPLE = { es: PERIODS.es, en: ['a night owl', 'a morning person', 'an afternoon player', 'an evening player'] };

  function t(text, vars) {
    let s = lang === 'en' && EN[text] !== undefined ? EN[text] : text;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  }

  const locale = () => (lang === 'en' ? 'en-US' : 'es-ES');

  // static text in the HTML: <x data-i18n>texto</x>, <input data-i18n-placeholder="texto">
  function applyStatic(root = document) {
    document.documentElement.lang = lang;
    if (lang === 'es') return;
    root.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = t(n.textContent.trim()); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(n => { n.placeholder = t(n.getAttribute('data-i18n-placeholder')); });
  }

  function setLang(l) {
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
    location.reload();
  }

  W.I18N = {
    t, locale, applyStatic, setLang,
    get lang() { return lang; },
    months: () => MONTHS[lang],
    monthsShort: () => MONTHS_SHORT[lang],
    monthLetters: () => MONTH_LETTERS[lang],
    weekdays: () => WEEKDAYS[lang],
    weekdaysPlural: () => WEEKDAYS_PLURAL[lang],
    periods: () => PERIODS[lang],
    periodPeople: () => PERIOD_PEOPLE[lang],
  };
  W.t = t;
})(window);
