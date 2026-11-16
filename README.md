# 3ds-wrapped

Resumen anual de tu historial de juego en 3DS, estilo "Wrapped".

**Demo:** https://p0tzz.github.io/3ds-wrapped/

![screenshot](docs/screenshot.png)

## QuÃ© muestra

- Horas totales, juegos, dÃ­as jugados y partidas
- Top 10 de juegos
- Horas por mes y por hora del dÃ­a
- Mapa de calor del aÃ±o
- Racha mÃ¡s larga, partida mÃ¡s larga, etc.
- Tarjeta exportable a PNG

Todo se procesa en local, no se sube nada a ningÃºn servidor.

## Uso

**Desde la consola (lo mÃ¡s fÃ¡cil):** instala la [app para 3DS](homebrew/), Ã¡brela y escanea el QR con el mÃ³vil.

**Desde el PC:** abre la web y carga el `pld.dat` de tu consola (o un `.json` / `.csv`).
CÃ³mo sacar el `pld.dat` y el formato de los demÃ¡s archivos: [docs/FORMATO.md](docs/FORMATO.md).

Para desarrollo cualquier servidor estÃ¡tico vale:

```
python -m http.server
```

## TODO

- [x] Leer `pld.dat` (Activity Log) directamente
- [x] App para 3DS con QR
- [ ] Probar en consola real y con mÃ¡s `pld.dat` reales
- [ ] Comparar aÃ±os
- [ ] Tema claro
- [ ] TraducciÃ³n al inglÃ©s

PRs bienvenidos.

## CrÃ©ditos

- [HarshNarayanJha/3DS-ActivityLog](https://github.com/HarshNarayanJha/3DS-ActivityLog) por documentar el formato de `pld.dat`
- [hax0kartik/3dsdb](https://github.com/hax0kartik/3dsdb) para los nombres de los juegos
- [3dbrew](https://www.3dbrew.org/)
- [Chart.js](https://www.chartjs.org/)
- [html2canvas](https://html2canvas.hertzen.com/)

## Licencia

MIT. Proyecto no afiliado a Nintendo.
