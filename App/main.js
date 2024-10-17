const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Path to the configuration file
const configFilePath = path.join(app.getPath('userData'), 'config.json');

// Path to local index.html file
const localHTMLPath = `file://${path.join(__dirname, 'index.html')}`;

function createWindow() {
  console.log('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the last selected URL or the local index.html
  const lastURL = getLastSelectedURL();
  if (lastURL) {
    console.log('Last selected URL:', lastURL);
    mainWindow.loadURL(lastURL).catch((err) => {
      console.error('Failed to load URL:', err);
    });
  } else {
    console.log('No URL found, loading local index.html');
    mainWindow.loadURL(localHTMLPath).catch((err) => {
      console.error('Failed to load local HTML file:', err);
    });
  }

  // Build and set the application menu
  const menu = Menu.buildFromTemplate(getMenuTemplate());
  Menu.setApplicationMenu(menu);

  // Open the DevTools (optional, for debugging)
  // mainWindow.webContents.openDevTools();
}

function getMenuTemplate() {
  const urls = [
    { label: 'ChatGPT', url: 'https://chat.openai.com', accelerator: 'CmdOrCtrl+1' },
    { label: 'Claude', url: 'https://claude.ai/new', accelerator: 'CmdOrCtrl+2' },
    { label: 'Gemini', url: 'https://gemini.google.com/app', accelerator: 'CmdOrCtrl+3' },
    { label: 'MS Copilot', url: 'https://copilot.microsoft.com/', accelerator: 'CmdOrCtrl+4' },
  ];

  const urlMenuItems = urls.map((item) => ({
    label: item.label,
    accelerator: item.accelerator,
    click: () => {
      console.log(`Loading URL: ${item.url}`);
      mainWindow.loadURL(item.url).then(() => {
        saveLastSelectedURL(item.url);
      }).catch((err) => {
        console.error('Failed to load URL:', err);
      });
    },
  }));

  const template = [
    {
      label: 'AI Choices',
      submenu: [
        ...urlMenuItems,
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => {
            if (mainWindow.webContents.canGoBack()) {
              mainWindow.webContents.goBack();
            }
          },
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => {
            if (mainWindow.webContents.canGoForward()) {
              mainWindow.webContents.goForward();
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.reload();
          },
        },
      ],
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Reset',
          click: () => {
            console.log('Resetting application...');
            resetConfig();
          },
        },
      ],
    },
  ];

  return template;
}

function resetConfig() {
  // Delete the config file
  fs.unlink(configFilePath, (err) => {
    if (err) {
      console.error('Error deleting config file:', err);
    } else {
      console.log('Config file deleted successfully.');

      // Load local index.html after resetting
      mainWindow.loadURL(localHTMLPath).catch((err) => {
        console.error('Failed to load local HTML file after reset:', err);
      });
    }
  });
}

function saveLastSelectedURL(url) {
  console.log('Saving last selected URL:', url);
  const config = { lastURL: url };
  fs.writeFile(configFilePath, JSON.stringify(config), (err) => {
    if (err) {
      console.error('Error saving config file:', err);
    } else {
      console.log('Config file saved successfully.');
    }
  });
}

function getLastSelectedURL() {
  try {
    if (fs.existsSync(configFilePath)) {
      const data = fs.readFileSync(configFilePath, 'utf8');
      const config = JSON.parse(data);
      console.log('Config file read successfully:', config);
      return config.lastURL;
    } else {
      console.log('Config file does not exist.');
    }
  } catch (err) {
    console.error('Error reading config file:', err);
  }
  return null;
}

app.whenReady().then(() => {
  console.log('App is ready.');
  createWindow();
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
