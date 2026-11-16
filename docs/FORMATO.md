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

Sin implementar. Ver https://www.3dbrew.org/wiki/Activity_Log
