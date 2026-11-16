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
| `u8`            | versión (1)                                              |
| `u16`           | año                                                      |
| `u32`           | minutos totales                                          |
| `u16`           | partidas                                                 |
| `u16`           | juegos distintos                                         |
| `u16`           | días jugados                                             |
| `u8`            | `n` juegos en el top (máx. 8)                            |
| `n` ×           | `tid`, `u24` minutos, `u16` partidas, `u16` doy última vez |
| 24 × `u8`       | reparto por hora del día (0-255, relativo al máximo)     |
| 12 × `u16`      | minutos por mes                                          |
| `u16` `u16`     | mejor día: doy, minutos                                  |
| `u16` `u16`     | racha: días, doy de inicio                               |
| `tid` `u16` `u16` `u8` | partida más larga: juego, minutos, doy, hora      |
| `tid` `u16` `u8` | primera partida: juego, doy, hora                       |
| ⌈días/2⌉ × `u8` | un nibble por día (bajo = día par): ⌈minutos/15⌉, máx. 15 |

Unos 380 bytes, ~510 caracteres de enlace.
