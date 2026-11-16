# 🎮 3DS Wrapped

**Tu año en la 3DS, resumido.** Un "Wrapped" al estilo Spotify para tu consola de doble pantalla:
sube tu historial de juego y descubre tus juegos favoritos, tus rachas, a qué hora juegas más
y consigue una tarjeta lista para compartir.

> 🔒 Todo se procesa en tu navegador. Tus datos nunca salen de tu ordenador.

**[▶️ Pruébalo aquí](https://p0tzz.github.io/3ds-wrapped/)**

<!-- Añade aquí una captura o un GIF: ![captura](docs/captura.png) -->

## ✨ Funciones

- 📊 Horas totales, juegos distintos, días jugados y partidas
- 👑 Top 10 de tus juegos más jugados
- 🗓️ Horas por mes y por hora del día
- 🟥 Mapa de calor de todo el año, día a día
- 🔥 Momentos destacados: racha más larga, partida más larga, juego olvidado…
- 🦉 Tu "personalidad gamer" (¿búho nocturno o madrugador?)
- 📸 Tarjeta descargable como imagen para compartir en redes
- 📁 Importa JSON o CSV (lectura de `pld.dat` en desarrollo)

## 🚀 Uso

1. Abre la web (o `index.html` en tu navegador).
2. Pulsa **«Probar con datos de ejemplo»** o arrastra tu archivo.
3. Elige el año y ¡disfruta!

El formato de los archivos está explicado en [docs/FORMATO.md](docs/FORMATO.md),
y hay ejemplos en la carpeta [`ejemplos/`](ejemplos).

## 🛠️ Tecnologías

- HTML, CSS y JavaScript sin frameworks ni compilación
- [Chart.js](https://www.chartjs.org/) para las gráficas
- [html2canvas](https://html2canvas.hertzen.com/) para exportar la tarjeta

## 📂 Estructura

```
3ds-wrapped/
├── index.html          Página principal
├── css/styles.css      Estilos
├── js/
│   ├── app.js          Interfaz (gráficas, mapa de calor, tarjeta)
│   ├── stats.js        Cálculo de estadísticas
│   ├── parsers.js      Lectura de JSON / CSV / pld.dat
│   └── sample-data.js  Generador de datos de ejemplo
├── docs/FORMATO.md     Formato de los datos
└── ejemplos/           Archivos de ejemplo
```

## 🗺️ Hoja de ruta

- [x] Importar JSON y CSV
- [x] Gráficas, mapa de calor y destacados
- [x] Tarjeta para compartir
- [ ] Leer `pld.dat` directamente ([formato en 3dbrew](https://www.3dbrew.org/wiki/Activity_Log))
- [ ] Comparar dos años
- [ ] Modo claro
- [ ] Traducción al inglés

## 🤝 Cómo contribuir

¡Las contribuciones son bienvenidas! La más buscada ahora mismo es implementar
`parsePld()` en [`js/parsers.js`](js/parsers.js).

1. Haz un fork del repositorio
2. Crea una rama: `git checkout -b mi-mejora`
3. Haz commit de tus cambios: `git commit -m "Añade mi mejora"`
4. Sube la rama y abre un Pull Request

## 📄 Licencia

[MIT](LICENSE)

---

*Proyecto de fans sin relación con Nintendo. «Nintendo 3DS» es una marca registrada de Nintendo.*
