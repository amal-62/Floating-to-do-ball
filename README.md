# To-do Ball 🫧

A tiny crystal-blue to-do ball that floats in the corner of your Mac, on top of every app (fullscreen ones too). The number inside is how many tasks you have left today.

Built with plain **HTML, CSS and JavaScript**. Electron is used only to put that page in a see-through, always-on-top window.

| File | What it is |
|---|---|
| `index.html` | the ball + the panel |
| `style.css` | the crystal-blue look |
| `app.js` | tasks, tabs, saving, dragging |
| `mascot.png` | your little bear |
| `main.js`, `preload.js` | the floating window (you rarely need to touch these) |

## Run it

1. Install Node.js (LTS) from https://nodejs.org if you don't have it.
2. Open Terminal in this folder and run:

```bash
npm install
npm start
```

The ball appears in the top-right corner.

## Using it

- **Click the ball** to open the list. Click anywhere else, press **Esc**, or hit **–** to close it.
- **Drag the ball** (or the date bar on the panel) to move it. It remembers where you left it.
- **Daily / Weekly**: use the switch at the top. Daily is one day at a time. Weekly is its own list of things to get done that week, with a progress bar.
- **Add a task**: type in the box at the bottom and press Enter. It goes into whichever view you're on. Pick work, study or life from the little menu, or type `#study revise chapter 4`.
- **Tick the circle** to complete a task. Hover a task for more:
  - `‖` move to Pending · `↷` push to tomorrow (or next week) · `×` cancel
  - `↺` move back to To-do · `⌫` delete
- **Double-click** a task to edit it.
- **‹ ›** go to other days (or weeks). Click the date to jump back to now.
- Unfinished tasks roll over automatically: daily ones to today, weekly ones to this week.
- The number on the ball is how many of **today's daily tasks** are left.
- **Right-click the ball** for: Open at login, Move back to corner, Quit.

## Make it a real app (optional)

```bash
npm run build
```

This creates a `.dmg` in the `dist` folder. Drag **To-do Ball** into Applications. It isn't signed, so the first time you open it, right-click the app → **Open** → **Open**. Then turn on **Open at login** from the ball's right-click menu.

## Customise

- **Colours**: the variables at the top of `style.css` (`--glass-top`, `--glass-bottom`, `--ink`…).
- **Ball size**: `#ball` width/height in `style.css`.
- **Mascot**: replace `mascot.png` with any transparent PNG.
- **Categories**: `CATS` in `app.js`, plus the options in `index.html`.

Your tasks are saved on your Mac and stay there after you quit.
