function startSlideshow(config) {
    const slides = [document.getElementById('slide-0'), document.getElementById('slide-1')];
    let front = 0;      // index of the slide element currently showing
    let images = [];    // image urls from the server
    let next = 0;       // index into images of the next image to show
    let loading = false;

    document.documentElement.style.setProperty('--fade', `${config.transition_duration}ms`);

    async function refreshImageList() {
        try {
            const response = await fetch('/api/images');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.images.join() !== images.join()) {
                images = data.images;
                if (next >= images.length) next = 0;
            }
        } catch (err) {
            console.warn('Failed to refresh image list:', err);
        }
    }

    async function showNext() {
        // Skip this tick if the previous image is still loading (slow decode, busy Pi)
        if (images.length === 0 || loading) return;
        const url = images[next];
        next = (next + 1) % images.length;

        const current = slides[front];
        const incoming = slides[1 - front];
        if (current.getAttribute('src') === url) return; // only one image

        loading = true;
        try {
            // Load and decode off-screen so the fade never stutters. Image urls are cached
            // forever, so setting the same url on the slide doesn't download it again.
            const loader = new Image();
            loader.src = url;
            await loader.decode();
            incoming.src = url;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        } catch (err) {
            console.warn('Failed to load image:', url, err);
            return;
        } finally {
            loading = false;
        }

        incoming.classList.remove('placeholder');
        incoming.classList.add('is-front', 'is-visible');
        current.classList.remove('is-front');
        front = 1 - front;

        // Hide the old slide once it's fully covered
        setTimeout(() => current.classList.remove('is-visible'), config.transition_duration + 100);
    }

    refreshImageList().then(showNext);
    setInterval(refreshImageList, config.image_list_refresh);
    setInterval(showNext, config.slideshow_duration);
}
