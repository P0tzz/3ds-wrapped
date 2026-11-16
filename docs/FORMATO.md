# Formato de datos

Una lista de sesiones con tres campos:

| campo     | alias                             | ejemplo            |
|-----------|-----------------------------------|--------------------|
| `juego`   | `game`, `title`, `titulo`         | `Kart Galáctico`   |
| `inicio`  | `start`, `date`, `fecha`          | `2025-03-14T18:30` |
| `minutos` | `minutes`, `duration`, `duracion` | `45`               |

## JSON

Array o un objeto con `sesiones`:

```json
{
  "sesiones": [
    { "juego": "Kart Galáctico", "inicio": "2025-03-14T18:30", "minutos": 45 }
  ]
}
```

## CSV

Separador `,` o `;`, con cabecera:

```csv
juego,inicio,minutos
Kart Galáctico,2025-03-14T18:30,45
```

## pld.dat

Es el archivo de guardado del Registro de actividad. Para sacarlo hace falta CFW y
[JKSM](https://github.com/J-D-K/JKSM):

1. En JKSM: *System Titles* → *Activity Log* → *SysSave Data* → *New*
2. Copia `pld.dat` desde `SD:/JKSV/SysSave_Data/Activity_Log/<nombre>/`

Notas:

- La consola guarda el tiempo por bloques de una hora, así que las horas de inicio son aproximadas.
  Las horas seguidas del mismo juego se juntan en una sola partida.
- El archivo solo tiene IDs de título. Los nombres se buscan en las listas de
  [3dsdb](https://github.com/hax0kartik/3dsdb) (se descargan al cargar el archivo).
  Los juegos que no aparecen se muestran con su ID.
- Estructura del archivo: [pld-structure.md](https://github.com/HarshNarayanJha/3DS-ActivityLog/blob/main/docs/data-extraction/pld-structure.md)
