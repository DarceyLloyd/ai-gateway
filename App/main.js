const { app, BrowserWindow, Menu, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const packageData = require('./package.json');  // Load package.json to access application details


let mainWindow;
const configFilePath = path.join(__dirname, 'config.json');
const localIndexHtml = `file://${path.join(__dirname, 'index.html')}`;

// Read or create the configuration file
function readConfig() {
  try {
    if (!fs.existsSync(configFilePath)) {
      const defaultConfig = { menus: {}, config: {} };
      fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2));
    }
    const data = fs.readFileSync(configFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading or creating config file:', err);
    return { menus: {}, config: {} };
  }
}

// Save the configuration to the file
function saveConfig(config) {
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
}

// Save the last selected URL to the config file
// function saveLastSelectedURL(url) {
//   const config = readConfig();
//   config.config.lastURL = url;
//   saveConfig(config);
//   console.log('Config file updated with last URL:', url);
// }

// Retrieve the last selected URL from the config file
function getLastSelectedURL() {
  const config = readConfig();
  return config.config.lastURL || null;
}

// Create the main application window
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

  mainWindow.loadURL(localIndexHtml)
    .catch(err => console.error('Failed to load:', err));

  const menu = Menu.buildFromTemplate(getMenuTemplate());
  Menu.setApplicationMenu(menu);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // External handler for window.open calls in Electron
    if (readConfig().config.openInBrowser) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Save the new URL here if navigating within Electron
    // saveLastSelectedURL(url);
  });

  mainWindow.webContents.on('context-menu', (event, params) => {
    const template = [
      { label: 'Cut', role: 'cut' },
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste' },
      { type: 'separator' },
      { label: 'Select All', role: 'selectAll' },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(mainWindow);
  });
}

// Recursive function to build menu items, supporting nested submenus
function buildMenuItems(items) {
  return items.map(item => {
    const menuItem = {
      label: item.label,
    };

    if (item.url) {
      menuItem.click = () => {
        if (item.openInBrowser) {
          shell.openExternal(item.url);
        } else {
          mainWindow.loadURL(item.url)
            // .then(() => saveLastSelectedURL(item.url))
            .catch(err => console.error('Failed to load URL:', err));
        }
      };
    }

    if (item.submenu) {
      menuItem.submenu = buildMenuItems(item.submenu);
    }

    return menuItem;
  });
}

// Generate the menu template with dynamic and static items
function getMenuTemplate() {
  const config = readConfig();

  const dynamicMenuItems = Object.keys(config.menus)
    .map(category => ({
      label: capitalizeFirstLetter(category),
      submenu: buildMenuItems(config.menus[category]),
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
      {
        label: 'About',
        click: openAboutWindow
      },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };

  return [...dynamicMenuItems, optionsMenu];
}

function openAboutWindow() {
  const aboutWindow = new BrowserWindow({
    width: 300,
    height: 200,
    title: 'About',
    modal: true,
    parent: mainWindow,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  aboutWindow.setMenu(null);

  // HTML content for the "About" modal
  const aboutContent = `
  <style>
    body {
      background-color: #333333;
      color: #f0f0f0;
      font-family: sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      margin: 0;
      padding: 0;
      font-size: 1rem;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }


    h2 {
      margin: 0;
    }

    p {
      margin: 5px 0;
      font-size: 0.8rem;
    }


  </style>

  <div>
    <h2>AI Gateway</h2>
    <p><strong>Version:</strong> ${packageData.version}</p>
    <p><strong>Author:</strong> Darcey Lloyd</p>
    <p><strong>Email:</strong> admin@aftc.io</p>
  </div>
`;


  aboutWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(aboutContent)}`);
}



// Capitalize the first letter of a string
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
