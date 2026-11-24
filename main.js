//opens the to-do page in a see-through window that floats above every app
const { app, BrowserWindow, ipcMain, screen, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

//sets the window size for the ball and the panel
const SIZES = {
  ball: { width: 84, height: 84 },
  panel: { width: 380, height: 590 },
};

//finds where the window position is saved
const statePath = () => path.join(app.getPath('userData'), 'window-state.json');
//loads the saved window position
function loadState() {
  try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')); } catch { return {}; }
}
//saves the window position
function saveState(s) {
  try { fs.writeFileSync(statePath(), JSON.stringify(s)); } catch {}
}

let win;
let mode = 'ball';
let state = loadState();

//keeps the window inside the screen
function clampToScreen(x, y, w, h) {
  const area = screen.getDisplayNearestPoint({ x: x + w / 2, y: y + h / 2 }).workArea;
  return {
    x: Math.round(Math.min(Math.max(x, area.x), area.x + area.width - w)),
    y: Math.round(Math.min(Math.max(y, area.y), area.y + area.height - h)),
  };
}

//creates the floating window
function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  const { width, height } = SIZES.ball;
  //starts in the top-right corner
  let x = state.x ?? area.x + area.width - width - 12;
  let y = state.y ?? area.y + 12;
  ({ x, y } = clampToScreen(x, y, width, height));

  win = new BrowserWindow({
    x, y, width, height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  //keeps it above everything, even fullscreen apps, on every desktop
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  //loads the page
  win.loadFile('index.html');

  //tells the page when you click away
  win.on('blur', () => win.webContents.send('window-blur'));
}

//switches between the ball and the panel, growing from the top-right corner
ipcMain.on('set-mode', (_e, next) => {
  if (!win || !SIZES[next] || next === mode) return;
  const b = win.getBounds();
  const right = b.x + b.width;
  const { width, height } = SIZES[next];
  const pos = clampToScreen(right - width, b.y, width, height);
  if (next === 'ball' && state.x != null) {
    //puts the ball back where it was
    Object.assign(pos, clampToScreen(state.x, state.y, width, height));
  }
  if (next === 'panel') state = { ...state, x: b.x, y: b.y };
  mode = next;
  win.setBounds({ ...pos, width, height });
});

//moves the window when you drag it
ipcMain.on('move-to', (_e, { x, y }) => {
  if (!win) return;
  const b = win.getBounds();
  const pos = clampToScreen(x, y, b.width, b.height);
  win.setPosition(pos.x, pos.y);
  if (mode === 'ball') { state = { ...state, ...pos }; saveState(state); }
});

//shows the right-click menu on the ball
ipcMain.on('show-menu', () => {
  const login = app.getLoginItemSettings().openAtLogin;
  Menu.buildFromTemplate([
    {
      label: 'Open at login', type: 'checkbox', checked: login,
      click: () => app.setLoginItemSettings({ openAtLogin: !login }),
    },
    {
      label: 'Move back to corner', click: () => {
        const area = screen.getPrimaryDisplay().workArea;
        const { width } = SIZES[mode];
        win.setPosition(area.x + area.width - width - 12, area.y + 12);
        if (mode === 'ball') { const [x, y] = win.getPosition(); state = { ...state, x, y }; saveState(state); }
      },
    },
    { type: 'separator' },
    { label: 'Quit to-do ball', click: () => app.quit() },
  ]).popup({ window: win });
});

//starts the app
app.whenReady().then(() => {
  //hides the dock icon
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  createWindow();
});

//saves the position when quitting
app.on('before-quit', () => saveState(state));
//quits when the window closes
app.on('window-all-closed', () => app.quit());
