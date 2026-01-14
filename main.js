const { app, BrowserWindow, Menu, shell, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const packageData = require('./package.json'); // Load package details

let mainWindow;
const configFilePath = path.join(__dirname, 'config.json');
const localIndexHtml = `file://${path.join(__dirname, '/index.html')}`;
const latestReleaseUrl = 'https://raw.githubusercontent.com/DarceyLloyd/ai-gateway/refs/heads/main/package.json';
const gitpage = 'https://github.com/DarceyLloyd/ai-gateway';
const config = getConfigJson();

// Read or create the configuration file
function getConfigJson() {
    try {
        if (!fs.existsSync(configFilePath)) {
            const defaultConfig = {
                openLinksInBrowser: false, // Changed default to false to keep links in app
                openDevTools: false,
                menus: {}
            };
            fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2), 'utf8');
            return defaultConfig;
        }
        const data = fs.readFileSync(configFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading or creating config.json:', err);
        throw err;
    }
}

// Save updated configuration to disk
function saveConfigJson() {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
}

// Check for updates by comparing versions
function checkForUpdate(showAlert = false) {
    https.get(latestReleaseUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const latestVersion = JSON.parse(data).version;
                const localVersion = packageData.version;
                if (isVersionNewer(latestVersion, localVersion)) {
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
            } catch (err) {
                console.error('Error parsing update response:', err);
                if (showAlert) {
                    dialog.showMessageBox({
                        type: 'error',
                        buttons: ['OK'],
                        title: 'Update Check Failed',
                        message: 'Could not check for updates. Please try again later.'
                    });
                }
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

// Helper function to compare semantic versions
function isVersionNewer(latest, current) {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
        const latestPart = latestParts[i] || 0;
        const currentPart = currentParts[i] || 0;
        if (latestPart > currentPart) return true;
        if (latestPart < currentPart) return false;
    }
    return false;
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

    // Create popups/new windows within the Electron app
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Handle menu items URLs if needed
        const menuItem = findMenuItemByUrl(url);
        if (menuItem && menuItem.openInBrowser) {
            shell.openExternal(url);
            return { action: 'deny' };
        }

        // For auth flows and other popups, open in a new BrowserWindow inside the app
        // This allows cookies and session data to be maintained within the app
        return {
            action: 'allow',
            overrideBrowserWindowOptions: {
                width: 800,
                height: 600,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: false,
                    webviewTag: true,
                },
            }
        };
    });

    // Handle regular navigation within the app
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const menuItem = findMenuItemByUrl(url);
        // If it's a menu item explicitly marked to open in browser, do that
        if (menuItem && menuItem.openInBrowser) {
            event.preventDefault();
            shell.openExternal(url);
        }
        // Otherwise allow the navigation to happen within the app
    });

    if (config.openDevTools) {
        mainWindow.webContents.openDevTools();
    }

    // Add a context menu with basic editing and link handling
    mainWindow.webContents.on('context-menu', (event, params) => {
        const contextMenu = Menu.buildFromTemplate([
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' },
            ...params.linkURL ? [{
                label: 'Open Link in App',
                click: () => { mainWindow.loadURL(params.linkURL); }
            }, {
                label: 'Open Link in Browser',
                click: () => { shell.openExternal(params.linkURL); }
            }] : []
        ]);
        contextMenu.popup(mainWindow);
    });

    // Check for updates on startup
    checkForUpdate();
}

// Find a menu item by matching the URL in any submenu
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

// Recursively build menu items from configuration data
function buildMenuItems(items) {
    return items.map(item => {
        const menuItem = { label: item.label };
        if (item.url) {
            menuItem.click = () => {
                // Use openInBrowser flag to determine how to open the URL.
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

// Generate the application menu template
function getMenuTemplate() {
    // Build dynamic menus from configuration categories
    const dynamicMenuItems = Object.keys(config.menus)
        .map(category => ({
            label: capitalizeFirstLetter(category),
            submenu: buildMenuItems(config.menus[category])
        }));

    // Options menu (added a toggle for opening links internally or externally)
    const optionsMenu = {
        label: 'Options',
        submenu: [
            { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.webContents.reload() },
            {
                label: 'Reset',
                click: () => {
                    mainWindow.loadURL(localIndexHtml).catch(err => console.error('Failed to load index.html:', err))
                    mainWindow.webContents.setZoomFactor(1.0);
                }
            },
            { type: 'separator' },
            {
                label: 'Copy Current Page Link',
                accelerator: 'CmdOrCtrl+Shift+C',
                click: () => {
                    const currentUrl = mainWindow.webContents.getURL();
                    clipboard.writeText(currentUrl);
                    dialog.showMessageBox({
                        type: 'info',
                        buttons: ['OK'],
                        title: 'Link Copied',
                        message: `Current page link copied to clipboard:\n${currentUrl}`
                    });
                }
            },
            {
                label: 'Open Current Page in Browser',
                accelerator: 'CmdOrCtrl+Shift+B',
                click: () => {
                    const currentUrl = mainWindow.webContents.getURL();
                    if (currentUrl && !currentUrl.startsWith('file://')) {
                        shell.openExternal(currentUrl);
                    } else {
                        dialog.showMessageBox({
                            type: 'warning',
                            buttons: ['OK'],
                            title: 'Cannot Open in Browser',
                            message: 'This page cannot be opened in an external browser (local file or invalid URL).'
                        });
                    }
                }
            },
            {
                label: 'Zoom In',
                click: () => {
                    const currentZoom = mainWindow.webContents.getZoomFactor();
                    mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
                }
            },
            {
                label: 'Zoom Out',
                click: () => {
                    const currentZoom = mainWindow.webContents.getZoomFactor();
                    mainWindow.webContents.setZoomFactor(Math.max(currentZoom - 0.1, 0.5));
                }
            },
            { type: 'separator' },
            { label: 'Check for Updates', click: () => checkForUpdate(true) },
            { type: 'separator' },
            { label: 'Open Dev Tools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow.webContents.openDevTools() },
            { type: 'separator' },
            {
                label: 'About', click: () => {
                    dialog.showMessageBox({
                        type: 'info',
                        buttons: ['OK'],
                        title: 'About',
                        message: `AI Gateway v${packageData.version}\nEmail: admin@aftc.uk`
                    });
                }
            },
            { role: 'quit' }
        ]
    };

    return [...dynamicMenuItems, optionsMenu];
}

// Helper function to capitalize the first letter of a string
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