const fs = require('node:fs');
const path = require('node:path');

// Defaults live in the repo. On the Pi, SLIDESHOW_CONFIG_DIR points at the boot partition
// (/boot/firmware/slideshow) so settings and credentials can be edited from any computer.
const DEFAULTS_PATH = path.join(__dirname, 'data', 'config.json');
const CONFIG_DIR = process.env.SLIDESHOW_CONFIG_DIR || path.join(__dirname, 'data');
const CACHE_DIR = process.env.SLIDESHOW_CACHE_DIR || path.join(__dirname, 'cache');

function read_json(file_path) {
    // Strip the BOM that Windows Notepad likes to add
    const text = fs.readFileSync(file_path, 'utf8').replace(/^﻿/, '');
    return JSON.parse(text);
}

function load_config() {
    const config = read_json(DEFAULTS_PATH);
    const override_path = path.join(CONFIG_DIR, 'config.json');

    if (path.resolve(override_path) !== path.resolve(DEFAULTS_PATH) && fs.existsSync(override_path)) {
        try {
            Object.assign(config, read_json(override_path));
            console.info(`Loaded config overrides from ${override_path}`);
        } catch (err) {
            console.error(`Ignoring invalid config file ${override_path}: ${err.message}`);
        }
    }

    // --local-images=<folder> shows photos from a folder instead of Google Drive (for testing)
    const local_arg = process.argv.find(arg => arg.startsWith('--local-images='));
    if (local_arg) {
        config.local_images_dir = path.resolve(local_arg.split('=')[1]);
        console.info(`Using local images from ${config.local_images_dir}`);
    }

    config.config_dir = CONFIG_DIR;
    // Separate cache so switching between local and Drive images doesn't wipe the other
    config.cache_dir = local_arg ? `${CACHE_DIR}-local` : CACHE_DIR;
    config.credentials_path = path.join(CONFIG_DIR, 'credentials.json');
    return config;
}

module.exports = load_config();
