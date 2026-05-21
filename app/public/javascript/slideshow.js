// Reload every hour to stay fresh
setInterval(() => { location.reload(); }, 1 * 60 * 60 * 1000);

const img0 = document.getElementById('slideshow-image-0');
const img1 = document.getElementById('slideshow-image-1');
const images = [img0, img1];

let visibleIdx = 0; // which image element is currently on top/visible

async function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // decode() ensures the browser has rasterized it before we swap
            img.decode ? img.decode().then(resolve).catch(resolve) : resolve();
        };
        img.onerror = reject;
        img.src = url;
    });
}

async function set_image() {
    const timestamp = Date.now();
    const url = `${document.URL}image?${timestamp}`;

    // Index of the hidden (background) element
    const hiddenIdx = (visibleIdx + 1) % 2;
    const hiddenEl = images[hiddenIdx];
    const visibleEl = images[visibleIdx];

    try {
        // Pre-load and decode the image fully before touching the DOM
        await preloadImage(url);

        // Set src on the hidden element (already decoded, paints instantly)
        hiddenEl.src = url;

        // Wait one frame so the browser has committed the src
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        // Brief pause before starting transition
        await new Promise(r => setTimeout(r, 50));

        if (hiddenIdx === 0) {
            // Bringing img0 to front
            hiddenEl.classList.remove('fade-out');
            hiddenEl.classList.add('fade-in');
        } else {
            // Sending img0 to back (img1 is underneath)
            visibleEl.classList.remove('fade-in');
            visibleEl.classList.add('fade-out');
        }

        visibleIdx = hiddenIdx;
    } catch (err) {
        console.error('Failed to load image:', err);
        // Skip this cycle — don't update visibleIdx, try again next interval
    }
}

fetch(`${document.URL}config`).then(async (res) => {
    const config = await res.json();
    set_image(); // first image immediately
    setInterval(set_image, config.slideshow_duration);
}).catch((err) => {
    console.error('Failed to fetch config for slideshow!', err);
});