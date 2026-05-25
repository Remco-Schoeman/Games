# Pocket Games

A tiny collection of browser games for mobile. Pure static HTML / CSS / JavaScript — no build step, no server, no tracking. Player names and high scores are kept in `localStorage`.

**Play it:** https://remco-schoeman.github.io/Games/

## Games

- **Azulejo Tiles** — an NYT-Tiles-style layered matching game. A 6×8 grid of stacked tiles, each layer drawn with one of 20 randomly-picked azulejo-inspired SVG patterns in one of 6 randomly-picked colours. Tap two tiles whose topmost pattern and colour match to clear the layer beneath. Score is elapsed time plus a 5-second penalty per mismatch.

## Running locally

ES modules require HTTP, so `file://` won't work. From the repo root:

```sh
python3 -m http.server
```

Then open http://localhost:8000.
