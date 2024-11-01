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

  // Check if current URL is index.html
  function isOnIndexPage() {
    const currentURL = mainWindow.webContents.getURL();
    return currentURL === localHTMLPath;
  }

  // Handle link opening behavior
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isOnIndexPage()) {
      return { action: 'allow' }; // Allow URLs to open in-app if on index.html
    } else {
      shell.openExternal(url); // Open external links in default browser on other pages
      return { action: 'deny' };
    }
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isOnIndexPage() && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url); // Prevent navigation within the app for external URLs on non-index pages
    }
  });


  // mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  //   if (url.startsWith('file://')) {
  //     return { action: 'allow' }; // Allow in-app navigation for local links
  //   } else {
  //     shell.openExternal(url); // Open external links in default browser
  //     return { action: 'deny' };
  //   }
  // });

  // mainWindow.webContents.on('will-navigate', (event, url) => {
  //   if (!url.startsWith('file://')) {
  //     event.preventDefault();
  //     shell.openExternal(url); // Redirect external links
  //   }
  // });

  // Handle link opening behavior
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isOnIndexPage()) {
      return { action: 'allow' }; // Allow URLs to open in-app if on index.html
    } else {
      shell.openExternal(url); // Open external links in default browser on other pages
      return { action: 'deny' };
    }
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isOnIndexPage() && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url); // Prevent navigation within the app for external URLs on non-index pages
    }
  });


}

// Generate Menu Template
function getMenuTemplate() {
  const config = readConfig();

  const llmMenuItems = config.llm.map((item, index) => ({
    label: item.label,
    // accelerator: `CmdOrCtrl+${index + 1}`,
    click: () => {
      mainWindow.loadURL(item.url).then(() => saveLastSelectedURL(item.url)).catch(err => console.error('Failed to load URL:', err));
    },
  }));

  const imageMenuItems = config.image.map((item, index) => ({
    label: item.label,
    //accelerator: `CmdOrCtrl+${index + 1}`,
    click: () => {
      mainWindow.loadURL(item.url).then(() => saveLastSelectedURL(item.url)).catch(err => console.error('Failed to load URL:', err));
    },
  }));

  const videoMenuItems = config.video.map((item, index) => ({
    label: item.label,
    //accelerator: `CmdOrCtrl+${index + 1}`,
    click: () => {
      mainWindow.loadURL(item.url).then(() => saveLastSelectedURL(item.url)).catch(err => console.error('Failed to load URL:', err));
    },
  }));

  const voiceMenuItems = config.voice.map((item, index) => ({
    label: item.label,
    //accelerator: `CmdOrCtrl+${index + 1}`,
    click: () => {
      mainWindow.loadURL(item.url).then(() => saveLastSelectedURL(item.url)).catch(err => console.error('Failed to load URL:', err));
    },
  }));

  const musicMenuItems = config.music.map((item, index) => ({
    label: item.label,
    //accelerator: `CmdOrCtrl+${index + 1}`,
    click: () => {
      mainWindow.loadURL(item.url).then(() => saveLastSelectedURL(item.url)).catch(err => console.error('Failed to load URL:', err));
    },
  }));

  const miscMenuItems = config.misc.map((item, index) => ({
    label: item.label,
    //accelerator: `CmdOrCtrl+${index + 1}`,
    click: () => {
      mainWindow.loadURL(item.url).then(() => saveLastSelectedURL(item.url)).catch(err => console.error('Failed to load URL:', err));
    },
  }));

  const template = [
    {
      label: 'LLMs',
      submenu: [...llmMenuItems],
    },
    {
      label: 'Image AI',
      submenu: [...imageMenuItems],
    },
    {
      label: 'AI Video',
      submenu: [...videoMenuItems],
    },
    {
      label: 'AI Voice',
      submenu: [...voiceMenuItems],
    },
    {
      label: 'AI Music',
      submenu: [...musicMenuItems],
    },
    {
      label: 'Misc',
      submenu: [...miscMenuItems],
    },
    {
      label: 'Options',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.webContents.reload(),
        },
        {
          label: 'Reset',
          click: () => {
            mainWindow.loadURL(localHTMLPath).catch(err => console.error('Failed to load local HTML:', err));
          },
        },
        { type: 'separator' },
        {
          label: 'Copy URL',
          click: () => {
            const currentURL = mainWindow.webContents.getURL();
            clipboard.writeText(currentURL);
          },
        },
        { type: 'separator' },
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
          label: 'Open Dev Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.openDevTools(),
        },
        { type: 'separator' },
        { role: 'quit' } // Add Exit option here
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
