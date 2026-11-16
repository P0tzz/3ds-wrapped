<p align="center">
  <img src="icon.png" width="64" height="64" alt="">
</p>

<h1 align="center">3DS Wrapped · app para 3DS</h1>

<p align="center">
  Lee el Registro de actividad y muestra tu resumen del año como código QR.
</p>

<!-- APP_SCREENSHOT -->

## Requisitos

- Una 3DS, 2DS o New 3DS con **CFW (Luma3DS)**.
- El **Homebrew Launcher**. Si seguiste [3ds.hacks.guide](https://3ds.hacks.guide/) ya lo tienes.

## Instalación

1. Descarga **`3ds-wrapped.3dsx`** de la [última versión](https://github.com/P0tzz/3ds-wrapped/releases/latest).
2. Copia el archivo a la carpeta **`3ds`** de la tarjeta SD (`sd:/3ds/3ds-wrapped.3dsx`).
3. Abre el Homebrew Launcher y elige **3DS Wrapped**.

Para actualizar, sustituye el `.3dsx` por el nuevo.

## Uso

1. Abre una vez la app **Registro de actividad** de la consola: el registro solo se actualiza al entrar en ella.
2. Abre **3DS Wrapped**.
3. Elige el año con **◀ ▶** (o **L / R**).
4. Escanea el QR de la pantalla de arriba con la cámara del móvil.

| Pantalla | Qué muestra |
|---|---|
| Arriba | El código QR con el enlace a tu Wrapped |
| Abajo | Horas, juegos, días, partidas, racha y tu top 3 |

| Botón | Acción |
|---|---|
| ◀ ▶ / L R | Cambiar de año |
| START | Salir |

## Archivos que crea

Todos en `sd:/3ds/3ds-wrapped/`:

| Archivo | Para qué |
|---|---|
| `enlace.txt` | El enlace del QR, por si el móvil no consigue leerlo |
| `diagnostico.txt` | Los títulos del registro y si se encontró su nombre. Adjúntalo si abres un issue |

La app **solo lee** el guardado del sistema. No escribe nada en él.

## Problemas frecuentes

**«No se pudo leer el Registro de actividad».**
Abre el Registro de actividad una vez y vuelve a intentarlo. También puedes copiar tu `pld.dat` a `sd:/3ds/3ds-wrapped/pld.dat` y la app lo usará.

**El móvil no lee el QR.**
Sube el brillo, acerca el móvil y evita reflejos. Si hay muchos nombres en el QR, la app lo simplifica sola para que sea más fácil de leer.

**Un juego sale con un código en vez del nombre.**
Abre un [issue](https://github.com/P0tzz/3ds-wrapped/issues/new/choose) con tu `diagnostico.txt`.

**Los juegos de DS de TWiLight Menu++ salen juntos.**
La consola los guarda sin código de juego. En la web puedes decir qué juego era con «¿Qué juego es?».

## Compilar

Con [devkitPro](https://devkitpro.org/wiki/Getting_Started) (devkitARM + libctru):

```sh
make
```

Probar el lector de `pld.dat` en el PC con datos inventados:

```sh
gcc -Isource source/pld.c tests/pld_url.c -o pld_url
./pld_url tests/fixture-pld.bin
```

GitHub Actions compila la app y ejecuta esta prueba en cada cambio ([build.yml](../.github/workflows/build.yml)).

## Cómo funciona por dentro

| Archivo | Qué hace |
|---|---|
| `source/pld.c` | Lee `pld.dat`, junta las horas en partidas y calcula el resumen de cada año |
| `source/names.c` | Busca el nombre de cada título en la caché del Registro de actividad o en la app instalada |
| `source/main.c` | Pantallas, controles y dibujo del QR |
| `source/qrcodegen/` | Generador de QR de [nayuki](https://github.com/nayuki/QR-Code-generator) (MIT) |

El formato del enlace está en [docs/QR.md](../docs/QR.md).

## Créditos

- [nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator) (MIT)
- Formato de `pld.dat`: [HarshNarayanJha/3DS-ActivityLog](https://github.com/HarshNarayanJha/3DS-ActivityLog)
- Guardado del sistema y caché de iconos: [Ryuzaki-MrL/Cthulhu](https://github.com/Ryuzaki-MrL/Cthulhu)
