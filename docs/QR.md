# Formato del enlace (`#w=`)

La app de la 3DS calcula el resumen de un año y lo mete en el enlace del QR:

```
https://p0tzz.github.io/3ds-wrapped/#w=<datos en base64url>
```

Los datos van en el fragmento (`#`), así que nunca llegan a ningún servidor.
Todos los enteros son little-endian. `tid` = `u16` (bits 32-47 del title id) + `u32` (bits 0-31).
Los días (`doy`) cuentan desde el 1 de enero del año (0 = 1 de enero).

| tipo            | campo                                                    |
|-----------------|----------------------------------------------------------|
| `u8`            | versión (2; la 1 no lleva los campos `nombre`)           |
| `u16`           | año                                                      |
| `u32`           | minutos totales                                          |
| `u16`           | partidas                                                 |
| `u16`           | juegos distintos                                         |
| `u16`           | días jugados                                             |
| `u8`            | `n` juegos en el top (máx. 8)                            |
| `n` ×           | `tid`, `u24` minutos, `u16` partidas, `u16` doy última vez, `nombre` |
| 24 × `u8`       | reparto por hora del día (0-255, relativo al máximo)     |
| 12 × `u16`      | minutos por mes                                          |
| `u16` `u16`     | mejor día: doy, minutos                                  |
| `u16` `u16`     | racha: días, doy de inicio                               |
| `tid` `u16` `u16` `u8` `nombre` | partida más larga: juego, minutos, doy, hora |
| `tid` `u16` `u8` `nombre` | primera partida: juego, doy, hora              |
| ⌈días/2⌉ × `u8` | un nibble por día (bajo = día par): ⌈minutos/15⌉, máx. 15 |

`nombre` = `u8` longitud + UTF-8 (máx. 24 bytes). Solo se rellena para títulos que la web
probablemente no encuentre en las listas de la eShop: DS/DSiWare, demos, apps del sistema y
homebrew (high ≠ `0x00040000` o unique id ≥ `0xF0000`). En el resto va vacío (longitud 0).
Los nombres salen de la caché de iconos del Registro de actividad (extdata compartido
`0xF000000B`, `idbt.dat` + `idb.dat`). Si con nombres el QR queda demasiado denso para
leerse en la pantalla, la app lo genera sin ellos.

Unos 380-550 bytes, ~510-750 caracteres de enlace.
