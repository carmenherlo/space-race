# 🚀 SPACE RACE — Normas comunes

Las normas que valen para **todos los tableros**. Lo propio de cada tablero (sus casillas
especiales y sus detalles) está en su carpeta: `content/games/<tablero>/rules.md`.

¡Carrera espacial hasta la Luna! Gana quien llegue primero a la **Luna**, la última casilla.

---

## Preparación

1. Cada jugador elige su avatar (y, si quiere, su nombre y su nivel de preguntas).
2. Todas las fichas empiezan en **Start here**.
3. Un sorteo automático decide el orden de los turnos: los avatares se barajan solos y quedan
   en fila, 1º, 2º, 3º… Se juega en ese orden.

## Cómo se juega

En tu turno tiras el dado y avanzas tantas casillas como indique. Si caes en una casilla
especial, haces lo que dice su tarjeta (cada tablero tiene las suyas).

## Los viajes y retroceder

- Los **viajes** no cuentan: a donde te lleva una casilla (una galaxia, un ovni, un agujero…)
  no se aplica nada. Si contaran, habría viajes sin fin (de un ovni al otro y vuelta).
- Cuando **retrocedes** por una casilla (los meteoritos) o por el rebote de la Luna, la casilla
  en la que caes **cuenta**, como si hubieras llegado con el dado (si el tablero lo dice:
  `backwards_counts`).
- Si estás en Start here, no puedes retroceder.

## La estrella comodín ⭐

Solo en los tableros que tienen una casilla de estrella.

- Al caer en ella coges una estrella y te la guardas (el tablero dice cuántas puedes tener).
- La usas **una vez** para librarte de una casilla mala (el tablero dice de cuáles): el juego
  te pregunta si la usas o te la guardas. Si la usas, te quedas en esa casilla y no te pasa nada.
- La estrella no te protege de lo que hace otro jugador (por ejemplo, una tormenta solar).

## Llegar a la Luna 🌕

- Con **llegada exacta** hay que caer justo en la Luna. Si sacas más de lo que necesitas,
  llegas a la Luna y **rebotas** hacia atrás las casillas que te sobran.
  - Ejemplo: te faltan 3 y sacas un 5: avanzas 3 hasta la Luna y retrocedes 2.
- Sin llegada exacta, pasarte también vale.
- La **última galaxia** te reta a un minijuego (cometas, ruleta o despegue): si ganas,
  ¡viajas directo a la Luna y ganas la partida!

## Fin de la partida

Gana el primer jugador que llegue a la Luna.

---

## Modos de juego

Antes de empezar se elige el modo:

- 🏁 **Carrera**: tiras, avanzas y haces lo que dice tu casilla.
- 🧠 **Sabelotodo**: una carrera de preguntas (ver abajo).

## Sabelotodo 🧠

- Hay 6 niveles. Niños: 🐣 de 3 a 5 años (verdadero o falso) · 🐣🐣 de 6 a 8 · 🐣🐣🐣 de 9
  a 12. Adultos: ⭐ fácil (verdadero o falso) · ⭐⭐ medio · ⭐⭐⭐ difícil. En el menú, el
  botón ⓘ lo explica.
- Cada jugador elige su nivel antes de empezar (el botón junto a su nombre).
- En tu turno te hacen una pregunta de tu nivel:
  - **Si aciertas**, pulsas "¡A tirar el dado!": el dado se tira solo y avanzas.
  - **Si fallas**, se muestra la respuesta correcta y te quedas donde estás.
- Las casillas especiales **cuentan**, como en Carrera, después de tirar:
  - **Vuelve a tirar**: tiras otra vez, **sin pregunta**. Es el premio de esa casilla.
  - **Pierdes turno**: en esos turnos **no hay pregunta**.
- Las preguntas tienen 4 respuestas (en un orden distinto cada vez); las de 🐣 y ⭐, solo
  "Verdadero" o "Falso". Algunas traen un dato curioso al contestar.
- Cada nivel tiene su mazo, compartido por todos: no se repite ninguna pregunta hasta que han
  salido todas las de ese nivel.

Las preguntas están en `content/questions/general.yaml`. Para leerlas, filtradas por nivel y
tema: la página "Preguntas" del menú.
