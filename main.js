const { app, BrowserWindow, Menu, clipboard, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const packageData = require('./package.json');  // Load package.json to access application details

let mainWindow;
const configFilePath = path.join(__dirname, 'config.json');
const localIndexHtml = `file://${path.join(__dirname, '/index/index.html')}`;
const latestReleaseUrl = 'https://raw.githubusercontent.com/DarceyLloyd/ai-gateway/main/package.json';  // URL to check for the latest version

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

// Retrieve the last selected URL from the config file
function getLastSelectedURL() {
  const config = readConfig();
  return config.config.lastURL || null;
}

// Check for new version
function checkForUpdate(showAlert = false) {
  https.get(latestReleaseUrl, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const latestPackageData = JSON.parse(data);
      const latestVersion = latestPackageData.version;

      if (latestVersion > packageData.version) {
        dialog.showMessageBox({
          type: 'info',
          buttons: ['OK'],
          title: 'Update Available',
          message: `A new version (${latestVersion}) is available. Please update from ${latestReleaseUrl}.`
        });
      } else if (showAlert) {
        dialog.showMessageBox({
          type: 'info',
          buttons: ['OK'],
          title: 'No Update Available',
          message: 'You are using the latest version.'
        });
      }
    });
  }).on('error', (err) => {
    console.error('Error checking for updates:', err);
    if (showAlert) {
      dialog.showMessageBox({
        type: 'error',
        buttons: ['OK'],
        title: 'Update Check Failed',
        message: 'Could not check for updates. Please try again later.'
      });
    }
  });
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
    if (readConfig().config.openInBrowser) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('context-menu', (event, params) => {
    const template = [
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste' }
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(mainWindow);
  });

  // Check for updates on startup
  checkForUpdate();
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
      { label: 'Reset', click: () => mainWindow.loadURL(localIndexHtml).catch(err => console.error('Failed to load index.html:', err)) },
      { type: 'separator' },
      { label: 'Check for Updates', click: () => checkForUpdate(true) },
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
