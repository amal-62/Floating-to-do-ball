//connects the page to the window safely
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('floatie', {
  //switches between the ball and the panel
  setMode: (mode) => ipcRenderer.send('set-mode', mode),
  //moves the window
  moveTo: (x, y) => ipcRenderer.send('move-to', { x, y }),
  //opens the right-click menu
  showMenu: () => ipcRenderer.send('show-menu'),
  //tells the page when you click away
  onBlur: (fn) => ipcRenderer.on('window-blur', fn),
});
