const express = require('express');
const path = require('node:path');
const { execSync } = require('node:child_process');
const config = require('./config');
const calendar = require('./calendar');
const slideshow = require('./slideshow');

console.info("Starting up server...");

// Crash loudly so systemd restarts us, instead of limping along in a bad state
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception, exiting:', err);
    process.exit(1);
});
process.on('unhandledRejection', (err) => {
    console.error('Unhandled promise rejection:', err);
});

// Changes on every deploy/restart; the page reloads itself when it sees a new version
const VERSION = `${get_commit()}-${Date.now().toString(36)}`;

calendar.init(config);
slideshow.init(config);
slideshow.start();


// Web Server
const app = express();

// Pages and scripts revalidate on every load so updates show up right away
app.use(express.static(`${__dirname}/public`, {
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
}));
// Cached image names change when their content does, so they can be cached forever
app.use('/images', express.static(config.cache_dir, { immutable: true, maxAge: '365d' }));
// Served locally so the page works even if the internet is down
app.use('/vendor/fullcalendar', express.static(path.join(__dirname, '..', 'node_modules', 'fullcalendar'), { maxAge: '1d' }));

app.listen(config.port, (err) => {
    if (err) throw err;
    console.info(`Application Listening on port ${config.port}`);
});

// Endpoints
app.get("/", (req, res) => {
    res.sendFile(`${__dirname}/html/index.html`, { headers: { 'Cache-Control': 'no-cache' } });
});

app.get("/graphs", (req, res) => {
    res.sendFile(`${__dirname}/html/graphs.html`);
});

app.get("/health", (req, res) => {
    res.set('Cache-Control', 'no-store').json({
        ok: true,
        version: VERSION,
        uptime_seconds: Math.round(process.uptime()),
        images: slideshow.get_images().length,
        last_image_sync: slideshow.get_last_sync(),
        last_calendar_sync: calendar.get_last_sync(),
    });
});

app.get("/api/config", (req, res) => {
    res.set('Cache-Control', 'no-store').json({
        slideshow_duration: config.slideshow_duration,
        transition_duration: config.transition_duration,
        image_list_refresh: config.drive_sync_interval,
        calendar_update_duration: config.calendar_update_duration,
        day_start: config.day_start,
        day_end: config.day_end,
        hidden_days: config.hidden_days,
        page_reload_interval: config.page_reload_interval,
    });
});

app.get("/api/images", (req, res) => {
    res.set('Cache-Control', 'no-store').json({
        images: slideshow.get_images().map(name => `/images/${name}`),
    });
});

app.get("/api/calendar", async (req, res) => {
    const start = parse_date(req.query.start) ?? start_of_week();
    const end = parse_date(req.query.end) ?? new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    try {
        const events = await calendar.get_events(start, end);
        res.set('Cache-Control', 'no-store').json(events);
    } catch (err) {
        console.error(`Failed to retrieve calendar events: ${err.message}`);
        res.status(502).json({ message: err.message });
    }
});


// Helper Functions
function parse_date(value) {
    if (typeof value !== 'string') return null;
    const date = new Date(value);
    return isNaN(date) ? null : date;
}

function start_of_week() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay());
    return date;
}

function get_commit() {
    try {
        return execSync('git rev-parse --short HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
        return 'dev';
    }
}
