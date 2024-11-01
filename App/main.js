const { app, BrowserWindow, Menu, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const configFilePath = path.join(__dirname, 'config.json');
// const configFilePath = path.join(app.getPath('userData'), 'config.json');
const localHTMLPath = `file://${path.join(__dirname, 'index.html')}`;

// function readConfig() {
//   try {
//     if (fs.existsSync(configFilePath)) {
//       const data = fs.readFileSync(configFilePath, 'utf8');
//       return JSON.parse(data);
//     }
//   } catch (err) {
//     console.error('Error reading config file:', err);
//   }
//   return { choices: [], lastURL: null, openLinksInBrowser: true };
// }


function readConfig() {


  try {
    if (!fs.existsSync(configFilePath)) {
      fs.writeFileSync(configFilePath, JSON.stringify({ choices: [], lastURL: null, openLinksInBrowser: true }, null, 2));
    }
    const data = fs.readFileSync(configFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading or creating config file:', err);
    return { choices: [], lastURL: null, openLinksInBrowser: true };
  }

  // try {
  //   if (fs.existsSync(configFilePath)) {
  //     const data = fs.readFileSync(configFilePath, 'utf8');
  //     return JSON.parse(data);
  //   }
  // } catch (err) {
  //   console.error('Error reading config file:', err);
  // }
  // return { choices: [], lastURL: null, openLinksInBrowser: true };
}


function saveConfig(config) {
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
}

function saveLastSelectedURL(url) {
  const config = readConfig();
  config.lastURL = url;
  saveConfig(config);
  console.log('Config file updated with last URL:', url);
}

function getLastSelectedURL() {
  const config = readConfig();
  return config.lastURL || null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      webviewTag: true,
    },
  });

  const lastURL = getLastSelectedURL();
  mainWindow.loadURL(lastURL || localHTMLPath).catch(err => console.error('Failed to load URL:', err));

  const menu = Menu.buildFromTemplate(getMenuTemplate());
  Menu.setApplicationMenu(menu);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const config = readConfig();
    if (config.openLinksInBrowser) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const config = readConfig();
    if (!url.startsWith('file://') && config.openLinksInBrowser) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('context-menu', (event, params) => {
    const { selectionText, isEditable } = params;

    const template = [
      { label: 'Cut', role: 'cut' },
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste' },
      { type: 'separator' },
      { label: 'Select All', role: 'selectAll' }
    ];

    const menu = Menu.buildFromTemplate(template);
    menu.popup(mainWindow);
  });
}

function toggleOpenLinksSetting() {
  const config = readConfig();
  config.openLinksInBrowser = !config.openLinksInBrowser;
  saveConfig(config);
  const menu = Menu.buildFromTemplate(getMenuTemplate());
  Menu.setApplicationMenu(menu);
}

// function getMenuTemplate() {
//   const config = readConfig();

//   const dynamicMenuItems = Object.keys(config)
//     .filter(category => Array.isArray(config[category]))
//     .map(category => ({
//       label: capitalizeFirstLetter(category),
//       submenu: config[category].map((item, index) => ({
//         label: item.label,
//         click: () => {
//           mainWindow.loadURL(item.url).then(() => saveLastSelectedURL(item.url)).catch(err => console.error('Failed to load URL:', err));
//         },
//       })),
//     }));

//     const optionsMenu = {
//       label: 'Options',
//       submenu: [
//         {
//           label: 'Reload',
//           accelerator: 'CmdOrCtrl+R',
//           click: () => mainWindow.webContents.reload(),
//         },
//         {
//           label: 'Reset',
//           click: () => mainWindow.loadURL(localHTMLPath).catch(err => console.error('Failed to load local HTML:', err)),
//         },
//         { type: 'separator' },
//         {
//           label: 'Copy URL',
//           click: () => {
//             const currentURL = mainWindow.webContents.getURL();
//             clipboard.writeText(currentURL);
//           },
//         },
//         { type: 'separator' },
//         {
//           label: 'Back',
//           accelerator: 'Alt+Left',
//           click: () => {
//             if (mainWindow.webContents.navigationHistory.canGoBack) {
//               mainWindow.webContents.navigationHistory.goBack();
//             }
//           },
//         },
//         {
//           label: 'Forward',
//           accelerator: 'Alt+Right',
//           click: () => {
//             if (mainWindow.webContents.navigationHistory.canGoForward) {
//               mainWindow.webContents.navigationHistory.goForward();
//             }
//           },
//         },
//         { type: 'separator' },
//         {
//           label: 'Open Dev Tools',
//           accelerator: 'CmdOrCtrl+Shift+I',
//           click: () => mainWindow.webContents.openDevTools(),
//         },
//         { type: 'separator' },
//         {
//           label: 'Open Links in Browser',
//           type: 'checkbox',
//           checked: config.openLinksInBrowser,
//           click: () => toggleOpenLinksSetting(),
//         },
//         { type: 'separator' },
//         { role: 'quit' },
//       ],
//     };


//   return [...dynamicMenuItems, optionsMenu];
// }

function getMenuTemplate() {
  const config = readConfig();

  const buildMenu = (menuItems) => {
    return menuItems.map(item => {
      if (item.submenu) {
        return {
          label: item.label,
          submenu: buildMenu(item.submenu),
        };
      } else {
        return {
          label: item.label,
          click: () => {
            mainWindow.loadURL(item.url).then(() => saveLastSelectedURL(item.url)).catch(err => console.error('Failed to load URL:', err));
          },
        };
      }
    });
  };

  const dynamicMenuItems = Object.keys(config)
    .filter(category => Array.isArray(config[category]))
    .map(category => ({
      label: capitalizeFirstLetter(category),
      submenu: buildMenu(config[category]),
    }));

  const optionsMenu = {
    label: 'Options',
    submenu: [
      { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.webContents.reload() },
      { label: 'Reset', click: () => mainWindow.loadURL(localHTMLPath).catch(err => console.error('Failed to load local HTML:', err)) },
      { type: 'separator' },
      { label: 'Copy URL', click: () => clipboard.writeText(mainWindow.webContents.getURL()) },
      { type: 'separator' },
      { label: 'Back', accelerator: 'Alt+Left', click: () => mainWindow.webContents.goBack() },
      { label: 'Forward', accelerator: 'Alt+Right', click: () => mainWindow.webContents.goForward() },
      { type: 'separator' },
      { label: 'Open Dev Tools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow.webContents.openDevTools() },
      { type: 'separator' },
      { label: 'Open Links in Browser', type: 'checkbox', checked: config.openLinksInBrowser, click: () => toggleOpenLinksSetting() },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };

  return [...dynamicMenuItems, optionsMenu];
}


function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
