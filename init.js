const fs = require('fs');
const path = require('path');
const configPath = './config.json';
const distPath = './dist';


removeDistFolder(distPath);


function initJsonFile() {
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) throw err;
        const config = JSON.parse(data);
        config.lastURL = "";
        config.openLinksInBrowser = true;
        fs.writeFile(configPath, JSON.stringify(config, null, 4), (err) => {
            if (err) throw err;
            //console.log("Config updated successfully.");
        });
    });
}




function removeDistFolder(directory) {
    if (fs.existsSync(directory)) {
        fs.readdirSync(directory).forEach((file) => {
            const curPath = path.join(directory, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                removeDistFolder(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(directory);
    }
}