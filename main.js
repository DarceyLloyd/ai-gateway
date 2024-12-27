const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const packageData = require('./package.json'); // Load package.json for app details

let mainWindow;
const configFilePath = path.join(__dirname, 'config.json');
const localIndexHtml = `file://${path.join(__dirname, '/index1/index.html')}`;
const latestReleaseUrl = 'https://raw.githubusercontent.com/DarceyLloyd/ai-gateway/refs/heads/main/package.json';
const gitpage = 'https://github.com/DarceyLloyd/ai-gateway';
const config = getConfigJson();

// Read or create the configuration file
function getConfigJson() {
  const data = fs.readFileSync(configFilePath, 'utf8');
  return JSON.parse(data);
}

// Save updated config
function saveConfigJson() {
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
}

// Check for updates
function checkForUpdate(showAlert = false) {
  https.get(latestReleaseUrl, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const latestVersion = JSON.parse(data).version;
      if (latestVersion > packageData.version) {
        dialog.showMessageBox({
          type: 'info',
          buttons: ['OK'],
          title: 'Update Available',
          message: `A new version (${latestVersion}) is available. Please update from ${gitpage}.`
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

  mainWindow.loadURL(localIndexHtml).catch(err => console.error('Failed to load:', err));

  const menu = Menu.buildFromTemplate(getMenuTemplate());
  Menu.setApplicationMenu(menu);

  // Open external links in the OS browser or new electron window based on individual menu item settings
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const menuItem = findMenuItemByUrl(url);
    if (menuItem) {
      if (menuItem.openInBrowser) {
        shell.openExternal(url);
      } else {
        mainWindow.loadURL(url).catch(err => console.error('Failed to load URL in main window:', err));
      }
      return { action: 'deny' };
    } else {
      if (config.openLinksInBrowser) {
        shell.openExternal(url);
      } else {
        const newWindow = new BrowserWindow({
          width: 800,
          height: 600,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
          },
        });
        newWindow.loadURL(url).catch(err => console.error('Failed to load URL:', err));
      }
      return { action: 'deny' };
    }
  });

  if (config.openDevTools) {
    mainWindow.webContents.openDevTools();
  }

  // Add context menu for copy/paste and custom link handling
  mainWindow.webContents.on('context-menu', (event, params) => {
    const contextMenu = Menu.buildFromTemplate([
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
      ...params.linkURL ? [
        {
          label: 'Open Link in Browser',
          click: () => {
            shell.openExternal(params.linkURL);
          }
        }
      ] : []
    ]);
    contextMenu.popup(mainWindow);
  });

  // Check for updates on startup
  checkForUpdate();
}

// Find a menu item by its URL
function findMenuItemByUrl(url) {
  function searchMenu(items) {
    for (const item of items) {
      if (item.url === url) return item;
      if (item.submenu) {
        const found = searchMenu(item.submenu);
        if (found) return found;
      }
    }
    return null;
  }

  return Object.values(config.menus).reduce((found, category) => found || searchMenu(category), null);
}

// Recursive function to build menu items, supporting nested submenus
function buildMenuItems(items) {
  return items.map(item => {
    const menuItem = { label: item.label };
    if (item.url) {
      menuItem.click = () => {
        if (item.openInBrowser) {
          shell.openExternal(item.url);
        } else {
          mainWindow.loadURL(item.url).catch(err => console.error('Failed to load URL in main window:', err));
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
      { label: 'Open Links in Browser', type: 'checkbox', checked: config.openLinksInBrowser, click: (menuItem) => {
          config.openLinksInBrowser = menuItem.checked;
          saveConfigJson();
        } },
      { type: 'separator' },
      { label: 'Open Dev Tools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow.webContents.openDevTools() },
      { type: 'separator' },
      { label: 'About', click: () => dialog.showMessageBox({ type: 'info', buttons: ['OK'], title: 'About', message: `AI Gateway v${packageData.version}\nAuthor: Darcey Lloyd\nEmail: Darcey@aftc.io` }) },
      { role: 'quit' },
    ],
  };

  return [...dynamicMenuItems, optionsMenu];
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
