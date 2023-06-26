var next_img = 0;

// Gets next image in slideshow
fetch(`${document.URL}config`).then(async (res) => {
    const config = await res.json();
    await set_image();
    setInterval(set_image, config.slideshow_duration);
}).catch((reason) => {
    console.error(reason);
    console.error("Failed to fetch config for slideshow!")
});

async function set_image() {
    var top_image_element = document.getElementById(`slideshow-image-0`);
    var bottom_image_element = document.getElementById(`slideshow-image-1`);
    var new_image_res = await fetch(`${document.URL}image`);
    var new_image = await new_image_res.blob();

    if (next_img === 0) { // Top image is invisible
        console.log("updating top");
        top_image_element.src = URL.createObjectURL(new_image);
        await new Promise(r => setTimeout(r, 500));
        top_image_element.classList.remove("fade-out");
        top_image_element.classList.add("fade-in");
    } else { // Top image is visible
        console.log("updating bottom");
        bottom_image_element.src = URL.createObjectURL(new_image);
        await new Promise(r => setTimeout(r, 500));
        top_image_element.classList.remove("fade-in");
        top_image_element.classList.add("fade-out");
    }
    next_img = (next_img + 1) % 2;
};