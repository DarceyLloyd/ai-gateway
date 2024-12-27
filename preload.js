const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Trigger the search functionality
    triggerSearch: () => ipcRenderer.on('trigger-search', () => {
        const searchTerm = prompt('Enter search term:'); // Ask user for input
        if (searchTerm) {
            ipcRenderer.send('find-in-page', searchTerm); // Send search term to main process
        }
    }),

    // Stop the search functionality
    stopSearch: () => ipcRenderer.send('stop-find-in-page'),
});
