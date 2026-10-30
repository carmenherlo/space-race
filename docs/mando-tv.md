# Mando de la tele (Fire TV)

El juego se puede jugar con el mando de la Fire TV (app de Home Assistant): las flechas
mueven un borde amarillo de un botón a otro y el botón del centro lo pulsa. Todo está aparte,
en `app/static/remote/`; `app.html` lo añade a cada página. Con tablet o PC no cambia nada.

## Hecho

- [x] Menú: flechas y centro.
- [x] Configuración de la partida: avatares, nivel, modo, "¡A jugar!".
- [x] El botón que toca pulsar ya está marcado ("Vale", "¡Uso mi estrella!", "Seguir", el dado…).
- [x] Minijuegos: Cometas (las flechas mueven el cohete), Ruleta, Despegue y el viaje a la Luna.
- [x] Página de pruebas "La última galaxia".
- [x] Nombre de las fichas: el centro abre el teclado de la tele.

## Para probar en la Fire TV

- [ ] Una partida entera de "Carrera" solo con el mando.
- [ ] Una partida entera de "Sabelotodo" solo con el mando.
- [ ] Escribir nombres en las fichas.
- [ ] Pausa: abrirla, seguir y salir al menú.
- [ ] Los tres minijuegos en "La última galaxia".
- [ ] Qué hacen la flecha de atrás y los tres puntos.

Apuntar dónde el borde no empieza en el botón esperado o salta a uno raro.

## Pendiente

1. Panel de sonido 🔊: con el mando se abre pero no se cierra.
2. Flecha de atrás: si le llega al juego, que cierre la ventana abierta o vuelva al menú.
3. Página "Todas las preguntas": activar el mando.
4. Las otras páginas de pruebas (celebración, dado, cohete): activar el mando.
5. Si el teclado de la tele no sirve para los nombres: elegir el nombre con botones.
