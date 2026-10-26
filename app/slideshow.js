const google_drive = require('@googleapis/drive');
const sharp = require('sharp');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MANIFEST = 'manifest.json';

// Long-running process on a Pi: don't let libvips hold on to decoded images
sharp.cache(false);

let config = null;
let drive = null;
let images = [];            // cached file names, in display order
let failed = new Set();     // cache names that could not be converted (don't retry every sync)
let syncing = false;
let last_sync = null;

function init(app_config) {
    config = app_config;
    fs.mkdirSync(config.cache_dir, { recursive: true });
    images = load_manifest();
    console.info(`Loaded ${images.length} cached images`);
}

function get_drive() {
    if (!drive) {
        const auth = new google_drive.auth.GoogleAuth({
            keyFile: config.credentials_path,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        drive = google_drive.drive({ version: 'v3', auth });
    }
    return drive;
}

async function list_drive_images() {
    const files = [];
    let page_token;
    do {
        const response = await get_drive().files.list({
            q: 'trashed = false',
            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, md5Checksum)',
            pageSize: 1000,
            pageToken: page_token,
        });
        files.push(...(response.data.files ?? []));
        page_token = response.data.nextPageToken;
    } while (page_token);

    return files
        .filter(file => SUPPORTED_TYPES.includes(file.mimeType))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

// The name changes whenever the file or the render settings change, so cached files can be
// served with long-lived cache headers.
function cache_name(file) {
    const hash = crypto.createHash('sha1')
        .update([file.modifiedTime, file.md5Checksum, config.image_width, config.image_height, config.image_quality].join('|'))
        .digest('hex')
        .slice(0, 12);
    return `${file.id}-${hash}.webp`;
}

async function download_and_convert(file, name) {
    const response = await get_drive().files.get(
        { fileId: file.id, alt: 'media' },
        { responseType: 'arraybuffer' }
    );

    // Download errors are retried next sync; conversion errors are remembered
    try {
        const animated = file.mimeType === 'image/gif';
        let image = sharp(Buffer.from(response.data), { animated });
        if (!animated) image = image.rotate(); // respect EXIF orientation from phones

        const tmp_path = path.join(config.cache_dir, `${name}.tmp`);
        await image
            .resize(config.image_width, config.image_height, { fit: 'cover', withoutEnlargement: true })
            .webp({ quality: config.image_quality })
            .toFile(tmp_path);
        fs.renameSync(tmp_path, path.join(config.cache_dir, name));
    } catch (err) {
        failed.add(name);
        throw err;
    }
}

async function sync_images() {
    if (syncing) return;
    syncing = true;
    try {
        const files = await list_drive_images();
        const names = [];
        for (const file of files) {
            const name = cache_name(file);
            const cached = fs.existsSync(path.join(config.cache_dir, name));
            if (!cached && !failed.has(name)) {
                try {
                    await download_and_convert(file, name);
                    console.info(`Cached ${file.name}`);
                } catch (err) {
                    console.error(`Skipping ${file.name}: ${err.message}`);
                    continue;
                }
            } else if (!cached) {
                continue;
            }
            names.push(name);
            // On a fresh install, start showing images while the rest download
            if (images.length === 0) images = [...names];
        }

        if (names.join() !== images.join()) {
            images = names;
            save_manifest();
            console.info(`Slideshow now has ${images.length} images`);
        }
        remove_unused(names);
        last_sync = new Date();
    } catch (err) {
        console.error(`Image sync failed: ${err.message}`);
    } finally {
        syncing = false;
    }
}

function load_manifest() {
    try {
        const names = JSON.parse(fs.readFileSync(path.join(config.cache_dir, MANIFEST), 'utf8'));
        return names.filter(name => fs.existsSync(path.join(config.cache_dir, name)));
    } catch {
        return [];
    }
}

function save_manifest() {
    const manifest_path = path.join(config.cache_dir, MANIFEST);
    fs.writeFileSync(`${manifest_path}.tmp`, JSON.stringify(images));
    fs.renameSync(`${manifest_path}.tmp`, manifest_path);
}

function remove_unused(keep) {
    const keep_set = new Set([...keep, MANIFEST]);
    for (const name of fs.readdirSync(config.cache_dir)) {
        if (!keep_set.has(name)) fs.rmSync(path.join(config.cache_dir, name), { force: true });
    }
}

function start() {
    sync_images().finally(() => setInterval(sync_images, config.drive_sync_interval));
}

module.exports = {
    init,
    start,
    get_images: () => images,
    get_last_sync: () => last_sync,
};
