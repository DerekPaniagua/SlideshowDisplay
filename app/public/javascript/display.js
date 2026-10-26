const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

function startClock() {
    const time = document.getElementById('clock-time');
    const date = document.getElementById('clock-date');

    function update() {
        const now = new Date();
        const timeText = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const dateText = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        // Only touch the DOM when the text changes to avoid needless repaints
        if (time.textContent !== timeText) time.textContent = timeText;
        if (date.textContent !== dateText) date.textContent = dateText;
    }

    update();
    setInterval(update, 1000);
}

// Reload the page when the server is updated, and periodically to stay fresh,
// but only after confirming the server is up so we never land on an error page.
async function watchServer(config) {
    let version = null;
    const loadedAt = Date.now();

    while (true) {
        await sleep(30 * 1000);
        try {
            const health = await fetchJson('/health');
            version ??= health.version;
            const stale = config.page_reload_interval > 0 && Date.now() - loadedAt > config.page_reload_interval;
            if (health.version !== version || stale) {
                location.reload();
                return;
            }
        } catch (err) {
            console.warn('Server health check failed:', err);
        }
    }
}

(async function boot() {
    startClock();

    let config;
    while (!config) {
        try {
            config = await fetchJson('/api/config');
        } catch (err) {
            console.warn('Failed to fetch config, retrying...', err);
            await sleep(5000);
        }
    }

    startCalendar(config);
    startSlideshow(config);
    watchServer(config);
})();
