const { app, BrowserWindow, Menu, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Config file path
const configFilePath = path.join(__dirname, 'config.json');

// Local HTML Path
const localHTMLPath = `file://${path.join(__dirname, 'index.html')}`;

// Read Config
function readConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      const data = fs.readFileSync(configFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading config file:', err);
  }
  return { choices: [], lastURL: null };
}

// Save Last Selected URL
function saveLastSelectedURL(url) {
  const config = readConfig();
  config.lastURL = url;
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  console.log('Config file updated with last URL:', url);
}

// Get Last Selected URL
function getLastSelectedURL() {
  const config = readConfig();
  return config.lastURL || null;
}

// Create Window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const lastURL = getLastSelectedURL();
  mainWindow.loadURL(lastURL || localHTMLPath).catch(err => console.error('Failed to load URL:', err));

  const menu = Menu.buildFromTemplate(getMenuTemplate());
  Menu.setApplicationMenu(menu);

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });


}

// Generate Menu Template
function getMenuTemplate() {
  const config = readConfig();
  const urlMenuItems = config.choices.map((item, index) => ({
    label: item.label,
    accelerator: `CmdOrCtrl+${index + 1}`,
    click: () => {
      mainWindow.loadURL(item.url).then(() => saveLastSelectedURL(item.url)).catch(err => console.error('Failed to load URL:', err));
    },
  }));

  const template = [
    {
      label: 'AI Choices',
      submenu: [...urlMenuItems, { type: 'separator' }, { role: 'quit' }],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => {
            if (mainWindow.webContents.canGoBack()) mainWindow.webContents.goBack();
          },
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => {
            if (mainWindow.webContents.canGoForward()) mainWindow.webContents.goForward();
          },
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.webContents.reload(),
        },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Copy URL',
          click: () => {
            const currentURL = mainWindow.webContents.getURL();
            clipboard.writeText(currentURL);
          },
        },
        { type: 'separator' },
        {
          label: 'Reset',
          click: () => {
            mainWindow.loadURL(localHTMLPath).catch(err => console.error('Failed to load local HTML:', err));
          },
        },
      ],
    },
  ];

  return template;
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
