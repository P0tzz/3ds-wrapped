# Formato de los datos

3DS Wrapped trabaja con una lista de **sesiones de juego**. Cada sesión tiene tres campos:

| Campo     | Alternativas aceptadas            | Ejemplo               | Descripción                         |
|-----------|-----------------------------------|-----------------------|-------------------------------------|
| `juego`   | `game`, `title`, `titulo`         | `Kart Galáctico`      | Nombre del juego                    |
| `inicio`  | `start`, `date`, `fecha`          | `2025-03-14T18:30`    | Cuándo empezó la partida (ISO 8601) |
| `minutos` | `minutes`, `duration`, `duracion` | `45`                  | Duración en minutos                 |

## JSON

Puede ser una lista directa o un objeto con la propiedad `sesiones`:

```json
{
  "sesiones": [
    { "juego": "Kart Galáctico", "inicio": "2025-03-14T18:30", "minutos": 45 },
    { "juego": "Granja Feliz 3D", "inicio": "2025-03-15T10:00", "minutos": 20 }
  ]
}
```

## CSV

Con cabecera. El separador puede ser `,` o `;`:

```csv
juego,inicio,minutos
Kart Galáctico,2025-03-14T18:30,45
"Juego, con coma",2025-03-15T10:00,20
```

Tienes ejemplos en [`ejemplos/`](../ejemplos).

## pld.dat (en desarrollo)

La consola guarda su registro de actividad en un archivo llamado `pld.dat`.
Para extraerlo hace falta una consola con homebrew y un gestor de partidas guardadas.
Su formato está documentado parcialmente en [3dbrew](https://www.3dbrew.org/wiki/Activity_Log).

La idea es implementar `parsePld()` en [`js/parsers.js`](../js/parsers.js) para que convierta
ese archivo en la misma lista de sesiones. ¿Te animas? Mira el apartado **Cómo contribuir** del README.
