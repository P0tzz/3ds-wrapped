# App para 3DS

Lee el Registro de actividad de la consola y muestra un QR con el resumen del año.
Al escanearlo con el móvil se abre la web con tu Wrapped.

## Instalación

Necesitas una 3DS con CFW (Luma3DS).

1. Descarga `3ds-wrapped.3dsx` de [Releases](../../../releases)
2. Cópialo a `sd:/3ds/`
3. Ábrelo desde el Homebrew Launcher

Si el Registro de actividad no tiene datos recientes, ábrelo una vez antes: la consola
solo actualiza el archivo cuando entras en él.

## Controles

| botón       | acción       |
|-------------|--------------|
| ◀ ▶ / L R   | cambiar año  |
| START       | salir        |

El enlace también se guarda en `sd:/3ds/3ds-wrapped/enlace.txt`.

Los nombres de los juegos (también DS, DSiWare y homebrew) se leen de la caché de iconos
del Registro de actividad, así que aparecen igual que en la consola.

La app solo **lee** el guardado del sistema, no escribe nada en él.
Si no puede abrirlo, busca una copia en `sd:/3ds/3ds-wrapped/pld.dat`.

## Compilar

Con [devkitPro](https://devkitpro.org/wiki/Getting_Started) (devkitARM + libctru):

```
make
```

Para probar el parser en el PC:

```
gcc -Isource source/pld.c tests/pld_url.c -o pld_url
./pld_url tests/fixture-pld.bin
```

`tests/fixture-pld.bin` son datos inventados.

## Créditos

- [nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator) (MIT)
- Formato de `pld.dat`: [HarshNarayanJha/3DS-ActivityLog](https://github.com/HarshNarayanJha/3DS-ActivityLog)
- IDs del guardado del sistema por región: [Ryuzaki-MrL/Cthulhu](https://github.com/Ryuzaki-MrL/Cthulhu)
