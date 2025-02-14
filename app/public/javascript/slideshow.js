// setInterval(() => {location.reload();}, 4 * 60 * 60 * 1000); // Reload every six hours

var next_img = 0;

// Gets next image in slideshow
fetch(`${document.URL}config`).then(async (res) => {
    const config = await res.json();
    setInterval(set_image, config.slideshow_duration);
    set_image();
}).catch((reason) => {
    console.error(reason);
    console.error("Failed to fetch config for slideshow!")
});

async function set_image() {
    next_img = (next_img + 1) % 2;
    var top_image_element = document.getElementById(`slideshow-image-0`);
    var bottom_image_element = document.getElementById(`slideshow-image-1`);
    var timestamp = new Date().getTime()

    if (next_img === 0)
    {
        top_image_element.src = `${document.URL}image?${timestamp}`;
        top_image_element.onload = () => {
            top_image_element.classList.remove("fade-out");
            top_image_element.classList.add("fade-in");
        };
    }
    else 
    {
        bottom_image_element.src = `${document.URL}image?${timestamp}`;
        bottom_image_element.onload = () => {
            top_image_element.classList.remove("fade-in");
            top_image_element.classList.add("fade-out");
        };
    }

    // var new_image_res = await fetch(`${document.URL}image`).catch((error) => {
    //     console.error(error);
    //     console.error("Failed to retieve image!");
    // });
    // var new_image = await new_image_res.blob();

    // if (next_img === 0) { // Top image is invisible
    //     console.log("updating top");
    //     top_image_element.src = URL.createObjectURL(new_image);
    //     await new Promise(r => setTimeout(r, 1000));
    //     top_image_element.classList.remove("fade-out");
    //     top_image_element.classList.add("fade-in");
    // } else { // Top image is visible
    //     console.log("updating bottom");
    //     bottom_image_element.src = URL.createObjectURL(new_image);
    //     await new Promise(r => setTimeout(r, 1000));
    //     top_image_element.classList.remove("fade-in");
    //     top_image_element.classList.add("fade-out");
    // }
    // URL.revokeObjectURL(new_image);
};